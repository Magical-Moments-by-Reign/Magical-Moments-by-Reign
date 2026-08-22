// ── Magical Discovery — Sports service layer (SERVER ONLY) ────────
// The only place Sports pages talk to the provider/cache/DB. Live provider
// results are cached in the existing DiscoveryCache (category "sports") and
// then synced into SportsGame — our stable local copy that picks/votes
// reference — so a matchup keeps working even if a later provider refetch
// reshapes or briefly fails.

import { prisma } from "@/lib/db";
import { withCache, cacheKeyFor } from "../cache";
import { ApiSportsProvider, HighSchoolPendingProvider, MATCHUP_SPORTS, fetchLeagueLogo, fetchFirstPreseasonGame, fetchFirstRegularSeasonGame, fetchFirstPostseasonGame, fetchTeamRoster, fetchTeamsForLeague, rankTeamMatches, seasonParam, defaultLeagueId, type SportSlug, type SportsGameSummary, type SportsStanding, type SportsRosterPlayer } from "../providers/sports";
import { fetchNbaFirstGame, fetchGamesByDate as fetchSdioGamesByDate, fetchStandings as fetchSdioStandings, fetchAllPlayers, fetchInjuries, type SdioLeague, type SdioInjury } from "../providers/sportsdata";
import { resolveOfficialDate, type SourceAttempt } from "./officialSource";
import { resolveSdioTeamId, getSdioTeamDirectory } from "./team-identity";
import { gradeGamePicks, tallyVotes, isPickLocked, summarizePicks, startOfWeek, type VoteTally, type PicksSummary } from "./picks";
import { evaluateEarnedBadges, SPORTS_BADGES, type BadgeId } from "./badges";
import { dispatchNotification } from "@/lib/notify";

const TTL_GAMES_UPCOMING = 180; // 3h — schedules barely move
const TTL_GAMES_LIVE = 3; // 3m — live games refresh often
const TTL_GAME_DETAIL_LIVE = 1; // 1m — the shortest TTL withCache supports; a single game someone is actively watching
const TTL_STANDINGS = 720; // 12h
const TTL_LEAGUE_LOGO = 10080; // 1 week — league marks don't change
const TTL_ROSTER = 10080; // 1 week — a team's active roster barely moves day to day
const TTL_TEAM_LOOKUP = 10080; // 1 week — team identity/logo rarely changes

// Explore All Sports grid grouping — "pro" leagues, "college" sports, and
// "world" for broad international/other-sport categories that span many
// competitions rather than one league.
export type SportCategory = "pro" | "college" | "world";

export const SPORT_CATALOG: { slug: SportSlug; label: string; category: SportCategory }[] = [
  { slug: "nfl", label: "NFL", category: "pro" },
  { slug: "nba", label: "NBA", category: "pro" },
  { slug: "wnba", label: "WNBA", category: "pro" },
  { slug: "mlb", label: "MLB", category: "pro" },
  { slug: "nhl", label: "NHL", category: "pro" },
  { slug: "f1", label: "Formula 1", category: "pro" },
  { slug: "ncaaf", label: "College Football", category: "college" },
  { slug: "ncaab", label: "College Basketball", category: "college" },
  { slug: "soccer", label: "Soccer", category: "world" },
  { slug: "mma", label: "MMA", category: "world" },
  { slug: "rugby", label: "Rugby", category: "world" },
  { slug: "volleyball", label: "Volleyball", category: "world" },
];

function sportLabel(sport: SportSlug): string {
  return SPORT_CATALOG.find((s) => s.slug === sport)?.label ?? sport;
}

// Magical Sports Data Policy, tier 2: which of our SportsDataIO sports map
// to which of our SportSlugs — null for every sport with no SportsDataIO
// product connected, so getGamesByDate/getStandings/getTeamRoster below
// only ever attempt the fallback where it's real. "ncaaf" is our slug for
// college football; SportsDataIO calls the same league "cfb".
export function sdioLeagueFor(sport: SportSlug): SdioLeague | null {
  switch (sport) {
    case "nfl": return "nfl";
    case "ncaaf": return "cfb";
    case "nba": return "nba";
    case "wnba": return "wnba";
    default: return null;
  }
}

/** The inverse of sdioLeagueFor — our SportSlug for a given SportsDataIO
 *  league, for callers that only have the SportsDataIO side (e.g. a Player
 *  Profile route keyed by SdioLeague) and need it to resolve a real
 *  API-Sports team/logo via resolveTeamByName. */
export function sportSlugForSdio(league: SdioLeague): SportSlug {
  switch (league) {
    case "cfb": return "ncaaf";
    default: return league;
  }
}

// SportsDataIO's own season-year convention for its football/basketball
// products: the numeric year a fall-starting season began in (so a January
// 2026 NFL/CFB/NBA game is still part of "2025"), confirmed already for NBA
// via this project's own hero-countdown/standings fallback. WNBA plays a
// single-calendar-year season (May-Oct), so it needs no August boundary.
function sdioSeasonYear(league: SdioLeague): number {
  const now = new Date();
  if (league === "wnba") return now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

// ── Follows (favorite sports / leagues / teams) ────────────────────

export async function getFollows(accountId: string) {
  return prisma.sportsFollow.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } });
}

export async function followSport(accountId: string, sport: SportSlug) {
  const existing = await prisma.sportsFollow.findFirst({ where: { accountId, kind: "sport", sport } });
  if (existing) return existing;
  return prisma.sportsFollow.create({ data: { accountId, kind: "sport", sport } });
}

export async function followTeam(accountId: string, sport: SportSlug, league: string, teamExternalId: string, teamName: string, teamLogoUrl?: string) {
  const existing = await prisma.sportsFollow.findFirst({ where: { accountId, kind: "team", sport, teamExternalId } });
  if (existing) return existing;
  return prisma.sportsFollow.create({ data: { accountId, kind: "team", sport, league, teamExternalId, teamName, teamLogoUrl } });
}

export async function unfollow(accountId: string, followId: string) {
  await prisma.sportsFollow.deleteMany({ where: { id: followId, accountId } });
}

// ── Games: fetch (cached) → sync to local SportsGame → return local rows ──

async function syncGamesToLocal(sport: SportSlug, league: string, games: SportsGameSummary[]) {
  const rows = await Promise.all(
    games.map((g) =>
      prisma.sportsGame.upsert({
        where: { sport_externalId: { sport, externalId: g.externalId } },
        create: {
          sport, league, externalId: g.externalId,
          homeTeamId: g.homeTeam.id || null, homeTeamName: g.homeTeam.name, homeTeamLogoUrl: g.homeTeam.logoUrl,
          awayTeamId: g.awayTeam.id || null, awayTeamName: g.awayTeam.name, awayTeamLogoUrl: g.awayTeam.logoUrl,
          startsAt: new Date(g.startsAt), status: g.status, period: g.period,
          homeScore: g.homeScore, awayScore: g.awayScore, source: "provider", lastSyncedAt: new Date(),
        },
        update: {
          status: g.status, period: g.period, homeScore: g.homeScore, awayScore: g.awayScore, lastSyncedAt: new Date(),
        },
      }).catch(() => null)
    )
  );
  const synced = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  // Grade any game the provider now reports final — automatic once a real
  // provider is connected; gradeGameAction remains available for an
  // Owner-entered game or a provider outage.
  await Promise.all(synced.filter((r) => r.status === "final").map((r) => gradeGame(r.id)));
  return synced;
}

type SportsGameRow = Awaited<ReturnType<typeof prisma.sportsGame.findMany>>[number];

function localGamesForDate(sport: SportSlug, dateISO: string) {
  return prisma.sportsGame.findMany({
    where: { sport, startsAt: { gte: new Date(dateISO), lt: new Date(new Date(dateISO).getTime() + 86_400_000) } },
    orderBy: { startsAt: "asc" },
  });
}

/** Games for a sport on a given date (YYYY-MM-DD). Upcoming schedules cache
 *  for hours; anything already live/today refreshes every few minutes so
 *  scores stay current without hammering the provider on every page view.
 *  `planRestricted` is set only when the provider itself reported a
 *  plan/subscription restriction for this date — a genuine "no games" result
 *  never sets it. Either way, any local (owner-entered or previously synced)
 *  games for the date are still returned rather than hidden.
 *
 *  A plan-restricted response is NEVER written to DiscoveryCache (see the
 *  `restriction` capture below — we hand withCache a `null` for it, its own
 *  documented "don't cache an outage" case) — a restriction can flip to a
 *  real result the moment a plan is upgraded, and a cached "restricted" row
 *  would otherwise keep reporting it for the rest of the TTL (up to 3h)
 *  regardless of the account's actual current plan. */
export async function getGamesByDate(sport: SportSlug, dateISO: string, league?: string): Promise<{ games: SportsGameRow[]; planRestricted?: string }> {
  const isToday = dateISO === new Date().toISOString().slice(0, 10);
  const ttl = isToday ? TTL_GAMES_LIVE : TTL_GAMES_UPCOMING;
  let restriction: string | undefined;
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, dateISO, league }), ttl, async () => {
    const result = await ApiSportsProvider.gamesByDate(sport, dateISO, league);
    if (result?.planRestricted) {
      restriction = result.planRestricted;
      return null;
    }
    return result;
  });
  if (cached?.data.games.length) {
    const synced = await syncGamesToLocal(sport, league || cached.data.games[0]?.league || "", cached.data.games);
    return { games: synced };
  }

  // Tier 2: SportsDataIO, when API-Sports had nothing for this date —
  // empty, unconfigured, or plan-restricted. Only for sports with a
  // SportsDataIO product connected (see sdioLeagueFor).
  if (sdioLeagueFor(sport)) {
    const secondary = await getGamesByDateFromSportsData(sport, dateISO);
    if (secondary.length) {
      const synced = await syncGamesToLocal(sport, league || defaultLeagueId(sport), secondary);
      return { games: synced };
    }
  }

  // Neither tier had anything — still surface anything already synced
  // locally (e.g. an Owner-entered game) rather than an empty page.
  return { games: await localGamesForDate(sport, dateISO), planRestricted: restriction };
}

/** The real league logo API-Sports serves for each supported sport's default
 *  league, one per sport, cached for a week. Sports with no real logo
 *  returned (or no leagues-endpoint id at all, like MMA/F1) are simply
 *  absent from the result — callers fall back to a plain typographic
 *  treatment, never an invented mark. */
export async function getLeagueLogos(): Promise<Partial<Record<SportSlug, string>>> {
  const entries = await Promise.all(
    SPORT_CATALOG.map(async ({ slug }) => {
      const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport: slug, kind: "league_logo" }), TTL_LEAGUE_LOGO, () => fetchLeagueLogo(slug));
      return [slug, cached?.data ?? null] as const;
    })
  );
  return Object.fromEntries(entries.filter((e): e is [SportSlug, string] => Boolean(e[1])));
}

/** The real first preseason game of the current season, straight from
 *  API-Sports' own stage label — null when the provider doesn't distinguish
 *  a preseason stage for this sport, or has no preseason games in its
 *  response. Never a guessed date. */
export async function getFirstPreseasonGame(sport: SportSlug): Promise<SportsGameSummary | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, kind: "first_preseason" }), TTL_GAMES_UPCOMING, () =>
    fetchFirstPreseasonGame(sport, season));
  return cached?.data ?? null;
}

/** The real regular-season opener — for a live "N days until kickoff"
 *  countdown. Same real-stage-label sourcing as getFirstPreseasonGame,
 *  never a computed/assumed date. */
export async function getFirstRegularSeasonGame(sport: SportSlug): Promise<SportsGameSummary | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, kind: "first_regular_season" }), TTL_GAMES_UPCOMING, () =>
    fetchFirstRegularSeasonGame(sport, season));
  return cached?.data ?? null;
}

/** The real postseason/playoff opener — same real-stage-label sourcing as
 *  getFirstPreseasonGame/getFirstRegularSeasonGame, never a computed/assumed
 *  date. Null once the provider hasn't posted a postseason bracket yet (the
 *  normal case for most of the regular season). */
export async function getFirstPostseasonGame(sport: SportSlug): Promise<SportsGameSummary | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, kind: "first_postseason" }), TTL_GAMES_UPCOMING, () =>
    fetchFirstPostseasonGame(sport, season));
  return cached?.data ?? null;
}

export interface NbaHeroState {
  phase: "preseason" | "regular";
  /** A real matchup once a provider has one — null while only the known
   *  league-wide date is available. */
  game: SportsGameSummary | null;
  targetISO: string;
  source: "api-sports" | "sportsdata" | "known-fact";
  /** True only for the known-fact tier: targetISO is a bare "YYYY-MM-DD"
   *  calendar date with no real time attached — callers must not display
   *  or count down to a fabricated time-of-day for it. */
  dateOnly: boolean;
  /** Full source-priority trail for this resolution — admin diagnostics
   *  only, never shown to members. See officialSource.ts. */
  sourceLog: SourceAttempt[];
}

function normalizeTeamName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Resolves a team name from a secondary source (SportsDataIO's schedule
 *  doesn't return logos) to its real API-Sports team record — so a game
 *  sourced from that secondary provider still gets the real logo/id we
 *  already have from the primary one, instead of a placeholder icon.
 *  Cached per sport+team name (team identity/logo rarely changes), so this
 *  is only a live lookup the first time a given team name is seen for that
 *  sport. Returns null when API-Sports has no confident match — never a
 *  guessed logo. */
export async function resolveTeamByName(sport: SportSlug, name: string): Promise<{ id: string; logoUrl?: string } | null> {
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, teamNameLookup: normalizeTeamName(name) }), TTL_TEAM_LOOKUP, () =>
    ApiSportsProvider.searchTeams(sport, name));
  const candidates = cached?.data;
  if (!candidates?.length) return null;
  const target = normalizeTeamName(name);
  const match = candidates.find((t) => normalizeTeamName(t.name) === target) ?? candidates[0];
  return { id: match.id, logoUrl: match.logoUrl };
}

// SportsDataIO's own status strings for NBA (Scheduled/InProgress/Final/
// F/OT/Postponed/Canceled, per its docs) — mapped conservatively to our
// three-state model; anything not clearly finished or live is treated as
// scheduled rather than guessed.
function sdioStatusToGameStatus(status: string | undefined): "scheduled" | "live" | "final" {
  const s = (status || "").toLowerCase();
  if (s.includes("final")) return "final";
  if (s.includes("progress") || s === "live") return "live";
  return "scheduled";
}

/** Real games for one date from SportsDataIO, for any sport with a
 *  SportsDataIO product connected (see sdioLeagueFor) — secondary source
 *  for Today's Games when API-Sports has nothing for that date. Each team
 *  is resolved to its real API-Sports logo the same way the hero countdown
 *  does. Returns [] on missing config, an unsupported sport, a failed
 *  call, or a genuinely empty schedule for that date. */
async function getGamesByDateFromSportsData(sport: SportSlug, dateISO: string): Promise<SportsGameSummary[]> {
  const league = sdioLeagueFor(sport);
  if (!league) return [];
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ sport, dateISO, kind: "games_by_date" }), TTL_GAMES_UPCOMING, () =>
    fetchSdioGamesByDate(league, dateISO));
  const games = cached?.data ?? [];
  if (!games.length) return [];
  const defaultLeague = defaultLeagueId(sport);
  return Promise.all(games.map(async (g): Promise<SportsGameSummary> => {
    const [home, away] = await Promise.all([resolveTeamByName(sport, g.homeTeam), resolveTeamByName(sport, g.awayTeam)]);
    return {
      externalId: g.externalId,
      sport,
      league: defaultLeague,
      homeTeam: { id: home?.id ?? "", name: g.homeTeam, logoUrl: home?.logoUrl },
      awayTeam: { id: away?.id ?? "", name: g.awayTeam, logoUrl: away?.logoUrl },
      startsAt: g.startsAt,
      status: sdioStatusToGameStatus(g.status),
    };
  }));
}

/** Real standings from SportsDataIO for any sport with a SportsDataIO
 *  product connected — secondary source when API-Sports has nothing for
 *  the season yet. Each team is resolved to its real API-Sports id/logo
 *  the same way the other fallbacks do. Returns [] on missing config, an
 *  unsupported sport, a failed call, or no usable rows. */
async function getStandingsFromSportsData(sport: SportSlug, season?: string): Promise<{ standings: SportsStanding[]; season: string }> {
  const league = sdioLeagueFor(sport);
  const empty = { standings: [], season: season ?? "" };
  if (!league) return empty;
  const parsed = season ? parseInt(season.slice(0, 4), 10) : NaN;
  const year = Number.isFinite(parsed) ? parsed : sdioSeasonYear(league);
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ sport, year, kind: "standings" }), TTL_STANDINGS, () =>
    fetchSdioStandings(league, year));
  const rows = cached?.data ?? [];
  if (!rows.length) return { standings: [], season: String(year) };
  const standings = await Promise.all(rows.map(async (r): Promise<SportsStanding> => {
    const team = await resolveTeamByName(sport, r.team);
    return { team: { id: team?.id ?? "", name: r.team, logoUrl: team?.logoUrl }, wins: r.wins, losses: r.losses };
  }));
  return { standings, season: String(year) };
}

/** Real roster players from SportsDataIO for any sport with a SportsDataIO
 *  product connected — secondary source when API-Sports has nothing for a
 *  team. Matched by real TeamID via the cross-provider Team Identity
 *  Resolver (resolveSdioTeamId) — never by comparing a full franchise name
 *  string ("Boston Celtics") against the short team code SportsDataIO's
 *  player rows actually carry ("BOS"), which never matches and is exactly
 *  why this fallback used to come back empty even when the provider had
 *  the real roster. Returns [] when the team can't be resolved to a real
 *  TeamID or nothing matches — never a guessed roster. */
async function getRosterFromSportsData(sport: SportSlug, teamName: string): Promise<SportsRosterPlayer[]> {
  const league = sdioLeagueFor(sport);
  if (!league) return [];
  const [directory, cached] = await Promise.all([
    getSdioTeamDirectory(league),
    withCache("sports", "sportsdataio", cacheKeyFor({ sport, kind: "all_players" }), TTL_ROSTER, () => fetchAllPlayers(league)),
  ]);
  const players = cached?.data ?? [];
  if (!players.length) return [];
  const target = normalizeTeamName(teamName);
  const identity = directory.find((t) => normalizeTeamName(t.fullName) === target) ?? directory.find((t) => t.key && normalizeTeamName(t.key) === target);
  const toRosterPlayer = (p: (typeof players)[number]): SportsRosterPlayer => ({ id: p.playerId, name: p.name, position: p.position, number: p.number, photoUrl: p.photoUrl });
  if (identity) {
    const byId = players.filter((p) => p.teamId === identity.teamId);
    if (byId.length) return byId.map(toRosterPlayer);
    // Verified secondary resolver: the real team code this identity
    // resolved to, matched against the player row's own team code — never
    // a raw comparison of the full franchise name against a code.
    if (identity.key) {
      const byKey = players.filter((p) => p.team && p.team.toUpperCase() === identity.key!.toUpperCase());
      if (byKey.length) return byKey.map(toRosterPlayer);
    }
  }
  return [];
}

async function getNbaOpener(kind: "preseason" | "regular"): Promise<{ game: SportsGameSummary | null; fallbackISO: string | null; source: "api-sports" | "sportsdata" | "known-fact"; log: SourceAttempt[] }> {
  const log: SourceAttempt[] = [];
  const apiSportsGame = kind === "preseason" ? await getFirstPreseasonGame("nba") : await getFirstRegularSeasonGame("nba");
  log.push({ tier: "api-sports", outcome: apiSportsGame ? "hit" : "empty" });
  if (apiSportsGame) return { game: apiSportsGame, fallbackISO: null, source: "api-sports", log };

  const now = new Date();
  const startYear = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1; // same August season-start boundary as seasonParam()
  const seasonKey = kind === "preseason" ? `${startYear}PRE` : `${startYear}`;
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ sport: "nba", seasonKey, kind: "hero_opener" }), TTL_GAMES_UPCOMING, () =>
    fetchNbaFirstGame(seasonKey));
  const sdio = cached?.data;
  log.push({ tier: "sportsdata", outcome: sdio ? "hit" : "empty" });
  if (sdio) {
    // SportsDataIO's schedule doesn't carry team logos — resolve each side
    // against our own API-Sports team catalog so the game still shows real
    // crests, not placeholders, even though the schedule itself came from
    // the secondary provider.
    const [home, away] = await Promise.all([resolveTeamByName("nba", sdio.homeTeam), resolveTeamByName("nba", sdio.awayTeam)]);
    const game: SportsGameSummary = {
      externalId: sdio.externalId,
      sport: "nba",
      league: "12",
      homeTeam: { id: home?.id ?? "", name: sdio.homeTeam, logoUrl: home?.logoUrl },
      awayTeam: { id: away?.id ?? "", name: sdio.awayTeam, logoUrl: away?.logoUrl },
      startsAt: sdio.startsAt,
      status: "scheduled",
    };
    return { game, fallbackISO: null, source: "sportsdata", log };
  }

  const factKind = kind === "preseason" ? "preseason_opener_date" : "regular_season_opener_date";
  const dateOnly = await resolveOfficialDate("nba", factKind, log);
  return { game: null, fallbackISO: dateOnly, source: "known-fact", log };
}

/** NBA hero state with the full Magical Sports source-priority fallback:
 *  (1) API-Sports, (2) SportsDataIO, (3) a verified official feed, (4) a
 *  manually confirmed officially-announced date (never a fabricated
 *  matchup) — so the hero can show a real countdown even on a day no live
 *  provider has posted the season yet. Whichever tier resolves the
 *  preseason opener also decides whether the hero is still in its
 *  preseason phase; once that target passes (by either a real game's
 *  tipoff or the known date), this flips to the regular-season opener the
 *  same way. Returns null once the regular-season target has also passed,
 *  or once every tier is exhausted with nothing at all — the hero then
 *  steps aside for the page's normal Today's Games / standings panels. */
export async function getNbaHeroState(): Promise<NbaHeroState | null> {
  const preseason = await getNbaOpener("preseason");
  const preseasonTarget = preseason.game?.startsAt ?? preseason.fallbackISO;
  if (preseasonTarget && +new Date(preseasonTarget) > Date.now()) {
    return { phase: "preseason", game: preseason.game, targetISO: preseasonTarget, source: preseason.source, dateOnly: preseason.source === "known-fact", sourceLog: preseason.log };
  }

  const regular = await getNbaOpener("regular");
  const regularTarget = regular.game?.startsAt ?? regular.fallbackISO;
  if (!regularTarget || +new Date(regularTarget) <= Date.now()) return null;
  return { phase: "regular", game: regular.game, targetISO: regularTarget, source: regular.source, dateOnly: regular.source === "known-fact", sourceLog: [...preseason.log, ...regular.log] };
}

/** A followed team's real current-season roster — we can't show injuries
 *  (not part of the connected API-Sports plan), so this is the honest
 *  substitute: real players, real jersey numbers/positions, straight from
 *  the provider. Never invents a name. Falls back to SportsDataIO (NBA
 *  only, and only when the caller passes `allowSecondarySource` — see
 *  getNbaRosterFromSportsData's doc comment for why this one's gated more
 *  cautiously than the schedule/standings fallbacks) when API-Sports has
 *  nothing for this team. */
export async function getTeamRoster(sport: SportSlug, teamExternalId: string, opts?: { teamName?: string; allowSecondarySource?: boolean }): Promise<SportsRosterPlayer[]> {
  if (ApiSportsProvider.isConfigured(sport) && teamExternalId) {
    const season = seasonParam(sport, new Date().toISOString());
    const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, team: teamExternalId, kind: "roster" }), TTL_ROSTER, () =>
      fetchTeamRoster(sport, teamExternalId, season));
    if (cached?.data?.length) return cached.data;
  }

  if (sdioLeagueFor(sport) && opts?.allowSecondarySource && opts.teamName) {
    return getRosterFromSportsData(sport, opts.teamName);
  }

  return [];
}

const TTL_INJURIES = 60; // 1h — a real injury report changes daily during the season, faster-moving than the roster/standings caches

/** Real current injuries for one followed team, from SportsDataIO's
 *  league-wide injury list — the piece of the Magical Sports Data Policy
 *  the codebase previously had no source for at all. Filtered to the team
 *  by real TeamID via the cross-provider Team Identity Resolver, the same
 *  identity discipline as getRosterFromSportsData (never a raw comparison
 *  of a full franchise name against SportsDataIO's short team code); gate
 *  this behind the same allowSecondarySource/owner-preview rule as the
 *  roster fallback at the call site. Returns [] when nothing matches, the
 *  sport has no SportsDataIO product connected, or the call fails — never a
 *  guessed injury. */
export async function getTeamInjuries(sport: SportSlug, teamName: string): Promise<SdioInjury[]> {
  const league = sdioLeagueFor(sport);
  if (!league) return [];
  const [teamId, cached] = await Promise.all([
    resolveSdioTeamId(league, teamName),
    withCache("sports", "sportsdataio", cacheKeyFor({ sport, kind: "injuries" }), TTL_INJURIES, () => fetchInjuries(league)),
  ]);
  const injuries = cached?.data ?? [];
  if (!injuries.length) return [];
  if (teamId) {
    const byId = injuries.filter((i) => i.teamId === teamId);
    if (byId.length) return byId;
  }
  // Verified secondary resolver only — a real, exact team-code match.
  const target = normalizeTeamName(teamName);
  return injuries.filter((i) => i.team && normalizeTeamName(i.team) === target);
}

/** Live + upcoming games across the given sports (typically the member's
 *  followed sports, or a sensible default when they follow none), for the
 *  Sports landing page's Live Games / Upcoming Games panels. Never returns
 *  an empty "upcoming" list just because today's schedule is empty — steps
 *  forward day by day (up to a week out) until it finds real games, so the
 *  landing page never shows a blank panel when games are simply later this
 *  week. */
export async function getSportsLandingGames(sports: SportSlug[], limit = 4): Promise<{ live: SportsGameRow[]; upcoming: SportsGameRow[] }> {
  const configured = sports.filter((s) => ApiSportsProvider.isConfigured(s));
  if (!configured.length) return { live: [], upcoming: [] };

  const todayISO = new Date().toISOString().slice(0, 10);
  const today = (await Promise.all(configured.map((s) => getGamesByDate(s, todayISO)))).flatMap((r) => r.games);
  const live = today.filter((g) => g.status === "live").sort((a, b) => +a.startsAt - +b.startsAt).slice(0, limit);

  let upcoming = today.filter((g) => g.status === "scheduled").sort((a, b) => +a.startsAt - +b.startsAt);
  for (let daysOut = 1; daysOut <= 7 && upcoming.length < limit; daysOut++) {
    const dateISO = new Date(Date.now() + daysOut * 86_400_000).toISOString().slice(0, 10);
    const dayGames = (await Promise.all(configured.map((s) => getGamesByDate(s, dateISO)))).flatMap((r) => r.games);
    upcoming = upcoming.concat(dayGames.filter((g) => g.status === "scheduled").sort((a, b) => +a.startsAt - +b.startsAt));
  }

  return { live, upcoming: upcoming.slice(0, limit) };
}

/** One-time cleanup for cached API-Sports responses recorded while the
 *  account was on the Free plan (or otherwise restricted) — such a row
 *  would keep serving "restricted" for the rest of its TTL even after a
 *  plan upgrade, since a fresh (unexpired) cache row is served without
 *  ever calling the provider again. Going forward, getGamesByDate above
 *  never writes one of these in the first place; this only clears out rows
 *  written by the OLD code path before that fix shipped. Safe to call
 *  repeatedly — a no-op once the table's clean. Returns the number of rows
 *  removed. */
export async function purgePlanRestrictedSportsCache(): Promise<number> {
  const result = await prisma.discoveryCache.deleteMany({
    where: { provider: ApiSportsProvider.slug, payload: { contains: '"planRestricted":"' } },
  });
  return result.count;
}

export interface MatchupCardContext {
  game: SportsGameRow;
  tally: VoteTally;
  myPick: "home" | "away" | null;
  myPickCorrect: boolean | null;
  locked: boolean;
}

/** Games for a date, each paired with its vote tally and the viewer's own
 *  pick — what MatchupCard needs to render, in one call. `planRestricted`
 *  passes through from getGamesByDate — set only on a genuine provider
 *  plan/date restriction, never on a real "no games today." */
export async function getGamesWithVoteContext(sport: SportSlug, dateISO: string, accountId: string, limit = 6): Promise<{ contexts: MatchupCardContext[]; planRestricted?: string }> {
  const { games: allGames, planRestricted } = await getGamesByDate(sport, dateISO);
  const games = allGames.slice(0, limit);
  const contexts = await Promise.all(
    games.map(async (game) => {
      const picks = await prisma.sportsPick.findMany({ where: { gameId: game.id }, select: { teamPick: true, accountId: true, isCorrect: true } });
      const typed = picks.map((p) => ({ ...p, teamPick: p.teamPick as "home" | "away" }));
      const mine = typed.find((p) => p.accountId === accountId);
      return { game, tally: tallyVotes(typed), myPick: mine?.teamPick ?? null, myPickCorrect: mine?.isCorrect ?? null, locked: isPickLocked(game) };
    })
  );
  return { contexts, planRestricted };
}

export async function getMatchup(gameId: string, accountId?: string): Promise<{
  game: NonNullable<Awaited<ReturnType<typeof prisma.sportsGame.findUnique>>>;
  tally: VoteTally;
  myPick: "home" | "away" | null;
  myPickCorrect: boolean | null;
  locked: boolean;
} | null> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game) return null;
  const picks = await prisma.sportsPick.findMany({ where: { gameId }, select: { teamPick: true, accountId: true, isCorrect: true } });
  const typedPicks = picks.map((p) => ({ ...p, teamPick: p.teamPick as "home" | "away" }));
  const tally = tallyVotes(typedPicks);
  const mine = accountId ? typedPicks.find((p) => p.accountId === accountId) : undefined;
  return { game, tally, myPick: mine?.teamPick ?? null, myPickCorrect: mine?.isCorrect ?? null, locked: isPickLocked(game) };
}

export interface LiveGameState {
  status: "scheduled" | "live" | "final";
  period?: string;
  homeScore?: number;
  awayScore?: number;
  startsAt: string; // ISO
  venue?: string;
  stage?: string;
}

/** The real, freshly-fetched state of one game — the poll target for a
 *  live Game Center. Tiered by real need, not a single blanket TTL: a
 *  FINAL game's score never changes again, so it's served straight from
 *  the local row with no live call at all; a SCHEDULED game more than 30
 *  real minutes from its own real kickoff is the same (nothing meaningful
 *  could have changed); only a genuinely LIVE game, or one about to start,
 *  gets a fresh live call — cached for the shortest real window withCache
 *  supports, so many members watching the same game share one live call
 *  rather than each triggering their own. Falls back to the local row on
 *  any live-fetch failure — a poll never goes blank because a single
 *  request to the provider had a bad moment. */
export async function getLiveGameState(gameId: string): Promise<LiveGameState | null> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game) return null;
  const asRow: LiveGameState = {
    status: game.status as LiveGameState["status"],
    period: game.period ?? undefined,
    homeScore: game.homeScore ?? undefined,
    awayScore: game.awayScore ?? undefined,
    startsAt: game.startsAt.toISOString(),
  };
  if (game.status === "final" || !game.externalId) return asRow;
  const minutesToStart = (+game.startsAt - Date.now()) / 60_000;
  if (game.status === "scheduled" && minutesToStart > 30) return asRow;

  const sport = game.sport as SportSlug;
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, externalId: game.externalId, kind: "game_live_detail" }), TTL_GAME_DETAIL_LIVE, () =>
    ApiSportsProvider.gameById(sport, game.externalId!, { league: game.league }));
  const live = cached?.data;
  if (!live) return asRow;
  return {
    status: live.status,
    period: live.period,
    homeScore: live.homeScore,
    awayScore: live.awayScore,
    startsAt: live.startsAt,
    venue: live.venue,
    stage: live.stage,
  };
}

// ── My Teams / My Sports ────────────────────────────────────────────

export async function getMyTeams(accountId: string) {
  const follows = await prisma.sportsFollow.findMany({ where: { accountId, kind: "team" } });
  const withGames = await Promise.all(
    follows.map(async (f) => {
      const sport = f.sport as SportSlug;
      let upcoming: SportsGameSummary | null = null;
      let recent: SportsGameSummary | null = null;
      let localRows: Awaited<ReturnType<typeof syncGamesToLocal>> = [];
      if (f.teamExternalId && ApiSportsProvider.isConfigured(sport)) {
        const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, team: f.teamExternalId, kind: "team_games" }), TTL_GAMES_UPCOMING, () =>
          ApiSportsProvider.gamesForTeam(sport, f.teamExternalId!, { league: f.league || undefined }));
        const games = cached?.data ?? [];
        const now = Date.now();
        upcoming = games.filter((g) => new Date(g.startsAt).getTime() >= now).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0] ?? null;
        recent = games.filter((g) => g.status === "final").sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt))[0] ?? null;
        if (games.length) localRows = await syncGamesToLocal(sport, f.league || "", games);
      }
      const localIdFor = (g: SportsGameSummary | null) => (g ? localRows.find((r) => r.externalId === g.externalId)?.id ?? null : null);
      return { follow: f, upcoming, upcomingLocalId: localIdFor(upcoming), recent, recentLocalId: localIdFor(recent) };
    })
  );
  return withGames;
}

export async function getMySportsFollows(accountId: string) {
  const follows = await prisma.sportsFollow.findMany({ where: { accountId, kind: { in: ["sport", "league"] } } });
  return follows.map((f) => ({ ...f, label: sportLabel(f.sport as SportSlug) }));
}

// ── Standings ────────────────────────────────────────────────────

export async function getStandings(sport: SportSlug, league: string, season?: string): Promise<{ standings: SportsStanding[]; planRestricted?: string; season?: string }> {
  let restriction: string | undefined;
  // "standings_v3" (not "standings_v2"): rows now carry a resolved team logo
  // (see below) and a real conference/group label — a distinct cache key
  // keeps this from ever deserializing an older-shaped row left over from
  // before that change (same reasoning as the v1→v2 bump above it).
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, league, season, kind: "standings_v3" }), TTL_STANDINGS, async () => {
    const result = await ApiSportsProvider.standings(sport, league, season);
    if (result?.planRestricted) {
      restriction = result.planRestricted;
      return null;
    }
    if (!result?.standings.length) return result;
    // The standings endpoint's own embedded team.logo is unreliable for at
    // least some teams in some sports (missing, malformed, or a much lower-
    // quality asset than what the team catalog returns) — re-resolve every
    // row against the real API-Sports team catalog, the same trusted lookup
    // the SportsDataIO fallback already uses, and prefer that clean logo.
    // Falls back to the standings row's own logo only when the catalog
    // lookup itself comes back empty — never a blank card over a real (if
    // imperfect) provider-supplied logo.
    const resolvedStandings = await Promise.all(result.standings.map(async (s) => {
      const resolved = await resolveTeamByName(sport, s.team.name);
      return resolved?.logoUrl ? { ...s, team: { ...s.team, logoUrl: resolved.logoUrl } } : s;
    }));
    return { ...result, standings: resolvedStandings };
  });
  if (cached?.data.standings?.length) {
    return { standings: cached.data.standings, planRestricted: cached.data.planRestricted, season: cached.data.season };
  }

  // Tier 2: SportsDataIO, when API-Sports had nothing for this season yet —
  // any sport with a SportsDataIO product connected (see sdioLeagueFor).
  if (sdioLeagueFor(sport)) {
    const secondary = await getStandingsFromSportsData(sport, season);
    if (secondary.standings.length) return secondary;
  }

  return { standings: [], planRestricted: restriction };
}

/** Real win-loss(-tie) records for the two teams in one matchup, resolved
 *  from the same verified standings this page already trusts elsewhere —
 *  never a separate/guessed source. Silently omits a side whose team can't
 *  be matched in the current standings table rather than showing a wrong
 *  or fabricated record. */
export async function getGameTeamRecords(sport: SportSlug, league: string, homeTeamName: string, awayTeamName: string): Promise<{ home?: string; away?: string }> {
  const { standings } = await getStandings(sport, league).catch(() => ({ standings: [] as SportsStanding[] }));
  const recordFor = (name: string): string | undefined => {
    const row = standings.find((s) => normalizeTeamName(s.team.name) === normalizeTeamName(name));
    if (!row) return undefined;
    if (row.wins != null && row.losses != null) {
      return row.ties ? `${row.wins}-${row.losses}-${row.ties}` : `${row.wins}-${row.losses}`;
    }
    return row.summary;
  };
  return { home: recordFor(homeTeamName), away: recordFor(awayTeamName) };
}

// ── Picks / voting ───────────────────────────────────────────────

export async function submitPick(accountId: string, gameId: string, teamPick: "home" | "away") {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Matchup not found");
  if (isPickLocked(game)) throw new Error("Picks are locked for this matchup");
  return prisma.sportsPick.upsert({
    where: { gameId_accountId: { gameId, accountId } },
    create: { gameId, accountId, teamPick },
    update: { teamPick },
  });
}

/** Grades every un-graded pick for one final game, then re-evaluates badges
 *  for every affected account. Called from the grading action (Owner-run or
 *  scheduled) — never guesses a result on its own. */
export async function gradeGame(gameId: string): Promise<number> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game) return 0;
  const picks = await prisma.sportsPick.findMany({ where: { gameId, isCorrect: null } });
  const graded = gradeGamePicks(game, picks.map((p) => ({ id: p.id, teamPick: p.teamPick as "home" | "away" })));
  if (!graded) return 0;
  await Promise.all(graded.map((g) => prisma.sportsPick.update({ where: { id: g.id }, data: { isCorrect: g.isCorrect } })));
  await Promise.all(
    picks.map(async (p) => {
      const result = graded.find((g) => g.id === p.id);
      await dispatchNotification({
        accountId: p.accountId,
        type: "sports_prediction_result",
        title: result?.isCorrect ? "✓ You called it!" : "Not this time — next matchup!",
        body: `${game.awayTeamName} @ ${game.homeTeamName} — final ${game.awayScore}-${game.homeScore}.`,
        actionUrl: `/dashboard/discovery/sports/game/${gameId}`,
        relatedLabel: `${game.awayTeamName} @ ${game.homeTeamName}`,
      }).catch(() => null);
      await refreshBadges(p.accountId);
    })
  );
  return graded.length;
}

// ── Owner-entered games (rivalry/exhibition matchups with no provider id) ──

export async function createOwnerGame(input: {
  sport: SportSlug; league: string; homeTeamName: string; awayTeamName: string;
  homeTeamLogoUrl?: string; awayTeamLogoUrl?: string; startsAt: Date;
}) {
  return prisma.sportsGame.create({
    data: {
      sport: input.sport, league: input.league, externalId: null,
      homeTeamName: input.homeTeamName, homeTeamLogoUrl: input.homeTeamLogoUrl,
      awayTeamName: input.awayTeamName, awayTeamLogoUrl: input.awayTeamLogoUrl,
      startsAt: input.startsAt, status: "scheduled", source: "owner",
    },
  });
}

/** Owner manually enters a final score — for an owner-entered game, or as a
 *  fallback if the live provider is unreachable. Grades immediately after. */
export async function setFinalScore(gameId: string, homeScore: number, awayScore: number): Promise<number> {
  await prisma.sportsGame.update({ where: { id: gameId }, data: { status: "final", homeScore, awayScore } });
  return gradeGame(gameId);
}

// ── Family Leaderboard ──────────────────────────────────────────

export interface LeaderboardEntry {
  accountId: string;
  name: string;
  points: number;
  rank: number;
  isMe: boolean;
}

/** Ranks the viewer's own household by correct Magical Picks — 1 point per
 *  correct pick, real and counted from SportsPick.isCorrect, never a
 *  fabricated score. There's no flat multi-adult "family group" of
 *  separate login Accounts in this schema today — the real Account
 *  relationship available is guardian/ward (Account.guardianAccountId, for
 *  a minor's account linked to a parent's). "Household" here is: the
 *  viewer + anyone they guardian, or — if the viewer is themself a
 *  minor — their guardian + that guardian's other wards (siblings). Most
 *  adult accounts have no guardian links at all, so most viewers get a
 *  solo one-row result; `hasFamily` tells the page whether to show the
 *  "Family Leaderboard" framing or fall back to "My Picks".
 *  `range: "week"` counts only picks on games that started this week
 *  (Sunday-anchored, see startOfWeek); `"all"` counts every correct pick
 *  ever. */
export async function getFamilyPicksLeaderboard(accountId: string, range: "week" | "all" = "week"): Promise<{ entries: LeaderboardEntry[]; hasFamily: boolean }> {
  const me = await prisma.account.findUnique({ where: { id: accountId }, select: { guardianAccountId: true, firstName: true } });
  const householdRootId = me?.guardianAccountId ?? accountId;
  const household = await prisma.account.findMany({
    where: { OR: [{ id: householdRootId }, { guardianAccountId: householdRootId }] },
    select: { id: true, firstName: true },
  });
  const familyAccounts = household.length ? household : [{ id: accountId, firstName: me?.firstName ?? "You" }];

  const since = range === "week" ? startOfWeek(new Date()) : undefined;
  const correctPicks = await prisma.sportsPick.findMany({
    where: {
      accountId: { in: familyAccounts.map((a) => a.id) },
      isCorrect: true,
      ...(since ? { game: { startsAt: { gte: since } } } : {}),
    },
    select: { accountId: true },
  });
  const pointsByAccount = new Map<string, number>();
  for (const p of correctPicks) pointsByAccount.set(p.accountId, (pointsByAccount.get(p.accountId) ?? 0) + 1);

  const entries = familyAccounts
    .map((a) => ({ accountId: a.id, name: a.firstName, points: pointsByAccount.get(a.id) ?? 0, isMe: a.id === accountId }))
    .sort((a, b) => b.points - a.points)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return { entries, hasFamily: familyAccounts.length > 1 };
}

// ── Magical Picks profile + badges ──────────────────────────────

export async function getMagicalPicksProfile(accountId: string): Promise<PicksSummary & { badges: { id: BadgeId; label: string; description: string; icon: string; earnedAt: Date }[] }> {
  const picks = await prisma.sportsPick.findMany({ where: { accountId }, include: { game: { select: { sport: true, startsAt: true } } } });
  const summary = summarizePicks(picks.map((p) => ({ gameId: p.gameId, sport: p.game.sport, isCorrect: p.isCorrect, gameStartsAt: p.game.startsAt })));
  const earnedRows = await prisma.sportsBadgeEarned.findMany({ where: { accountId } });
  const badges = earnedRows
    .map((r) => {
      const def = SPORTS_BADGES.find((b) => b.id === r.badgeId);
      return def ? { ...def, id: def.id, earnedAt: r.earnedAt } : null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
  return { ...summary, badges };
}

async function refreshBadges(accountId: string): Promise<void> {
  const [picks, teamFollows, sportFollows, alreadyEarned] = await Promise.all([
    prisma.sportsPick.findMany({ where: { accountId }, include: { game: { select: { sport: true, startsAt: true } } } }),
    prisma.sportsFollow.count({ where: { accountId, kind: "team" } }),
    prisma.sportsFollow.groupBy({ by: ["sport"], where: { accountId } }),
    prisma.sportsBadgeEarned.findMany({ where: { accountId }, select: { badgeId: true } }),
  ]);
  const earned = evaluateEarnedBadges({
    picks: picks.map((p) => ({ gameId: p.gameId, sport: p.game.sport, isCorrect: p.isCorrect, gameStartsAt: p.game.startsAt })),
    followedTeamCount: teamFollows,
    followedSportsCount: sportFollows.length,
  });
  const alreadyIds = new Set(alreadyEarned.map((b) => b.badgeId));
  const newlyEarned = earned.filter((id) => !alreadyIds.has(id));
  if (!newlyEarned.length) return;

  await Promise.all(
    newlyEarned.map((badgeId) =>
      prisma.sportsBadgeEarned.upsert({
        where: { accountId_badgeId: { accountId, badgeId } },
        create: { accountId, badgeId },
        update: {},
      }).catch(() => null)
    )
  );
  await Promise.all(
    newlyEarned.map((badgeId) => {
      const def = SPORTS_BADGES.find((b) => b.id === badgeId);
      if (!def) return null;
      return dispatchNotification({
        accountId,
        type: "sports_streak_achievement",
        title: `${def.icon} Badge earned: ${def.label}`,
        body: def.description,
        actionUrl: "/dashboard/discovery/sports/picks",
        relatedLabel: "Magical Picks",
      }).catch(() => null);
    })
  );
}

// ── Search (sports / leagues / teams) ───────────────────────────

export async function searchSports(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { sports: [], teams: [] };
  const sports = SPORT_CATALOG.filter((s) => s.label.toLowerCase().includes(q) || s.slug.includes(q));
  const teamMatches = await Promise.all(
    MATCHUP_SPORTS.filter((sport) => ApiSportsProvider.isConfigured(sport)).map(async (sport) => {
      const teams = await ApiSportsProvider.searchTeams(sport, query);
      return (teams ?? []).map((t) => ({ ...t, sport }));
    })
  );
  return { sports, teams: teamMatches.flat() };
}

export function isHighSchoolConnected(): boolean {
  return HighSchoolPendingProvider.isConfigured();
}

const TTL_LEAGUE_TEAMS = 10080; // 1 week — a league's team membership barely changes

// Sports with exactly one real league — team search here can (and must)
// stay scoped to that league's own verified roster. Soccer is deliberately
// excluded: it's a genuinely multi-league sport (Premier League, La Liga,
// Bundesliga, ...) and searching it correctly requires the member to pick
// a league/competition first, which isn't built yet — until then it keeps
// the older, broader (and known-imperfect) catalog search rather than
// wrongly narrowing to one arbitrary league.
const SINGLE_LEAGUE_SPORTS: ReadonlySet<SportSlug> = new Set(["nfl", "ncaaf", "nba", "wnba", "ncaab", "mlb", "nhl", "rugby", "volleyball"]);

/** Team search scoped to one sport — for the per-sport page's own
 *  follow-a-team box, as opposed to searchSports' cross-sport search.
 *  For a single-league sport, this matches locally against that league's
 *  own real, verified team list (fetchTeamsForLeague) instead of
 *  API-Sports' unscoped whole-catalog search — the previous approach could
 *  return a same-named team from a completely different league/division on
 *  the same host (e.g. a G-League or international club alongside the real
 *  NBA team). Falls back to the broader search only when the league's own
 *  roster isn't available yet (season not posted), never silently. */
export async function searchTeamsForSport(sport: SportSlug, query: string) {
  if (!query.trim() || !ApiSportsProvider.isConfigured(sport)) return [];

  if (SINGLE_LEAGUE_SPORTS.has(sport)) {
    const league = defaultLeagueId(sport);
    if (league) {
      const season = seasonParam(sport, new Date().toISOString());
      const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, league, season, kind: "league_teams" }), TTL_LEAGUE_TEAMS, () =>
        fetchTeamsForLeague(sport, league, season));
      const roster = cached?.data ?? [];
      if (roster.length) return rankTeamMatches(roster, query);
    }
  }

  const teams = await ApiSportsProvider.searchTeams(sport, query);
  return teams ?? [];
}
