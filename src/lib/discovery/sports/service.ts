// ── Magical Discovery — Sports service layer (SERVER ONLY) ────────
// The only place Sports pages talk to the provider/cache/DB. Live provider
// results are cached in the existing DiscoveryCache (category "sports") and
// then synced into SportsGame — our stable local copy that picks/votes
// reference — so a matchup keeps working even if a later provider refetch
// reshapes or briefly fails.

import { prisma } from "@/lib/db";
import { withCache, cacheKeyFor } from "../cache";
import { ApiSportsProvider, HighSchoolPendingProvider, MATCHUP_SPORTS, fetchLeagueLogo, fetchFirstPreseasonGame, fetchFirstRegularSeasonGame, fetchFirstPostseasonGame, fetchSeasonGames, fetchTeamRoster, fetchTeamsForLeague, rankTeamMatches, seasonParam, previousSeasonParam, defaultLeagueId, resolveNcaaBaseballLeagueId, fetchGameTeamStats, fetchGamePlayerStats, classifySeasonPhase, fetchLeagueDetailDiagnostic, fetchRawTeamsResponseDiagnostic, fetchRawTeamsArraysForDiagnostic, findForensicTeamMatches, summarizeTeamCatalogShape, type SportSlug, type SportsGameSummary, type SportsStanding, type SportsRosterPlayer, type SportsTeam, type TeamGameStats, type TeamPlayerGameStats, type LeagueDetailDiagnostic, type RawTeamsResponseDiagnostic, type ForensicTeamMatch, type TeamCatalogShapeSummary } from "../providers/sports";
import { fetchNbaFirstGame, fetchGamesByDate as fetchSdioGamesByDate, fetchStandings as fetchSdioStandings, fetchAllPlayers, fetchInjuries, type SdioLeague, type SdioInjury } from "../providers/sportsdata";
import { resolveOfficialDate, type SourceAttempt } from "./officialSource";
import { resolveSdioTeamId, resolveSdioTeamIdentity, getSdioTeamDirectory } from "./team-identity";
import { resolveRosterViaOpenAI, type SportsDataProvenance } from "./openai-resolver";
import { normalizePlayerName } from "./player-name";
import { gradeGamePicks, tallyVotes, isPickLocked, summarizePicks, gradeRacePicks, leaderboardPeriodStart, startOfWeek, recordInRange, currentPhasePicks, type VoteTally, type PicksSummary, type LeaderboardPeriod } from "./picks";
import { projectNflConferenceSeeds, projectMlbLeagueSeeds, projectNhlConferenceSeeds, projectNbaConferencePicture, computePostseasonPicture } from "./postseason";
import { buildNflBracketData, buildNbaBracketData, buildWnbaBracketData, buildMlbBracketData, buildNhlBracketData, type BracketData, type NflBracketRealGame, type NbaBracketRealGame, type WnbaBracketRealGame, type MlbBracketRealGame, type NhlBracketRealGame } from "./bracket";
import { evaluateEarnedBadges, SPORTS_BADGES, type BadgeId } from "./badges";
import { dispatchNotification } from "@/lib/notify";

const TTL_GAMES_UPCOMING = 180; // 3h — schedules barely move
const TTL_GAMES_LIVE = 3; // 3m — live games refresh often
const TTL_GAME_DETAIL_LIVE = 1; // 1m — the shortest TTL withCache supports; a single game someone is actively watching
const TTL_GAME_BOX_SCORE_LIVE = 1; // 1m while live — a box score updates play by play
const TTL_GAME_BOX_SCORE_FINAL = 10080; // 1 week — a final game's stat line never changes again
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
  { slug: "ncaabaseball", label: "College Baseball", category: "college" },
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
          seasonPhase: classifySeasonPhase(g.stage),
          homeTeamId: g.homeTeam.id || null, homeTeamName: g.homeTeam.name, homeTeamLogoUrl: g.homeTeam.logoUrl,
          awayTeamId: g.awayTeam.id || null, awayTeamName: g.awayTeam.name, awayTeamLogoUrl: g.awayTeam.logoUrl,
          startsAt: new Date(g.startsAt), status: g.status, period: g.period,
          homeScore: g.homeScore, awayScore: g.awayScore, source: "provider", lastSyncedAt: new Date(),
        },
        update: {
          // Recomputed on every resync (not just create) so a row the
          // schema migration defaulted to "regular" — or one synced before
          // the provider's own stage label caught up — corrects itself the
          // next real time this exact game is fetched, instead of staying
          // permanently mislabeled. Team identity fields are refreshed here
          // too for the same reason: a row synced before a resolver fix
          // shipped (e.g. a raw SportsDataIO team code like "GSV" that
          // leaked in as homeTeamName before resolveSdioGameTeam existed)
          // must self-heal the next time this exact game is fetched, not
          // stay wrong forever just because it already exists in the DB.
          seasonPhase: classifySeasonPhase(g.stage),
          homeTeamId: g.homeTeam.id || null, homeTeamName: g.homeTeam.name, homeTeamLogoUrl: g.homeTeam.logoUrl,
          awayTeamId: g.awayTeam.id || null, awayTeamName: g.awayTeam.name, awayTeamLogoUrl: g.awayTeam.logoUrl,
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
  // ncaabaseball has no static SPORT_CONFIG default (see
  // resolveDefaultLeagueId's doc comment) — every OTHER sport is unaffected
  // by this (the ternary is a no-op, `resolvedLeague` stays exactly what the
  // caller passed, same as before this line existed) so this single seam
  // fixes every caller of getGamesByDate (the landing page's Live/Upcoming
  // panels, Magical Picks' matchup lookups, the per-sport page) without
  // threading a resolved league through each of them individually.
  const resolvedLeague = league || (sport === "ncaabaseball" ? (await resolveDefaultLeagueId(sport)) || undefined : undefined);
  const isToday = dateISO === new Date().toISOString().slice(0, 10);
  const ttl = isToday ? TTL_GAMES_LIVE : TTL_GAMES_UPCOMING;
  let restriction: string | undefined;
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, dateISO, league: resolvedLeague }), ttl, async () => {
    const result = await ApiSportsProvider.gamesByDate(sport, dateISO, resolvedLeague);
    if (result?.planRestricted) {
      restriction = result.planRestricted;
      return null;
    }
    return result;
  });
  if (cached?.data.games.length) {
    const synced = await syncGamesToLocal(sport, resolvedLeague || cached.data.games[0]?.league || "", cached.data.games);
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
 *  response. Never a guessed date. `league` overrides SPORT_CONFIG's static
 *  default — pass resolveDefaultLeagueId's result for a sport (like
 *  ncaabaseball) whose league id isn't a fixed constant; every other caller
 *  can omit it and get the same static default as before. */
export async function getFirstPreseasonGame(sport: SportSlug, league?: string): Promise<SportsGameSummary | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, kind: "first_preseason" }), TTL_GAMES_UPCOMING, () =>
    fetchFirstPreseasonGame(sport, season, league));
  return cached?.data ?? null;
}

/** The real regular-season opener — for a live "N days until kickoff"
 *  countdown. Same real-stage-label sourcing as getFirstPreseasonGame,
 *  never a computed/assumed date. See getFirstPreseasonGame's doc comment
 *  for `league`. */
export async function getFirstRegularSeasonGame(sport: SportSlug, league?: string): Promise<SportsGameSummary | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, kind: "first_regular_season" }), TTL_GAMES_UPCOMING, () =>
    fetchFirstRegularSeasonGame(sport, season, league));
  return cached?.data ?? null;
}

/** The real postseason/playoff opener — same real-stage-label sourcing as
 *  getFirstPreseasonGame/getFirstRegularSeasonGame, never a computed/assumed
 *  date. Null once the provider hasn't posted a postseason bracket yet (the
 *  normal case for most of the regular season). See getFirstPreseasonGame's
 *  doc comment for `league`. */
export async function getFirstPostseasonGame(sport: SportSlug, league?: string): Promise<SportsGameSummary | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, kind: "first_postseason" }), TTL_GAMES_UPCOMING, () =>
    fetchFirstPostseasonGame(sport, season, league));
  return cached?.data ?? null;
}

// A league id's own identity never changes once confirmed — cached for a
// week, same TTL discipline as team-catalog/logo lookups below.
const TTL_LEAGUE_RESOLUTION = 10080;

/** The real API-Sports league id to use for a sport's default competition.
 *  For every sport except ncaabaseball this is just SPORT_CONFIG's own
 *  static, already-known id (defaultLeagueId) — resolved instantly, no
 *  network call, just wrapped in a resolved promise so every caller can
 *  `await` uniformly regardless of sport. ncaabaseball is the one real
 *  exception: SPORT_CONFIG deliberately leaves its defaultLeague empty (see
 *  that file's comment) because API-Sports' baseball product has never been
 *  confirmed to include NCAA/college baseball at all — so instead of a
 *  hardcoded guess, this asks the provider itself via
 *  resolveNcaaBaseballLeagueId and caches whatever real answer comes back.
 *  withCache never caches a null (see its own doc comment), so an
 *  unconfigured deployment or a genuine "no NCAA baseball league found"
 *  result is retried — cheaply, since apiSportsFetch short-circuits with no
 *  network call at all when API_SPORTS_KEY isn't set — the next time this is
 *  called, rather than staying "unavailable" for the cache TTL even after a
 *  key or plan is fixed. Returns "" (never a guessed id) when nothing
 *  resolves; every "games"-shaped call site already treats an empty league
 *  id as "not available yet," the same honest gate MMA/F1 use today for
 *  their own permanently-empty default. */
export async function resolveDefaultLeagueId(sport: SportSlug): Promise<string> {
  if (sport !== "ncaabaseball") return defaultLeagueId(sport);
  if (!ApiSportsProvider.isConfigured(sport)) return "";
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, kind: "ncaabaseball_league_resolve" }), TTL_LEAGUE_RESOLUTION, () =>
    resolveNcaaBaseballLeagueId());
  return cached?.data ?? "";
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
 *
 *  For a single-league sport (NBA, NFL, ...) this matches locally against
 *  ONE bulk, week-cached league roster (fetchTeamsForLeague) instead of
 *  issuing a separate live, UNSCOPED `/teams?search=` call per team name.
 *  A page resolving an entire league's worth of teams (Standings, the All
 *  Teams directory — up to 30+ names in one Promise.all) used to fire that
 *  many concurrent unscoped searches; a real provider rate limit throttling
 *  even a few of them left those specific teams' logos blank, and which
 *  ones came up empty varied run to run since nothing about the failure
 *  was cached (see withCache — it never caches a null). Falls back to the
 *  old unscoped per-name search only when the sport isn't single-league or
 *  the bulk roster comes back empty. Returns null when nothing matches —
 *  never a guessed logo. */
export async function resolveTeamByName(sport: SportSlug, name: string): Promise<{ id: string; logoUrl?: string } | null> {
  const target = normalizeTeamName(name);

  const rosterMap = await getLeagueTeamRosterMap(sport);
  if (rosterMap) {
    const match = rosterMap.get(target);
    if (match) return match;
    if (rosterMap.size) return null; // a real, complete league roster with no match — not a guess
  }

  const searched = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, teamNameLookup: target }), TTL_TEAM_LOOKUP, () =>
    ApiSportsProvider.searchTeams(sport, name));
  const candidates = searched?.data;
  if (!candidates?.length) return null;
  const match = candidates.find((t) => normalizeTeamName(t.name) === target) ?? candidates[0];
  return { id: match.id, logoUrl: match.logoUrl };
}

/** The ONE bulk, week-cached roster lookup every single-league sport's
 *  team-name resolution shares — a whole page resolving 30+ team names
 *  (Standings, the All Teams directory) prefetches this map exactly once
 *  and does synchronous local lookups from it, instead of each of those 30
 *  names independently racing its own live call (see resolveTeamByName's
 *  doc comment for what that race used to do to logos). Returns null for a
 *  sport with no single-league roster to prefetch — callers fall back to
 *  resolveTeamByName's per-name search path for those.
 *
 *  Cache key is "league_teams_v2", not "league_teams" — bumped once, the day
 *  the /teams pagination+dedup fix shipped, so a week-old cache row written
 *  by the old (occasionally-duplicating) fetch logic can never keep being
 *  served under its still-unexpired TTL. Any future fix to fetchTeamsForLeague
 *  that changes what gets stored under this key should bump the suffix again
 *  rather than relying on the week-long TTL to self-heal. */
export async function getLeagueTeamRosterMap(sport: SportSlug): Promise<Map<string, { id: string; logoUrl?: string }> | null> {
  if (!SINGLE_LEAGUE_SPORTS.has(sport)) return null;
  const league = await resolveDefaultLeagueId(sport);
  if (!league) return null;
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, league, season, kind: "league_teams_v2" }), TTL_LEAGUE_TEAMS, () =>
    fetchTeamsForLeague(sport, league, season));
  const roster = cached?.data ?? [];
  const map = new Map<string, { id: string; logoUrl?: string }>();
  for (const t of roster) {
    const entry = { id: t.id, logoUrl: t.logoUrl };
    map.set(normalizeTeamName(t.name), entry);
    // Also index by the provider's own real short code (e.g. "BUF"), when it
    // returns one — a secondary, still-verified match key. A secondary
    // source's team field (SportsDataIO's Player.Team, for one) is often
    // just the code, not the full franchise name; without this, resolving
    // that player's team logo would silently fail even though the real
    // team is right there in this same roster. Never a guessed code.
    if (t.code) map.set(normalizeTeamName(t.code), entry);
  }
  return map;
}

/** The real, live team catalog for a sport's resolved league — straight
 *  from API-Sports' /teams endpoint, the PRIMARY source for the All Teams
 *  directory (team-directory.ts) for every sport WITHOUT a
 *  VERIFIED_REFERENCE (see hasVerifiedReference — today, everything but
 *  NBA/NFL). Deliberately independent of Standings: a standings failure
 *  (a provider hiccup, a plan restriction, an off-season with no win-loss
 *  data posted yet) must never take the All Teams list down with it — the
 *  real roster of a league doesn't depend on whether anyone's played a game
 *  yet, and /teams is a different call with its own success/failure from
 *  /standings.
 *
 *  Uses the exact same cache key as getLeagueTeamRosterMap (same
 *  sport/league/season, same underlying fetchTeamsForLeague call) so a page
 *  that calls both (e.g. any SINGLE_LEAGUE_SPORTS sport) shares one cache
 *  row instead of fetching the identical roster twice. Callers with no
 *  resolved league (empty string — e.g. ncaabaseball before resolution)
 *  should skip calling this entirely; returns [] in that case, or when
 *  unconfigured, or when the provider genuinely has nothing — never a
 *  guessed/fabricated roster. */
export async function getLeagueTeamCatalog(sport: SportSlug, league: string): Promise<SportsTeam[]> {
  if (!league || !ApiSportsProvider.isConfigured(sport)) return [];
  const season = seasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, league, season, kind: "league_teams_v2" }), TTL_LEAGUE_TEAMS, () =>
    fetchTeamsForLeague(sport, league, season));
  return cached?.data ?? [];
}

/** getLeagueTeamCatalog, with the same off-season retry pattern already
 *  proven for Standings (getStandingsWithOffSeasonFallback, just below):
 *  when the CURRENT season's team catalog is missing real teams and the
 *  caller has confirmed (via its own real dated-openers check, same as
 *  Standings' `isOffSeasonPhase`) that this is a real off-season/preseason
 *  window rather than a mid-season provider hiccup, retries against the
 *  last REAL completed season and MERGES the two by real provider team id
 *  — never simply checking "is the count zero."
 *
 *  `minimumExpectedCount` is the completeness bar: a real, already-known
 *  team count for this league, sourced from either a VERIFIED_REFERENCE
 *  spec's own real team list (NBA/NFL — see fetchVerifiedTeamCatalog in
 *  team-directory.ts) or the number of distinct real team ids already
 *  found in this same render's Standings result (every other sport — see
 *  countDistinctStandingsTeams in team-directory.ts, which for a sport
 *  using getStandingsWithOffSeasonFallback already reflects a real
 *  prior-season roster during an off-season window). Either source is
 *  real data this app already computed — never an independently guessed
 *  number that would go stale the moment a league expands, realigns, or a
 *  franchise relocates/rebrands. Deliberately NOT a hardcoded per-sport
 *  number table: that would need constant manual upkeep (see, e.g., the
 *  WNBA's own 2026 expansion) and would be exactly the kind of guess this
 *  file's own house style avoids elsewhere. A caller with no strong
 *  completeness signal available (e.g. a first render with no standings
 *  data at all yet) should pass 1 — the previous, honest "empty is
 *  incomplete, anything real is not" behavior — never 0, which would
 *  disable the check entirely.
 *
 *  This is the confirmed root cause of NHL/College Basketball/College
 *  Football's incomplete "All Teams" directories, and the confirmed cause
 *  of NBA's own 19/30 gap (a merely nonzero catalog was previously,
 *  incorrectly, treated as complete — see this function's own git history
 *  for the earlier, insufficient `if (current.length || ...)` check this
 *  replaced). Every sport that calls getLeagueTeamCatalog for its All
 *  Teams directory (the generic path in [sport]/page.tsx, and NBA/NFL's
 *  VERIFIED_REFERENCE path via fetchVerifiedTeamCatalog in
 *  team-directory.ts) goes through this one fallback, so a future sport
 *  never has to rediscover the same gap.
 *
 *  MERGE, never replace: the current season's real identity wins for
 *  every provider id it already has (so a genuine rebrand/relocation/
 *  expansion team the CURRENT catalog already knows about is never
 *  overwritten by an older name/logo) — the prior season only FILLS IN
 *  ids the current catalog is missing. A previous season's SportsTeam row
 *  carries ONLY stable franchise identity (id/name/logoUrl/code) — it has
 *  no win/loss/record/roster/schedule fields at all, so using it for team
 *  identity can never leak stale competitive data into a page whose
 *  standings/record/roster sections already resolve the CURRENT season
 *  independently. Returns the current (possibly incomplete) result
 *  unchanged outside an off-season phase, when it's already at/above the
 *  expected count, or when the merge wouldn't actually add anything —
 *  never fabricates a catalog entry that isn't real. */
export async function getLeagueTeamCatalogWithOffSeasonFallback(sport: SportSlug, league: string, isOffSeasonPhase: boolean, minimumExpectedCount = 1): Promise<SportsTeam[]> {
  const current = await getLeagueTeamCatalog(sport, league);
  if (!isOffSeasonPhase || current.length >= minimumExpectedCount) return current;
  const priorSeason = previousSeasonParam(sport, new Date().toISOString());
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, league, season: priorSeason, kind: "league_teams_v2" }), TTL_LEAGUE_TEAMS, () =>
    fetchTeamsForLeague(sport, league, priorSeason));
  return mergeCatalogWithPriorSeason(current, cached?.data ?? [], minimumExpectedCount);
}

/** The pure completeness+merge decision getLeagueTeamCatalogWithOffSeasonFallback
 *  makes once it has both real results in hand — split out because the
 *  function above's real network calls can't be exercised in a sandbox with
 *  no live provider key, but this decision logic itself needs real test
 *  coverage (an empty catalog, a partial one like NBA's confirmed 19/30,
 *  a complete one, and current-wins-over-prior-for-a-shared-id all need to
 *  be provably correct). `current` is assumed already known to be below
 *  `minimumExpectedCount` — this function still re-checks defensively so it
 *  can't itself be called incorrectly and silently merge when it shouldn't.
 *  MERGE, never replace: prior fills in only ids missing from current;
 *  current's own real identity always wins for any id both share, so a
 *  same-season expansion team or an already-updated rebrand/relocation
 *  current already knows about is never overwritten by a stale prior-season
 *  name/logo. Exported for tests. */
export function mergeCatalogWithPriorSeason(current: SportsTeam[], prior: SportsTeam[], minimumExpectedCount: number): SportsTeam[] {
  if (current.length >= minimumExpectedCount || !prior.length) return current;
  const merged = new Map<string, SportsTeam>();
  for (const t of prior) merged.set(t.id, t);
  for (const t of current) merged.set(t.id, t);
  const result = Array.from(merged.values());
  return result.length > current.length ? result : current;
}

// ── TEMPORARY Owner-only diagnostic: College Football (ncaaf) live catalog
// membership — see the module comment above findForensicTeamMatches in
// providers/sports.ts for the full context. Hardcoded to sport="ncaaf" on
// purpose (this is a one-league investigation, not a general-purpose
// tool) — mirrors the shape of the NHL live diagnostic (getNhlLiveDiagnostic,
// a separate, still-open diagnostic PR) without depending on it, since that
// PR isn't merged yet and this one must stand alone on top of main. Every
// number here comes straight from a real provider call or a real production
// function (fetchTeamsForLeague, getLeagueTeamCatalogWithOffSeasonFallback,
// mergeCatalogWithPriorSeason) — never recomputed or approximated
// separately, so this diagnostic can never disagree with what the ncaaf
// page itself actually shows. TEMPORARY: remove once the live evidence
// resolves the contamination question and the real fix ships.
export interface NcaafLiveDiagnostic {
  configured: boolean;
  league: string;
  currentSeason: string;
  previousSeason: string;
  leagueDetail: LeagueDetailDiagnostic;
  rawCurrent: RawTeamsResponseDiagnostic;
  rawPrevious: RawTeamsResponseDiagnostic;
  /** The real, production-identical merged catalog
   *  (getLeagueTeamCatalogWithOffSeasonFallback's own output for ncaaf) —
   *  the exact same team list the live page's directory renders from. */
  mergedCatalogNames: string[];
  mergedCatalogCount: number;
  forensicMatches: ForensicTeamMatch[];
  shapeSummary: TeamCatalogShapeSummary;
}

export async function getNcaafLiveDiagnostic(league: string, isOffSeasonPhase: boolean, minimumExpectedCount: number): Promise<NcaafLiveDiagnostic> {
  const sport: SportSlug = "ncaaf";
  const configured = ApiSportsProvider.isConfigured(sport);
  const nowISO = new Date().toISOString();
  const currentSeason = seasonParam(sport, nowISO);
  const previousSeason = previousSeasonParam(sport, nowISO);

  const [leagueDetail, rawCurrent, rawPrevious, rawArrays, mergedCatalog] = await Promise.all([
    fetchLeagueDetailDiagnostic(sport, league),
    fetchRawTeamsResponseDiagnostic(sport, league, currentSeason),
    fetchRawTeamsResponseDiagnostic(sport, league, previousSeason),
    fetchRawTeamsArraysForDiagnostic(sport, league, currentSeason, previousSeason),
    getLeagueTeamCatalogWithOffSeasonFallback(sport, league, isOffSeasonPhase, minimumExpectedCount),
  ]);

  const forensicMatches = findForensicTeamMatches(rawArrays.current, rawArrays.previous);
  const shapeSummary = summarizeTeamCatalogShape([...rawArrays.current, ...rawArrays.previous]);

  return {
    configured,
    league,
    currentSeason,
    previousSeason,
    leagueDetail,
    rawCurrent,
    rawPrevious,
    mergedCatalogNames: mergedCatalog.map((t) => t.name).sort((a, b) => a.localeCompare(b)),
    mergedCatalogCount: mergedCatalog.length,
    forensicMatches,
    shapeSummary,
  };
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

/** Resolves a raw SportsDataIO team string — which toSdioGame may have had
 *  to fall back to a short team code/Key for (e.g. "GSV") when the
 *  provider's Games row omitted HomeTeamName/AwayTeamName — to a real,
 *  customer-facing identity: canonical full name from the SportsDataIO
 *  team-identity directory (resolveSdioTeamIdentity), and API-Sports'
 *  id/logo looked up BY that canonical name rather than the raw code, so a
 *  code that would never match anything in API-Sports' own catalog no
 *  longer breaks logo resolution too. Falls back to the raw string as the
 *  name only when the real directory genuinely has no match for it —
 *  never invented, always the best real name available. */
async function resolveSdioGameTeam(sport: SportSlug, league: SdioLeague, raw: string): Promise<{ id: string; name: string; logoUrl?: string }> {
  const identity = await resolveSdioTeamIdentity(league, raw);
  const name = identity?.fullName ?? raw;
  const resolved = await resolveTeamByName(sport, name);
  return { id: resolved?.id ?? "", name, logoUrl: resolved?.logoUrl };
}

/** Real games for one date from SportsDataIO, for any sport with a
 *  SportsDataIO product connected (see sdioLeagueFor) — secondary source
 *  for Today's Games when API-Sports has nothing for that date. Each team
 *  is resolved to its real canonical name and API-Sports logo (see
 *  resolveSdioGameTeam) the same way the hero countdown does. Returns []
 *  on missing config, an unsupported sport, a failed call, or a genuinely
 *  empty schedule for that date. */
async function getGamesByDateFromSportsData(sport: SportSlug, dateISO: string): Promise<SportsGameSummary[]> {
  const league = sdioLeagueFor(sport);
  if (!league) return [];
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ sport, dateISO, kind: "games_by_date" }), TTL_GAMES_UPCOMING, () =>
    fetchSdioGamesByDate(league, dateISO));
  const games = cached?.data ?? [];
  if (!games.length) return [];
  const defaultLeague = defaultLeagueId(sport);
  return Promise.all(games.map(async (g): Promise<SportsGameSummary> => {
    const [home, away] = await Promise.all([resolveSdioGameTeam(sport, league, g.homeTeam), resolveSdioGameTeam(sport, league, g.awayTeam)]);
    return {
      externalId: g.externalId,
      sport,
      league: defaultLeague,
      homeTeam: home,
      awayTeam: away,
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
// API-Sports' basketball product names WNBA teams with a trailing gender
// marker (e.g. "Connecticut Sun W") that SportsDataIO's own team directory
// doesn't carry on the same franchise's real full name — a real, observed
// provider formatting difference, not a guess at what either provider
// "probably" does. Stripped ONLY as a last-resort identity tier, ONLY for
// WNBA, and ONLY this one specific, known suffix shape — never a general
// fuzzy match that could mis-map two different real teams together.
function stripKnownWnbaSuffix(normalized: string): string | null {
  const stripped = normalized.replace(/\s+w$/, "").trim();
  return stripped !== normalized && stripped.length > 0 ? stripped : null;
}

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
  const findIdentity = (t: string) => directory.find((d) => normalizeTeamName(d.fullName) === t) ?? directory.find((d) => d.key && normalizeTeamName(d.key) === t);
  // Tier order: 1) real full-name/key match against the exact provider
  // string. 2) only for WNBA, and only when tier 1 found nothing, the same
  // match retried against the one known real alias shape above — never
  // reached at all for any other sport (sport !== "wnba" short-circuits).
  const aliasTarget = sport === "wnba" ? stripKnownWnbaSuffix(target) : null;
  const identity = findIdentity(target) ?? (aliasTarget ? findIdentity(aliasTarget) : undefined);
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

/** Distinguishes WHY a roster call came back with no players — the member-
 *  facing gap this closes: "our plan can't ask for this" (plan_restricted)
 *  looked identical to "the provider genuinely has nothing" (empty) before
 *  this existed, both collapsing to the same silent []. `hit` covers a real
 *  roster from any tier (or a merge across tiers) — see RosterResult.sources
 *  for which one(s) actually contributed. `not_supported` is for a team with
 *  no resolvable id at all (nothing to even ask a provider for) or a sport
 *  API-Sports doesn't cover. */
export type RosterStatus = "hit" | "empty" | "plan_restricted" | "error" | "not_supported";

/** Which real source(s) contributed to a roster response — never inferred,
 *  always exactly the tiers that returned usable data for THIS response.
 *  More than one entry means Tier 1 supplied real player identity and a
 *  later tier genuinely filled in fields Tier 1 was missing (see
 *  mergeRosterPlayerFields) — not that a later tier replaced Tier 1. */
export type RosterSourceTier = "api-sports" | "sportsdataio" | "openai_web_search";

export interface RosterResult {
  players: SportsRosterPlayer[];
  status: RosterStatus;
  /** Only ever the real provider-reported plan/subscription message — never
   *  set for any other status. Route handlers must keep this out of the
   *  member-facing response (see team-roster/route.ts); it's for owner/admin
   *  diagnostics only. */
  planRestrictedReason?: string;
  /** Set only when at least one field in this roster was resolved through
   *  the OpenAI web_search fallback (see openai-resolver.ts) — whether that
   *  tier supplied the whole roster or only enriched missing fields on an
   *  otherwise real Tier 1/2 roster. Never set when OpenAI contributed
   *  nothing. Route handlers surface this so the citation can be shown; see
   *  team-roster/route.ts and TeamRosterPanel.tsx. */
  provenance?: SportsDataProvenance;
  /** Real source attribution for this response — see RosterSourceTier.
   *  Always present once at least one tier was actually reached; absent
   *  only for the trivial "no team id at all" early return, which never
   *  asked any provider anything. */
  sources?: RosterSourceTier[];
  /** TEMPORARY DIAGNOSTIC FIELD — a real, per-tier trace of exactly what
   *  happened on THIS call, captured inline as each tier actually executes
   *  (never a separate/duplicated pipeline, so it can never diverge from
   *  the real players/status/sources above). Always computed (cheap — no
   *  extra provider calls) but only ever surfaced to the Owner; route
   *  handlers/pages must keep this out of the member-facing response, same
   *  discipline as planRestrictedReason. Exists to answer "was this tier
   *  even attempted, and what did it actually return" without needing a
   *  live debugger session — remove once the roster pipeline's live
   *  behavior is fully understood and any real defects it surfaces are
   *  fixed. See CLAUDE.md §17. */
  diagnostic?: RosterPipelineDiagnostic;
}

/** One tier's real, observed outcome for a single getTeamRoster call —
 *  never a guess, never fabricated: `attempted` is only true when this
 *  tier's own network/provider call actually ran; `allowed` distinguishes
 *  "the caller's gate was closed" (allowed: false, attempted: false) from
 *  "the gate was open but the tier had nothing" (allowed: true, attempted:
 *  false, e.g. Tier 1 already fully complete) from "the gate was open and
 *  this tier actually ran" (attempted: true). `playerCount` is always the
 *  real length of whatever this tier itself returned, never the merged
 *  running total. */
export interface RosterTierDiagnosticStep {
  allowed: boolean;
  attempted: boolean;
  outcome: "hit" | "empty" | "error" | "plan_restricted" | "not_attempted";
  playerCount: number;
}

/** TEMPORARY DIAGNOSTIC TYPE — see RosterResult.diagnostic's doc comment.
 *  season/apiSportsConfigured are captured once, at Tier 1, since they're
 *  real values already computed there — never recomputed a second time
 *  for the diagnostic alone. */
export interface RosterPipelineDiagnostic {
  sport: SportSlug;
  teamExternalId: string;
  season: string;
  apiSportsConfigured: boolean;
  tier1: RosterTierDiagnosticStep;
  tier2: RosterTierDiagnosticStep;
  tier3: RosterTierDiagnosticStep;
  finalStatus: RosterStatus;
  finalSources: RosterSourceTier[];
  finalPlayerCount: number;
}

/** True when a real roster player is still missing a field a later tier
 *  could legitimately fill — the trigger for attempting Tier 2/3
 *  enrichment even though Tier 1 already returned real players. Scoped to
 *  position/number (the fields the Owner-reported gap was actually about,
 *  and the fields every tier can realistically supply) — deliberately NOT
 *  triggered by a missing photoUrl alone, which is common and would
 *  otherwise force an extra provider call on nearly every roster fetch
 *  (cost-aware, see CLAUDE.md §18); a photo is still opportunistically
 *  filled by mergeRosterPlayerFields whenever a supplement call happens
 *  for position/number reasons anyway. Exported for tests. */
export function playerNeedsEnrichment(p: SportsRosterPlayer): boolean {
  return p.position === undefined || p.number === undefined;
}

/** The field-level completeness fix: merges REAL fields from `supplement`
 *  into `base` for players that already exist in `base` — never adds a
 *  player `base` doesn't have, never removes one, and never overwrites a
 *  field `base` already has a real value for. This is what lets Tier 1
 *  (whichever provider answered first) keep real identity/roster
 *  membership while a later tier only fills in what Tier 1's own response
 *  was missing (e.g. API-Sports had name+id but no position for some
 *  players; SportsDataIO's directory has the missing positions) — the
 *  fix for "some players have a position, others don't," which the old
 *  roster-level "any nonzero list wins" logic could never close (a partial
 *  Tier 1 hit used to skip every later tier entirely, even though those
 *  tiers might have had exactly the missing fields).
 *
 *  Players are matched by real, provider-reported name only — normalized
 *  via normalizePlayerName (never a fuzzy/substring match) — since the two
 *  providers use different id spaces with no shared key. An unmatched
 *  supplement player is simply not used (this never adds a name Tier 1
 *  doesn't already know about). Returns the SAME array reference when
 *  nothing actually changed, so callers can detect a real merge with a
 *  plain reference check (same idiom as mergeCatalogWithPriorSeason
 *  above). Exported for tests. */
export function mergeRosterPlayerFields(base: SportsRosterPlayer[], supplement: SportsRosterPlayer[]): SportsRosterPlayer[] {
  if (!supplement.length) return base;
  const supplementByName = new Map<string, SportsRosterPlayer>();
  for (const s of supplement) {
    const key = normalizePlayerName(s.name);
    if (!supplementByName.has(key)) supplementByName.set(key, s);
  }
  let changed = false;
  const merged = base.map((p) => {
    const match = supplementByName.get(normalizePlayerName(p.name));
    if (!match) return p;
    const position = p.position ?? match.position;
    const number = p.number ?? match.number;
    const photoUrl = p.photoUrl ?? match.photoUrl;
    if (position === p.position && number === p.number && photoUrl === p.photoUrl) return p;
    changed = true;
    return { ...p, position, number, photoUrl };
  });
  return changed ? merged : base;
}

/** A team's real, CURRENT-season roster — we can't show injuries (not part
 *  of the connected API-Sports plan), so this is the honest substitute:
 *  real players, real jersey numbers/positions, straight from the
 *  provider(s). Never invents a name, never presents a prior season's
 *  roster as the current one (see the module-level notes on the shared
 *  roster architecture fix — a roster's real membership can genuinely
 *  differ season to season, unlike team identity, so there is deliberately
 *  no previous-season retry here the way getStandingsWithOffSeasonFallback/
 *  getLeagueTeamCatalogWithOffSeasonFallback have for standings/catalogs).
 *
 *  Field-aware across tiers (the shared fix for the Owner-reported "some
 *  players have a position, others don't" gap): Tier 1 (API-Sports) sets
 *  the real roster identity; Tier 2 (SportsDataIO, gated by
 *  `allowSecondarySource` — see getRosterFromSportsData's doc comment for
 *  why this one's gated more cautiously than the schedule/standings
 *  fallbacks) and Tier 3 (OpenAI verified web_search, gated by
 *  `allowOpenAiFallback`, and only for a league with a real trusted-domain
 *  policy — see openai-resolver.ts) are each attempted whenever Tier 1 (or
 *  whatever ran before them) either has NOTHING or has real players still
 *  missing position/number — never only when the prior tier was totally
 *  empty. A later tier only FILLS missing fields on players Tier 1 already
 *  identified (see mergeRosterPlayerFields) — it never overwrites a real
 *  Tier 1 value, and never adds a player Tier 1 doesn't already know about.
 *
 *  Always returns a `status` alongside the players so a plan restriction
 *  can never be silently rendered as "this team just has no roster" — see
 *  RosterStatus above. A plan-restricted response is never cached (same
 *  "don't cache an outage" discipline as getGamesByDate). */
export async function getTeamRoster(
  sport: SportSlug,
  teamExternalId: string,
  opts?: { teamName?: string; allowSecondarySource?: boolean; allowOpenAiFallback?: boolean },
): Promise<RosterResult> {
  if (!teamExternalId) return { players: [], status: "not_supported" };

  let status: RosterStatus = "not_supported";
  let planRestrictedReason: string | undefined;
  let base: SportsRosterPlayer[] | null = null;
  let provenance: SportsDataProvenance | undefined;
  const sources: RosterSourceTier[] = [];

  const season = seasonParam(sport, new Date().toISOString());
  const apiSportsConfigured = ApiSportsProvider.isConfigured(sport);
  const tier1: RosterTierDiagnosticStep = { allowed: apiSportsConfigured, attempted: false, outcome: "not_attempted", playerCount: 0 };
  const tier2: RosterTierDiagnosticStep = { allowed: false, attempted: false, outcome: "not_attempted", playerCount: 0 };
  const tier3: RosterTierDiagnosticStep = { allowed: false, attempted: false, outcome: "not_attempted", playerCount: 0 };

  if (apiSportsConfigured) {
    tier1.attempted = true;
    let restriction: string | undefined;
    const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, season, team: teamExternalId, kind: "roster" }), TTL_ROSTER, async () => {
      const result = await fetchTeamRoster(sport, teamExternalId, season);
      if (result?.planRestricted) {
        restriction = result.planRestricted;
        return null;
      }
      return result;
    });
    if (cached?.data?.players.length) {
      base = cached.data.players;
      sources.push("api-sports");
      tier1.outcome = "hit";
      tier1.playerCount = base.length;
    } else {
      status = restriction ? "plan_restricted" : cached?.data ? "empty" : "error";
      planRestrictedReason = restriction;
      tier1.outcome = status === "plan_restricted" ? "plan_restricted" : status === "empty" ? "empty" : "error";
    }
  }

  // Tier 2: SportsDataIO — attempted whenever Tier 1 has nothing yet, OR
  // has real players still missing a field it can supply (never only on a
  // fully-empty Tier 1, which was the old, insufficient "roster-level hit"
  // check). When Tier 1 already has a real roster, this only ever FILLS
  // missing fields (see mergeRosterPlayerFields) — Tier 1's own real
  // identity/roster membership is never replaced.
  tier2.allowed = Boolean(sdioLeagueFor(sport)) && Boolean(opts?.allowSecondarySource) && Boolean(opts?.teamName);
  if (tier2.allowed && (base === null || base.some(playerNeedsEnrichment))) {
    tier2.attempted = true;
    const secondary = await getRosterFromSportsData(sport, opts!.teamName!);
    tier2.playerCount = secondary.length;
    tier2.outcome = secondary.length ? "hit" : "empty";
    if (secondary.length) {
      if (base) {
        const merged = mergeRosterPlayerFields(base, secondary);
        if (merged !== base) {
          base = merged;
          sources.push("sportsdataio");
        }
      } else {
        base = secondary;
        sources.push("sportsdataio");
      }
    }
  }

  // Tier 3+4 of the Verified Sports Data Source Ladder — same
  // fills-missing-fields-only discipline as Tier 2. resolveRosterViaOpenAI
  // is the single source of truth for which leagues have a real,
  // reviewed trusted-domain policy (see openai-resolver.ts's
  // ROSTER_RESOLVER_LEAGUES) — it returns null immediately, before any
  // network call, for an unsupported league (e.g. ncaaf today), so this
  // call site needs no sport-specific gate of its own. Owner-gated at the
  // route level (see team-roster/route.ts) pending live verification
  // against a real OpenAI account before broader member exposure.
  tier3.allowed = Boolean(opts?.allowOpenAiFallback) && Boolean(opts?.teamName);
  if (tier3.allowed && (base === null || base.some(playerNeedsEnrichment))) {
    tier3.attempted = true;
    const resolved = await resolveRosterViaOpenAI(sport, opts!.teamName!);
    tier3.playerCount = resolved?.players.length ?? 0;
    tier3.outcome = resolved?.players.length ? "hit" : "empty";
    if (resolved?.players.length) {
      const openAiPlayers: SportsRosterPlayer[] = resolved.players.map((p) => ({
        // No real provider id exists for an OpenAI-resolved player — a
        // stable, deterministic synthetic id (never a random one, so it
        // stays the same across cache hits/re-renders) rather than an
        // invented provider id that could be mistaken for a real one.
        id: `openai:${sport}:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: p.name,
        position: p.position,
        number: p.number,
      }));
      if (base) {
        const merged = mergeRosterPlayerFields(base, openAiPlayers);
        if (merged !== base) {
          base = merged;
          sources.push("openai_web_search");
          provenance = resolved.provenance;
        }
      } else {
        base = openAiPlayers;
        sources.push("openai_web_search");
        provenance = resolved.provenance;
      }
    }
  }

  const diagnostic: RosterPipelineDiagnostic = {
    sport, teamExternalId, season, apiSportsConfigured, tier1, tier2, tier3,
    finalStatus: base && base.length ? "hit" : status,
    finalSources: sources,
    finalPlayerCount: base?.length ?? 0,
  };

  if (base && base.length) return { players: base, status: "hit", sources, diagnostic, ...(provenance ? { provenance } : {}) };
  return { players: [], status, planRestrictedReason, sources, diagnostic };
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

export interface FollowedTeamRef {
  followId: string;
  teamExternalId: string | null;
  teamName: string | null;
}

/** Generic per-item failure isolation for a batch of async lookups keyed by
 *  a followed team — the one place every applicable team-sport page's
 *  "resolve N followed teams' worth of optional data, without one bad team
 *  taking the others (or the page) down" goes through. A rejection from
 *  `fetchOne` for one team is caught and replaced with `onError`'s
 *  fallback for THAT team only — every other team's real result is
 *  unaffected, and the rejection never propagates past this call. Exported
 *  with its own direct unit tests (using a fake, controllable `fetchOne`)
 *  so the isolation itself is proven independent of any real provider. */
export async function resolveWithFailureIsolation<T, R>(teams: T[], fetchOne: (team: T) => Promise<R>, onError: (team: T) => R): Promise<R[]> {
  return Promise.all(teams.map((t) => fetchOne(t).catch(() => onError(t))));
}

/** Resolves EVERY followed team's roster in one batch, with PER-TEAM
 *  failure isolation via resolveWithFailureIsolation — the shared
 *  category-wide fix: any team-sport page driven by a member's followed
 *  teams (NFL, NBA, WNBA, CFB, MLB, NHL, ...) calls this once instead of
 *  hand-rolling its own Promise.all. A genuine provider "plan restricted"
 *  or "empty" result from getTeamRoster is never converted to "error" here
 *  — only an actual thrown rejection is; those real statuses pass through
 *  untouched. */
export async function resolveFollowedTeamRosters(sport: SportSlug, teams: FollowedTeamRef[], allowSecondarySource: boolean): Promise<Map<string, RosterResult>> {
  const results = await resolveWithFailureIsolation(
    teams,
    (t) => (t.teamExternalId ? getTeamRoster(sport, t.teamExternalId, { teamName: t.teamName ?? undefined, allowSecondarySource }) : Promise.resolve<RosterResult>({ players: [], status: "not_supported" })),
    (): RosterResult => ({ players: [], status: "error" })
  );
  const map = new Map<string, RosterResult>();
  teams.forEach((t, i) => map.set(t.followId, results[i]));
  return map;
}

/** Same per-team failure isolation for injury lookups — a provider outage
 *  on one team's injury feed degrades to [] for that team only, never a
 *  page-wide crash. */
export async function resolveFollowedTeamInjuries(sport: SportSlug, teams: FollowedTeamRef[]): Promise<Map<string, SdioInjury[]>> {
  const results = await resolveWithFailureIsolation(
    teams,
    (t) => (t.teamName ? getTeamInjuries(sport, t.teamName) : Promise.resolve([])),
    (): SdioInjury[] => []
  );
  const map = new Map<string, SdioInjury[]>();
  teams.forEach((t, i) => map.set(t.followId, results[i]));
  return map;
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

  // PER-SPORT failure isolation (resolveWithFailureIsolation, same helper
  // resolveFollowedTeamRosters uses) — a bare Promise.all here means one
  // sport's provider/cache/DB call throwing takes the whole landing page
  // down with it (every /dashboard/discovery visit calls this via
  // getCuratedForYou). A failed sport degrades to { games: [] } for that
  // sport only; every other sport's real games still render.
  const todayISO = new Date().toISOString().slice(0, 10);
  const today = (await resolveWithFailureIsolation(configured, (s) => getGamesByDate(s, todayISO), (): { games: SportsGameRow[] } => ({ games: [] }))).flatMap((r) => r.games);
  const live = today.filter((g) => g.status === "live").sort((a, b) => +a.startsAt - +b.startsAt).slice(0, limit);

  let upcoming = today.filter((g) => g.status === "scheduled").sort((a, b) => +a.startsAt - +b.startsAt);
  for (let daysOut = 1; daysOut <= 7 && upcoming.length < limit; daysOut++) {
    const dateISO = new Date(Date.now() + daysOut * 86_400_000).toISOString().slice(0, 10);
    const dayGames = (await resolveWithFailureIsolation(configured, (s) => getGamesByDate(s, dateISO), (): { games: SportsGameRow[] } => ({ games: [] }))).flatMap((r) => r.games);
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
  myConfidence: number | null;
  locked: boolean;
}

/** Games for a date, each paired with its vote tally and the viewer's own
 *  pick — what MatchupCard needs to render, in one call. `planRestricted`
 *  passes through from getGamesByDate — set only on a genuine provider
 *  plan/date restriction, never on a real "no games today."
 *
 *  When `dateISO` itself has no real games (and isn't plan-restricted),
 *  searches forward up to 7 real days — the exact same upcoming-games
 *  window the sport page's own "Next Games" panel already uses — so
 *  Magical Picks can never disagree with that panel about whether a real
 *  upcoming game exists. A member can pick a real scheduled game as soon
 *  as it's the soonest one found, not only on its exact kickoff day;
 *  isPickLocked (below) still governs the real locking deadline. */
export async function getGamesWithVoteContext(sport: SportSlug, dateISO: string, accountId: string, limit = 6): Promise<{ contexts: MatchupCardContext[]; planRestricted?: string }> {
  let { games: allGames, planRestricted } = await getGamesByDate(sport, dateISO);
  if (!allGames.length && !planRestricted) {
    for (let daysOut = 1; daysOut <= 7 && !allGames.length; daysOut++) {
      const nextDateISO = new Date(Date.now() + daysOut * 86_400_000).toISOString().slice(0, 10);
      const next = await getGamesByDate(sport, nextDateISO);
      if (next.games.length) {
        allGames = next.games;
        planRestricted = next.planRestricted;
      }
    }
  }
  const games = allGames.slice(0, limit);
  const contexts = await Promise.all(
    games.map(async (game) => {
      const picks = await prisma.sportsPick.findMany({ where: { gameId: game.id, pickType: "HEAD_TO_HEAD" }, select: { teamPick: true, accountId: true, isCorrect: true, confidence: true } });
      const typed = picks.map((p) => ({ ...p, teamPick: p.teamPick as "home" | "away" }));
      const mine = typed.find((p) => p.accountId === accountId);
      return { game, tally: tallyVotes(typed), myPick: mine?.teamPick ?? null, myPickCorrect: mine?.isCorrect ?? null, myConfidence: mine?.confidence ?? null, locked: isPickLocked(game) };
    })
  );
  return { contexts, planRestricted };
}

export async function getMatchup(gameId: string, accountId?: string): Promise<MatchupCardContext | null> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game) return null;
  const picks = await prisma.sportsPick.findMany({ where: { gameId, pickType: "HEAD_TO_HEAD" }, select: { teamPick: true, accountId: true, isCorrect: true, confidence: true } });
  const typedPicks = picks.map((p) => ({ ...p, teamPick: p.teamPick as "home" | "away" }));
  const tally = tallyVotes(typedPicks);
  const mine = accountId ? typedPicks.find((p) => p.accountId === accountId) : undefined;
  return { game, tally, myPick: mine?.teamPick ?? null, myPickCorrect: mine?.isCorrect ?? null, myConfidence: mine?.confidence ?? null, locked: isPickLocked(game) };
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

/** Real team-level box score stats for one game (NFL/NCAAF today — see
 *  fetchGameTeamStats). Cached like getLiveGameState: a final game's stats
 *  never change again so they're cached for a week; a live game's are
 *  refetched on the shortest TTL withCache supports. Returns null for any
 *  game this provider doesn't have a verified stats mapping for yet — never
 *  fabricates a stat line. */
export async function getGameTeamStats(gameId: string): Promise<TeamGameStats[] | null> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game || !game.externalId) return null;
  const sport = game.sport as SportSlug;
  const ttl = game.status === "final" ? TTL_GAME_BOX_SCORE_FINAL : TTL_GAME_BOX_SCORE_LIVE;
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, externalId: game.externalId, kind: "game_team_stats" }), ttl, () =>
    fetchGameTeamStats(sport, game.externalId!));
  return cached?.data ?? null;
}

/** Real player-level box score stats for one game (NFL/NCAAF today — see
 *  fetchGamePlayerStats). Same tiered cache policy as getGameTeamStats. */
export async function getGamePlayerStats(gameId: string): Promise<TeamPlayerGameStats[] | null> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game || !game.externalId) return null;
  const sport = game.sport as SportSlug;
  const ttl = game.status === "final" ? TTL_GAME_BOX_SCORE_FINAL : TTL_GAME_BOX_SCORE_LIVE;
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, externalId: game.externalId, kind: "game_player_stats" }), ttl, () =>
    fetchGamePlayerStats(sport, game.externalId!));
  return cached?.data ?? null;
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
        // f.league is whatever the follow form actually submitted (today,
        // no sport submits a league value — every sport's own static
        // SPORT_CONFIG default already covers it downstream). ncaabaseball
        // has no static default (see resolveDefaultLeagueId's doc comment),
        // so it's the one sport that needs an explicit resolved fallback
        // here rather than relying on that implicit default.
        const league = f.league || (sport === "ncaabaseball" ? await resolveDefaultLeagueId(sport) : undefined) || undefined;
        const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, team: f.teamExternalId, kind: "team_games" }), TTL_GAMES_UPCOMING, () =>
          ApiSportsProvider.gamesForTeam(sport, f.teamExternalId!, { league }));
        const games = cached?.data ?? [];
        const now = Date.now();
        upcoming = games.filter((g) => new Date(g.startsAt).getTime() >= now).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0] ?? null;
        recent = games.filter((g) => g.status === "final").sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt))[0] ?? null;
        if (games.length) localRows = await syncGamesToLocal(sport, league || "", games);
      }
      const localIdFor = (g: SportsGameSummary | null) => (g ? localRows.find((r) => r.externalId === g.externalId)?.id ?? null : null);
      return { follow: f, upcoming, upcomingLocalId: localIdFor(upcoming), recent, recentLocalId: localIdFor(recent) };
    })
  );
  return withGames;
}

/** Whether (and how) the viewer already follows this real team — the Team
 *  Detail page's Follow/Unfollow state. Returns null when not followed;
 *  never a guess at follow state. */
export async function getTeamFollow(accountId: string, sport: SportSlug, teamExternalId: string) {
  if (!teamExternalId) return null;
  return prisma.sportsFollow.findFirst({ where: { accountId, kind: "team", sport, teamExternalId } });
}

export interface TeamScheduleGame extends SportsGameSummary {
  /** The local SportsGame row's id for this real game — null only on the
   *  rare upsert failure, never fabricated. Used to link to a real Game
   *  Center; a null localId renders as plain (non-clickable) text instead. */
  localId: string | null;
}

/** Upcoming + recently completed real games for one team — the Team Detail
 *  page's schedule sections. Same underlying ApiSportsProvider.gamesForTeam
 *  call and cache key ("team_games") getMyTeams already uses for a followed
 *  team's own upcoming/recent games, so a page rendering both shares one
 *  cached fetch rather than issuing it twice. Every game is synced to the
 *  local SportsGame table exactly like getMyTeams does, so each one can
 *  link to a real Game Center. Returns { upcoming: [], recent: [] } when
 *  unconfigured, given no teamExternalId, or the provider genuinely has
 *  nothing for this team — never a fabricated schedule. */
export async function getTeamSchedule(sport: SportSlug, teamExternalId: string, league?: string): Promise<{ upcoming: TeamScheduleGame[]; recent: TeamScheduleGame[] }> {
  if (!ApiSportsProvider.isConfigured(sport) || !teamExternalId) return { upcoming: [], recent: [] };
  const lg = league || defaultLeagueId(sport);
  const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, team: teamExternalId, kind: "team_games" }), TTL_GAMES_UPCOMING, () =>
    ApiSportsProvider.gamesForTeam(sport, teamExternalId, { league: lg }));
  const games = cached?.data ?? [];
  if (!games.length) return { upcoming: [], recent: [] };
  const localRows = await syncGamesToLocal(sport, lg || games[0]?.league || "", games);
  const localIdFor = (externalId: string) => localRows.find((r) => r.externalId === externalId)?.id ?? null;
  const now = Date.now();
  const upcoming = games
    .filter((g) => g.status !== "final" && new Date(g.startsAt).getTime() >= now)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .map((g) => ({ ...g, localId: localIdFor(g.externalId) }));
  const recent = games
    .filter((g) => g.status === "final")
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt))
    .map((g) => ({ ...g, localId: localIdFor(g.externalId) }));
  return { upcoming, recent };
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
    const rosterMap = await getLeagueTeamRosterMap(sport);
    const resolvedStandings = await Promise.all(result.standings.map(async (s) => {
      const resolved = rosterMap ? rosterMap.get(normalizeTeamName(s.team.name)) ?? null : await resolveTeamByName(sport, s.team.name);
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

  // Even on a genuinely empty result, surface the real season string this
  // call actually queried with (never a separately-guessed "current"
  // season) — so an honest empty-state message can name it (e.g.
  // "Standings aren't available for the 2026 WNBA season yet") instead of a
  // bare, unspecific blank panel.
  return { standings: [], planRestricted: restriction, season: cached?.data.season ?? season ?? seasonParam(sport, new Date().toISOString()) };
}

/** Standings for a sport's default league, with an off-season fallback: when
 *  the CURRENT season (whatever seasonParam() resolves for right now) has
 *  nothing posted yet — a new season that hasn't started, or one whose
 *  schedule simply isn't published yet — this retries with the last REAL
 *  completed season (previousSeasonParam) instead of leaving the Standings
 *  panel blank. This is the off-season equivalent, for every sport WITHOUT a
 *  VERIFIED_REFERENCE, of the "show the last known real state, not a blank
 *  panel" instinct NBA/NFL already get from their own verified conference/
 *  division reference (see team-directory.ts's hasVerifiedReference /
 *  getVerifiedStandingsFallback) — callers should keep using the existing
 *  getStandings + getVerifiedStandingsFallback pair for NBA/NFL and use this
 *  for everything else (NHL, MLB, WNBA, college sports, soccer, rugby,
 *  volleyball).
 *
 *  Only retries when `isOffSeasonPhase` is true — the caller's own real
 *  dated-openers check (determineSeasonPhase() === "preseason", which
 *  already covers both "before this season's real opener" and "we don't
 *  have this season's schedule at all"). A genuine mid-season empty result
 *  is returned as-is, never silently swapped for last year's table — that
 *  would misrepresent the CURRENT season as having no data when the real
 *  issue might be a provider hiccup or plan restriction (also passed
 *  through untouched, so the page keeps showing its own honest message for
 *  that case rather than this fallback masking it). Returns the prior
 *  season's real result (including its own `season` string, so the caller's
 *  season label is automatically correct) only when it actually has rows;
 *  otherwise returns the current (empty) result unchanged — never fabricates
 *  a season that also has nothing. */
export async function getStandingsWithOffSeasonFallback(sport: SportSlug, league: string, isOffSeasonPhase: boolean): Promise<{ standings: SportsStanding[]; planRestricted?: string; season?: string }> {
  const current = await getStandings(sport, league);
  if (current.standings.length || current.planRestricted || !isOffSeasonPhase) return current;
  const priorSeason = previousSeasonParam(sport, new Date().toISOString());
  const prior = await getStandings(sport, league, priorSeason).catch(() => null);
  return prior?.standings.length ? prior : current;
}

export interface NflPlayoffPictureSeed {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
  isDivisionWinner: boolean;
  clinched: boolean;
  /** Real current record — added for the Playoff Bracket's team cards
   *  (bracket.ts's NflBracketSeedInput). Existing callers of this function
   *  that only read the fields above are unaffected. */
  wins: number;
  losses: number;
  ties?: number;
}

/** "IF THE PLAYOFFS STARTED TODAY" for one NFL conference — real, current
 *  standings run through the PostseasonRuleEngine's NFL seed projector
 *  (postseason.ts). Never presented as an official bracket; see that
 *  module's own disclosed limitation (no division tiebreaker data). Returns
 *  null when this conference's standings aren't available (never a
 *  fabricated field). Also the source of real seed data for the Playoff
 *  Bracket (getNflPlayoffBracket below) — once the regular season ends,
 *  this same projector reorders the real FINAL standings into the real
 *  7-seed field with no more clinch/elimination ambiguity to disclose. */
export async function getNflPlayoffPicture(conference: "AFC" | "NFC", season?: string): Promise<NflPlayoffPictureSeed[] | null> {
  const { standings } = await getStandings("nfl", defaultLeagueId("nfl"), season);
  const teams = standings.filter(
    (s): s is SportsStanding & { wins: number; losses: number; division: string } =>
      s.group === conference && typeof s.wins === "number" && typeof s.losses === "number" && typeof s.division === "string"
  );
  if (!teams.length) return null;
  const seeds = projectNflConferenceSeeds(
    teams.map((t) => ({ teamId: t.team.id, wins: t.wins, losses: t.losses, ties: t.ties, division: t.division }))
  );
  const teamById = new Map(teams.map((t) => [t.team.id, t]));
  return seeds.map((s) => ({
    teamId: s.teamId,
    teamName: teamById.get(s.teamId)?.team.name ?? "Team",
    teamLogoUrl: teamById.get(s.teamId)?.team.logoUrl,
    seed: s.seed,
    isDivisionWinner: s.isDivisionWinner,
    clinched: s.clinched,
    wins: teamById.get(s.teamId)?.wins ?? 0,
    losses: teamById.get(s.teamId)?.losses ?? 0,
    ties: teamById.get(s.teamId)?.ties,
  }));
}

/** THE PROJECTED -> OFFICIAL TRANSITION SIGNAL for the NFL Playoff Bracket:
 *  a real postseason game existing for this season, i.e.
 *  getFirstPostseasonGame("nfl", ...) !== null (exactly the same real,
 *  provider-stage-label-based check the sport page already uses to detect
 *  postseason — see [sport]/page.tsx's `firstPostseasonGame` and
 *  standings.ts's determineSeasonPhase). This deliberately fires the moment
 *  the provider POSTS the postseason schedule (typically right after the
 *  regular season ends, before Wild Card weekend actually kicks off) rather
 *  than waiting for kickoff — a real, useful bracket a day earlier is
 *  strictly better than an artificially-delayed one, and it's still exactly
 *  "a real postseason game exists," never a guessed date.
 *
 *  A second sport's own getXPlayoffBracket should key its own mode off this
 *  exact same check — getFirstPostseasonGame(sport, ...) !== null — for the
 *  same reason. */
export async function getNflPlayoffBracket(season?: string): Promise<BracketData | null> {
  const league = defaultLeagueId("nfl");
  const [afc, nfc, firstPostseasonGame] = await Promise.all([
    getNflPlayoffPicture("AFC", season),
    getNflPlayoffPicture("NFC", season),
    getFirstPostseasonGame("nfl", league || undefined),
  ]);
  if (!afc?.length || !nfc?.length) return null;

  const mode: BracketData["mode"] = firstPostseasonGame ? "official" : "projected";
  const seasonLabel = season?.slice(0, 4) ?? String(new Date(firstPostseasonGame?.startsAt ?? new Date()).getUTCFullYear());

  let postseasonGames: NflBracketRealGame[] = [];
  if (mode === "official") {
    const seasonQuery = season ?? seasonParam("nfl", new Date().toISOString());
    const seasonGames = await fetchSeasonGames("nfl", seasonQuery, league || undefined);
    const real = (seasonGames ?? []).filter((g) => g.stage && /post.?season|play.?offs?|championship|bowl/i.test(g.stage));
    // Sync every real postseason game into the local SportsGame table (same
    // upsert every other games call already goes through) so each bracket
    // card can link to a real Game Center, and a FINAL one is graded like
    // any other game.
    const synced = real.length ? await syncGamesToLocal("nfl", league, real) : [];
    const localIdByExternalId = new Map(synced.map((r) => [r.externalId, r.id]));
    postseasonGames = real.map((g) => ({
      externalId: g.externalId,
      gameId: localIdByExternalId.get(g.externalId) ?? null,
      stage: g.stage ?? "",
      status: g.status,
      startsAt: g.startsAt,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));
  }

  return buildNflBracketData({
    seasonLabel,
    mode,
    afcSeeds: afc,
    nfcSeeds: nfc,
    postseasonGames,
  });
}

export interface MlbPlayoffPictureSeed {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
  isDivisionWinner: boolean;
  clinched: boolean;
  /** Real current record — added for the Playoff Bracket's team cards
   *  (bracket.ts's MlbBracketSeedInput), same reason NflPlayoffPictureSeed
   *  was extended. Existing callers that only read the fields above are
   *  unaffected. */
  wins: number;
  losses: number;
  ties?: number;
}

/** "IF THE PLAYOFFS STARTED TODAY" for one MLB league (AL/NL) — the real
 *  3-division-winners-plus-3-wild-cards field. Same disclosed no-
 *  tiebreaker limitation as getNflPlayoffPicture. */
export async function getMlbPlayoffPicture(league: "AL" | "NL", season?: string): Promise<MlbPlayoffPictureSeed[] | null> {
  const { standings } = await getStandings("mlb", defaultLeagueId("mlb"), season);
  const teams = standings.filter(
    (s): s is SportsStanding & { wins: number; losses: number; division: string } =>
      s.group === league && typeof s.wins === "number" && typeof s.losses === "number" && typeof s.division === "string"
  );
  if (!teams.length) return null;
  const seeds = projectMlbLeagueSeeds(
    teams.map((t) => ({ teamId: t.team.id, wins: t.wins, losses: t.losses, ties: t.ties, division: t.division }))
  );
  const teamById = new Map(teams.map((t) => [t.team.id, t]));
  return seeds.map((s) => ({
    teamId: s.teamId,
    teamName: teamById.get(s.teamId)?.team.name ?? "Team",
    teamLogoUrl: teamById.get(s.teamId)?.team.logoUrl,
    seed: s.seed,
    isDivisionWinner: s.isDivisionWinner,
    clinched: s.clinched,
    wins: teamById.get(s.teamId)?.wins ?? 0,
    losses: teamById.get(s.teamId)?.losses ?? 0,
    ties: teamById.get(s.teamId)?.ties,
  }));
}

/** THE PROJECTED -> OFFICIAL TRANSITION SIGNAL for the MLB Playoff Bracket —
 *  same exact real signal as getNflPlayoffBracket: a real postseason game
 *  existing for this season (getFirstPostseasonGame("mlb", ...) !== null).
 *  See that function's own doc comment for why. */
export async function getMlbPlayoffBracket(season?: string): Promise<BracketData | null> {
  const league = defaultLeagueId("mlb");
  const [al, nl, firstPostseasonGame] = await Promise.all([
    getMlbPlayoffPicture("AL", season),
    getMlbPlayoffPicture("NL", season),
    getFirstPostseasonGame("mlb", league || undefined),
  ]);
  if (!al?.length || !nl?.length) return null;

  const mode: BracketData["mode"] = firstPostseasonGame ? "official" : "projected";
  const seasonLabel = season?.slice(0, 4) ?? String(new Date(firstPostseasonGame?.startsAt ?? new Date()).getUTCFullYear());

  let postseasonGames: MlbBracketRealGame[] = [];
  if (mode === "official") {
    const seasonQuery = season ?? seasonParam("mlb", new Date().toISOString());
    const seasonGames = await fetchSeasonGames("mlb", seasonQuery, league || undefined);
    const real = (seasonGames ?? []).filter((g) => g.stage && /post.?season|play.?offs?|championship|bowl/i.test(g.stage));
    const synced = real.length ? await syncGamesToLocal("mlb", league, real) : [];
    const localIdByExternalId = new Map(synced.map((r) => [r.externalId, r.id]));
    postseasonGames = real.map((g) => ({
      externalId: g.externalId,
      gameId: localIdByExternalId.get(g.externalId) ?? null,
      stage: g.stage ?? "",
      status: g.status,
      startsAt: g.startsAt,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));
  }

  return buildMlbBracketData({ seasonLabel, mode, alSeeds: al, nlSeeds: nl, postseasonGames });
}

export interface NhlPlayoffPictureSeed {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
  isTopThreeInDivision: boolean;
  clinched: boolean;
  /** Real current record — added for the Playoff Bracket's team cards
   *  (bracket.ts's NhlBracketSeedInput), same reason NflPlayoffPictureSeed
   *  was extended. Existing callers that only read the fields above are
   *  unaffected. */
  wins: number;
  losses: number;
  ties?: number;
}

/** "IF THE PLAYOFFS STARTED TODAY" for one NHL conference — the real top-3-
 *  per-division-plus-2-wild-cards field. See projectNhlConferenceSeeds'
 *  own disclosed limitation on lopsided-division seed ordering, on top of
 *  the shared no-tiebreaker one. */
export async function getNhlPlayoffPicture(conference: "Eastern" | "Western", season?: string): Promise<NhlPlayoffPictureSeed[] | null> {
  const { standings } = await getStandings("nhl", defaultLeagueId("nhl"), season);
  const teams = standings.filter(
    (s): s is SportsStanding & { wins: number; losses: number; division: string } =>
      s.group === conference && typeof s.wins === "number" && typeof s.losses === "number" && typeof s.division === "string"
  );
  if (!teams.length) return null;
  const seeds = projectNhlConferenceSeeds(
    teams.map((t) => ({ teamId: t.team.id, wins: t.wins, losses: t.losses, ties: t.ties, division: t.division }))
  );
  const teamById = new Map(teams.map((t) => [t.team.id, t]));
  return seeds.map((s) => ({
    teamId: s.teamId,
    teamName: teamById.get(s.teamId)?.team.name ?? "Team",
    teamLogoUrl: teamById.get(s.teamId)?.team.logoUrl,
    seed: s.seed,
    isTopThreeInDivision: s.isTopThreeInDivision,
    clinched: s.clinched,
    wins: teamById.get(s.teamId)?.wins ?? 0,
    losses: teamById.get(s.teamId)?.losses ?? 0,
    ties: teamById.get(s.teamId)?.ties,
  }));
}

/** THE PROJECTED -> OFFICIAL TRANSITION SIGNAL for the NHL Playoff Bracket —
 *  same exact real signal as getNflPlayoffBracket: a real postseason game
 *  existing for this season (getFirstPostseasonGame("nhl", ...) !== null).
 *  See that function's own doc comment for why. */
export async function getNhlPlayoffBracket(season?: string): Promise<BracketData | null> {
  const league = defaultLeagueId("nhl");
  const [east, west, firstPostseasonGame] = await Promise.all([
    getNhlPlayoffPicture("Eastern", season),
    getNhlPlayoffPicture("Western", season),
    getFirstPostseasonGame("nhl", league || undefined),
  ]);
  if (!east?.length || !west?.length) return null;

  const mode: BracketData["mode"] = firstPostseasonGame ? "official" : "projected";
  const seasonLabel = season?.slice(0, 4) ?? String(new Date(firstPostseasonGame?.startsAt ?? new Date()).getUTCFullYear());

  let postseasonGames: NhlBracketRealGame[] = [];
  if (mode === "official") {
    const seasonQuery = season ?? seasonParam("nhl", new Date().toISOString());
    const seasonGames = await fetchSeasonGames("nhl", seasonQuery, league || undefined);
    const real = (seasonGames ?? []).filter((g) => g.stage && /post.?season|play.?offs?|championship|bowl/i.test(g.stage));
    const synced = real.length ? await syncGamesToLocal("nhl", league, real) : [];
    const localIdByExternalId = new Map(synced.map((r) => [r.externalId, r.id]));
    postseasonGames = real.map((g) => ({
      externalId: g.externalId,
      gameId: localIdByExternalId.get(g.externalId) ?? null,
      stage: g.stage ?? "",
      status: g.status,
      startsAt: g.startsAt,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));
  }

  return buildNhlBracketData({ seasonLabel, mode, eastSeeds: east, westSeeds: west, postseasonGames });
}

export interface NbaPlayoffPictureEntry {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
  status: "DIRECT_BERTH" | "PLAY_IN" | "OUTSIDE";
  clinched: boolean;
  /** Real current record — added for the Playoff Bracket's team cards
   *  (bracket.ts's NbaBracketSeedInput), same reason NflPlayoffPictureSeed
   *  was extended. Existing callers that only read the fields above are
   *  unaffected. */
  wins: number;
  losses: number;
}

/** "IF THE PLAYOFFS STARTED TODAY" for one NBA conference — real seeds 1-6
 *  direct, 7-10 Play-In picture, 11+ outside. The real Play-In GAMES
 *  themselves are an official-bracket concern (see #188), not a projection. */
export async function getNbaPlayoffPicture(conference: "Eastern" | "Western", season?: string): Promise<NbaPlayoffPictureEntry[] | null> {
  const { standings } = await getStandings("nba", defaultLeagueId("nba"), season);
  const teams = standings.filter(
    (s): s is SportsStanding & { wins: number; losses: number } => s.group === conference && typeof s.wins === "number" && typeof s.losses === "number"
  );
  if (!teams.length) return null;
  const picture = projectNbaConferencePicture(teams.map((t) => ({ teamId: t.team.id, wins: t.wins, losses: t.losses })));
  const teamById = new Map(teams.map((t) => [t.team.id, t]));
  return picture.map((p) => ({
    teamId: p.teamId,
    teamName: teamById.get(p.teamId)?.team.name ?? "Team",
    teamLogoUrl: teamById.get(p.teamId)?.team.logoUrl,
    seed: p.seed,
    status: p.status,
    clinched: p.clinched,
    wins: teamById.get(p.teamId)?.wins ?? 0,
    losses: teamById.get(p.teamId)?.losses ?? 0,
  }));
}

/** THE PROJECTED -> OFFICIAL TRANSITION SIGNAL for the NBA Playoff Bracket —
 *  same exact real signal as getNflPlayoffBracket: a real postseason game
 *  existing for this season (getFirstPostseasonGame("nba", ...) !== null).
 *  See that function's own doc comment for why. */
export async function getNbaPlayoffBracket(season?: string): Promise<BracketData | null> {
  const league = defaultLeagueId("nba");
  const [east, west, firstPostseasonGame] = await Promise.all([
    getNbaPlayoffPicture("Eastern", season),
    getNbaPlayoffPicture("Western", season),
    getFirstPostseasonGame("nba", league || undefined),
  ]);
  if (!east?.length || !west?.length) return null;

  const mode: BracketData["mode"] = firstPostseasonGame ? "official" : "projected";
  const seasonLabel = season?.slice(0, 4) ?? String(new Date(firstPostseasonGame?.startsAt ?? new Date()).getUTCFullYear());

  let postseasonGames: NbaBracketRealGame[] = [];
  if (mode === "official") {
    const seasonQuery = season ?? seasonParam("nba", new Date().toISOString());
    const seasonGames = await fetchSeasonGames("nba", seasonQuery, league || undefined);
    const real = (seasonGames ?? []).filter((g) => g.stage && /post.?season|play.?offs?|championship|bowl/i.test(g.stage));
    const synced = real.length ? await syncGamesToLocal("nba", league, real) : [];
    const localIdByExternalId = new Map(synced.map((r) => [r.externalId, r.id]));
    postseasonGames = real.map((g) => ({
      externalId: g.externalId,
      gameId: localIdByExternalId.get(g.externalId) ?? null,
      stage: g.stage ?? "",
      status: g.status,
      startsAt: g.startsAt,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));
  }

  return buildNbaBracketData({ seasonLabel, mode, eastSeeds: east, westSeeds: west, postseasonGames });
}

export interface WnbaPlayoffPictureEntry {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  /** 1-based rank by real current wins — computePostseasonPicture's own
   *  `ranked` order, exposed here (additive) so the Playoff Bracket can
   *  seed its real top-8 field the same way every other sport's bracket
   *  seeds off a `seed` number. Not itself an official seed once the real
   *  postseason starts — same disclosed no-tiebreaker limitation as every
   *  other projector in this file. */
  seed: number;
  inField: boolean;
  clinched: boolean;
  /** Real current record — added for the Playoff Bracket's team cards
   *  (bracket.ts's WnbaBracketSeedInput), same reason NflPlayoffPictureSeed
   *  was extended. Existing callers that only read the fields above are
   *  unaffected. */
  wins: number;
  losses: number;
  ties?: number;
}

/** WNBA has no conference split — one league-wide table, real top-8 field,
 *  no Play-In tournament (unlike the NBA). Uses the shared
 *  computePostseasonPicture rather than a conference-specific adapter. */
export async function getWnbaPlayoffPicture(season?: string): Promise<WnbaPlayoffPictureEntry[] | null> {
  const { standings } = await getStandings("wnba", defaultLeagueId("wnba"), season);
  const teams = standings.filter((s): s is SportsStanding & { wins: number; losses: number } => typeof s.wins === "number" && typeof s.losses === "number");
  if (!teams.length) return null;
  const picture = computePostseasonPicture("wnba", teams.map((t) => ({ teamId: t.team.id, wins: t.wins, losses: t.losses, ties: t.ties })), 8);
  const teamById = new Map(teams.map((t) => [t.team.id, t]));
  return picture.map((p, i) => ({
    teamId: p.teamId,
    teamName: teamById.get(p.teamId)?.team.name ?? "Team",
    teamLogoUrl: teamById.get(p.teamId)?.team.logoUrl,
    seed: i + 1,
    inField: p.inField,
    clinched: p.clinched,
    wins: teamById.get(p.teamId)?.wins ?? 0,
    losses: teamById.get(p.teamId)?.losses ?? 0,
    ties: teamById.get(p.teamId)?.ties,
  }));
}

/** THE PROJECTED -> OFFICIAL TRANSITION SIGNAL for the WNBA Playoff
 *  Bracket — same exact real signal as getNflPlayoffBracket: a real
 *  postseason game existing for this season
 *  (getFirstPostseasonGame("wnba", ...) !== null). See that function's own
 *  doc comment for why. WNBA has no conference split, so there's only one
 *  picture call here (unlike NFL/NBA/MLB/NHL's two parallel calls). */
export async function getWnbaPlayoffBracket(season?: string): Promise<BracketData | null> {
  const league = defaultLeagueId("wnba");
  const [field, firstPostseasonGame] = await Promise.all([
    getWnbaPlayoffPicture(season),
    getFirstPostseasonGame("wnba", league || undefined),
  ]);
  if (!field?.length) return null;
  const seeds = field.filter((f) => f.inField); // real bracket only ever seats the top-8 field

  const mode: BracketData["mode"] = firstPostseasonGame ? "official" : "projected";
  const seasonLabel = season?.slice(0, 4) ?? String(new Date(firstPostseasonGame?.startsAt ?? new Date()).getUTCFullYear());

  let postseasonGames: WnbaBracketRealGame[] = [];
  if (mode === "official") {
    const seasonQuery = season ?? seasonParam("wnba", new Date().toISOString());
    const seasonGames = await fetchSeasonGames("wnba", seasonQuery, league || undefined);
    const real = (seasonGames ?? []).filter((g) => g.stage && /post.?season|play.?offs?|championship|bowl/i.test(g.stage));
    const synced = real.length ? await syncGamesToLocal("wnba", league, real) : [];
    const localIdByExternalId = new Map(synced.map((r) => [r.externalId, r.id]));
    postseasonGames = real.map((g) => ({
      externalId: g.externalId,
      gameId: localIdByExternalId.get(g.externalId) ?? null,
      stage: g.stage ?? "",
      status: g.status,
      startsAt: g.startsAt,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));
  }

  return buildWnbaBracketData({ seasonLabel, mode, seeds, postseasonGames });
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

export async function submitPick(accountId: string, gameId: string, teamPick: "home" | "away", confidence?: number | null) {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Matchup not found");
  if (game.eventType !== "HEAD_TO_HEAD") throw new Error("This event doesn't take a home/away pick");
  if (isPickLocked(game)) throw new Error("Picks are locked for this matchup");
  const validConfidence = confidence != null && Number.isInteger(confidence) && confidence >= 1 && confidence <= 5 ? confidence : null;
  return prisma.sportsPick.upsert({
    where: { gameId_accountId: { gameId, accountId } },
    create: { gameId, accountId, pickType: "HEAD_TO_HEAD", teamPick, confidence: validConfidence },
    update: { teamPick, confidence: validConfidence },
  });
}

/** RACE_WINNER counterpart to submitPick (F1) — selectionId must be a real
 *  entrant already recorded on this event's SportsGameParticipant rows;
 *  never accepts an unverified driver id. */
export async function submitRacePick(accountId: string, gameId: string, selectionId: string) {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId }, include: { participants: true } });
  if (!game) throw new Error("Event not found");
  if (game.eventType !== "RACE_WINNER") throw new Error("This event doesn't take a race-winner pick");
  if (isPickLocked(game)) throw new Error("Picks are locked for this event");
  if (!game.participants.some((p) => p.participantId === selectionId)) throw new Error("That entrant isn't in this event's field");
  return prisma.sportsPick.upsert({
    where: { gameId_accountId: { gameId, accountId } },
    create: { gameId, accountId, pickType: "RACE_WINNER", selectionId },
    update: { selectionId },
  });
}

/** Grades every un-graded pick for one final game, then re-evaluates badges
 *  for every affected account. Called from the grading action (Owner-run or
 *  scheduled) — never guesses a result on its own. */
export async function gradeGame(gameId: string): Promise<number> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId }, include: { participants: true } });
  if (!game) return 0;
  const picks = await prisma.sportsPick.findMany({ where: { gameId, isCorrect: null } });
  const graded = game.eventType === "RACE_WINNER"
    ? gradeRacePicks(
        game.participants.find((p) => p.finishPosition === 1)?.participantId ?? null,
        picks.map((p) => ({ id: p.id, selectionId: p.selectionId ?? "" }))
      )
    : gradeGamePicks(game, picks.map((p) => ({ id: p.id, teamPick: p.teamPick as "home" | "away" })));
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
 *  `range` is one of the real Today/This Week/This Month/Season/All Time
 *  leaderboard periods (see leaderboardPeriodStart) — Season and All Time
 *  both currently show full history since this codebase has no single
 *  cross-sport season-year boundary yet. */
export async function getFamilyPicksLeaderboard(accountId: string, range: LeaderboardPeriod = "week"): Promise<{ entries: LeaderboardEntry[]; hasFamily: boolean }> {
  const me = await prisma.account.findUnique({ where: { id: accountId }, select: { guardianAccountId: true, firstName: true } });
  const householdRootId = me?.guardianAccountId ?? accountId;
  const household = await prisma.account.findMany({
    where: { OR: [{ id: householdRootId }, { guardianAccountId: householdRootId }] },
    select: { id: true, firstName: true },
  });
  const familyAccounts = household.length ? household : [{ id: accountId, firstName: me?.firstName ?? "You" }];

  // "season" resolves to no lower bound here too — this codebase has no
  // single cross-sport season-year concept (see leaderboardPeriodStart's
  // own note); Today/This Week/This Month are real, Season/All Time both
  // show the member's full real pick history rather than guess a boundary.
  const since = leaderboardPeriodStart(range, new Date());
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

export interface PriorPhaseRecord {
  sport: SportSlug;
  sportLabel: string;
  seasonPhase: "preseason" | "regular" | "postseason";
  correct: number;
  incorrect: number;
}

/** The headline profile stats (accuracy, streak, Total Picks) reflect only
 *  each sport's CURRENT real season phase — see currentPhasePicks. Once a
 *  sport moves to a new phase, its earlier-phase record stops feeding the
 *  "needle" but is never lost — it's returned here, in `priorPhaseRecords`,
 *  so Pick History can still show it. */
export async function getMagicalPicksProfile(accountId: string): Promise<
  PicksSummary & {
    pending: number;
    thisWeek: { correct: number; incorrect: number };
    lastWeek: { correct: number; incorrect: number };
    badges: { id: BadgeId; label: string; description: string; icon: string; earnedAt: Date }[];
    priorPhaseRecords: PriorPhaseRecord[];
  }
> {
  const picks = await prisma.sportsPick.findMany({ where: { accountId }, include: { game: { select: { sport: true, startsAt: true, seasonPhase: true } } } });
  const all = picks.map((p) => ({ gameId: p.gameId, sport: p.game.sport, isCorrect: p.isCorrect, gameStartsAt: p.game.startsAt, seasonPhase: p.game.seasonPhase }));
  const current = currentPhasePicks(all);
  const currentIds = new Set(current.map((p) => p.gameId));
  const summary = summarizePicks(current);
  const pending = current.filter((p) => p.isCorrect === null).length;
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86_400_000);
  const nextWeekStart = new Date(thisWeekStart.getTime() + 7 * 86_400_000);
  const thisWeek = recordInRange(current, thisWeekStart, nextWeekStart);
  const lastWeek = recordInRange(current, lastWeekStart, thisWeekStart);
  const earnedRows = await prisma.sportsBadgeEarned.findMany({ where: { accountId } });
  const badges = earnedRows
    .map((r) => {
      const def = SPORTS_BADGES.find((b) => b.id === r.badgeId);
      return def ? { ...def, id: def.id, earnedAt: r.earnedAt } : null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const priorMap = new Map<string, PriorPhaseRecord>();
  for (const p of all) {
    if (currentIds.has(p.gameId) || p.isCorrect === null) continue;
    const key = `${p.sport}:${p.seasonPhase}`;
    const row = priorMap.get(key) ?? { sport: p.sport as SportSlug, sportLabel: sportLabel(p.sport as SportSlug), seasonPhase: p.seasonPhase as PriorPhaseRecord["seasonPhase"], correct: 0, incorrect: 0 };
    if (p.isCorrect) row.correct += 1; else row.incorrect += 1;
    priorMap.set(key, row);
  }

  return { ...summary, pending, thisWeek, lastWeek, badges, priorPhaseRecords: Array.from(priorMap.values()) };
}

/** Every matchup-eligible sport's real, pickable matchups for one exact
 *  calendar date — the Featured Matchups table on the unified Magical
 *  Picks page. Unlike getGamesWithVoteContext (used by the small
 *  per-sport preview panel), this never forward-searches to a later date
 *  — a date tab must only ever show games that are actually scheduled
 *  that day. Every sport gets a box every date, even with an empty
 *  `contexts` array (the caller renders that as "Coming Soon") — a sport
 *  genuinely fetch-failing is the only thing left out entirely. */
export interface FeaturedSportMatchups {
  sport: SportSlug;
  label: string;
  contexts: MatchupCardContext[];
}

export async function getFeaturedMatchupsForDate(dateISO: string, accountId: string, perSportLimit = 4): Promise<FeaturedSportMatchups[]> {
  const results = await resolveWithFailureIsolation<SportSlug, FeaturedSportMatchups | null>(
    MATCHUP_SPORTS,
    async (sport) => {
      const { games } = await getGamesByDate(sport, dateISO);
      const slice = games.slice(0, perSportLimit);
      const contexts = await Promise.all(
        slice.map(async (game) => {
          const picks = await prisma.sportsPick.findMany({ where: { gameId: game.id, pickType: "HEAD_TO_HEAD" }, select: { teamPick: true, accountId: true, isCorrect: true, confidence: true } });
          const typed = picks.map((p) => ({ ...p, teamPick: p.teamPick as "home" | "away" }));
          const mine = typed.find((p) => p.accountId === accountId);
          return { game, tally: tallyVotes(typed), myPick: mine?.teamPick ?? null, myPickCorrect: mine?.isCorrect ?? null, myConfidence: mine?.confidence ?? null, locked: isPickLocked(game) };
        })
      );
      return { sport, label: sportLabel(sport), contexts };
    },
    () => null
  );
  return results.filter((r): r is FeaturedSportMatchups => r !== null);
}

export interface MyPickHistoryRow {
  id: string;
  sport: SportSlug;
  sportLabel: string;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  teamPick: "home" | "away" | null;
  isCorrect: boolean | null;
  confidence: number | null;
  startsAt: Date;
  status: string;
  seasonPhase: "preseason" | "regular" | "postseason";
}

// Generous buffer for ANY real sport's game length (including overtime) —
// past this, a game still marked anything other than "final" locally is
// almost certainly just stale, not still in progress.
const OVERDUE_PICK_MS = 6 * 60 * 60 * 1000; // 6h

/** Resyncs any game this account has a still-pending pick on, whose start
 *  time is safely in the past but whose local row was never refreshed to
 *  "final" — because nothing has browsed back to that date since it
 *  happened. Reuses the exact same getGamesByDate pipeline every other
 *  Sports page already goes through, which grades any now-final games as a
 *  side effect (see syncGamesToLocal) — no separate grading path, no
 *  guessed result. A game the provider still doesn't report as final (or
 *  an Owner-entered game with no externalId to resync) stays honestly
 *  pending. One getGamesByDate call per distinct (sport, date, league)
 *  combination among the overdue picks, never one per pick — and each of
 *  those calls is itself cached for hours, so a member re-opening My Picks
 *  repeatedly doesn't repeatedly hit the paid provider. */
async function reconcileOverduePicks(accountId: string): Promise<void> {
  const overdue = await prisma.sportsPick.findMany({
    where: {
      accountId,
      pickType: "HEAD_TO_HEAD",
      isCorrect: null,
      game: { status: { not: "final" }, startsAt: { lt: new Date(Date.now() - OVERDUE_PICK_MS) }, externalId: { not: null } },
    },
    include: { game: { select: { sport: true, league: true, startsAt: true } } },
  });
  if (!overdue.length) return;
  const seen = new Set<string>();
  const jobs: { sport: SportSlug; dateISO: string; league: string }[] = [];
  for (const p of overdue) {
    const dateISO = p.game.startsAt.toISOString().slice(0, 10);
    const key = `${p.game.sport}:${dateISO}:${p.game.league}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push({ sport: p.game.sport as SportSlug, dateISO, league: p.game.league });
  }
  await resolveWithFailureIsolation(jobs, (j) => getGamesByDate(j.sport, j.dateISO, j.league), () => null);
}

/** A member's own real pick rows, most recent game first — My Picks / Pick
 *  History on the unified Magical Picks page. RACE_WINNER (F1) picks are
 *  excluded — they have no single team side to show in this shape.
 *  Reconciles any overdue-but-still-pending pick first (see
 *  reconcileOverduePicks) so a game that actually finished shows its real
 *  result instead of staying stuck on "Pending" forever. */
export async function getMyPickHistory(accountId: string, limit = 30): Promise<MyPickHistoryRow[]> {
  await reconcileOverduePicks(accountId).catch(() => {});
  const rows = await prisma.sportsPick.findMany({
    where: { accountId, pickType: "HEAD_TO_HEAD" },
    include: { game: { select: { sport: true, homeTeamName: true, homeTeamLogoUrl: true, awayTeamName: true, awayTeamLogoUrl: true, startsAt: true, status: true, seasonPhase: true } } },
    orderBy: { game: { startsAt: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    sport: r.game.sport as SportSlug,
    sportLabel: sportLabel(r.game.sport as SportSlug),
    awayTeamName: r.game.awayTeamName,
    awayTeamLogoUrl: r.game.awayTeamLogoUrl,
    homeTeamName: r.game.homeTeamName,
    homeTeamLogoUrl: r.game.homeTeamLogoUrl,
    teamPick: r.teamPick as "home" | "away" | null,
    isCorrect: r.isCorrect,
    confidence: r.confidence,
    startsAt: r.game.startsAt,
    status: r.game.status,
    seasonPhase: r.game.seasonPhase as "preseason" | "regular" | "postseason",
  }));
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
const SINGLE_LEAGUE_SPORTS: ReadonlySet<SportSlug> = new Set(["nfl", "ncaaf", "nba", "wnba", "ncaab", "mlb", "ncaabaseball", "nhl", "rugby", "volleyball"]);

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
    const league = await resolveDefaultLeagueId(sport);
    if (league) {
      const season = seasonParam(sport, new Date().toISOString());
      const cached = await withCache("sports", ApiSportsProvider.slug, cacheKeyFor({ sport, league, season, kind: "league_teams_v2" }), TTL_LEAGUE_TEAMS, () =>
        fetchTeamsForLeague(sport, league, season));
      const roster = cached?.data ?? [];
      if (roster.length) return rankTeamMatches(roster, query);
    }
  }

  const teams = await ApiSportsProvider.searchTeams(sport, query);
  return teams ?? [];
}
