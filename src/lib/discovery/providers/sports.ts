// ── Sports — provider architecture (SERVER ONLY) ──────────────────
// API-Sports exposes each sport on its own host, but the response shapes are
// close cousins of each other (their whole product line shares one design).
// One ApiSportsProvider covers every sport we support today; SPORT_CONFIG is
// the only place that changes to add a sport. A future HIGH_SCHOOL_PROVIDER
// (or any other source) just implements the same SportsProvider interface —
// nothing else in the app changes. Never invents scores, standings, or teams;
// every method returns null on missing config or a failed/empty response.

export type SportSlug =
  | "nfl" | "ncaaf" | "nba" | "wnba" | "ncaab" | "mlb" | "soccer" | "nhl" | "mma" | "rugby" | "volleyball" | "f1";

export interface SportsTeam {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface SportsGameSummary {
  externalId: string;
  sport: SportSlug;
  league: string;
  homeTeam: SportsTeam;
  awayTeam: SportsTeam;
  startsAt: string; // ISO
  status: "scheduled" | "live" | "final";
  period?: string; // provider's clock/quarter/inning label when live
  homeScore?: number;
  awayScore?: number;
  /** The provider's own stage/round label verbatim (e.g. "Regular Season",
   *  "Pre Season", "Playoffs") when it returns one — never inferred. */
  stage?: string;
}

export interface SportsStanding {
  team: SportsTeam;
  wins?: number;
  losses?: number;
  ties?: number;
  rank?: number;
  summary?: string; // fallback display when the provider doesn't split W/L/T
  /** The provider's own conference/group label verbatim (e.g. "AFC", "east")
   *  when the standings response exposes one — never inferred or hardcoded
   *  by team name. Undefined when the provider doesn't group standings for
   *  this sport/league; callers fall back to one flat list. */
  group?: string;
  /** The provider's own division label verbatim (e.g. "AFC East", "AL West")
   *  when the response exposes one — a second, finer grouping level below
   *  `group`. Undefined when the provider doesn't expose a division split. */
  division?: string;
}

export interface SportsLeagueBrand {
  id: string;
  name: string;
  logoUrl: string;
}

/** Sports whose format is a two-side matchup — the only ones offered in the
 *  Pick / community-vote UI. F1 (a multi-entrant race, not head-to-head) and
 *  MMA (individual fighters, not team logos) are discoverable but excluded —
 *  "who you got" doesn't map cleanly onto either format. */
export const MATCHUP_SPORTS: SportSlug[] = ["nfl", "ncaaf", "nba", "wnba", "ncaab", "mlb", "soccer", "nhl", "rugby", "volleyball"];

export interface SportsDateResult {
  games: SportsGameSummary[];
  /** Set only when the provider's response body itself signaled a
   *  subscription/plan restriction for this date (e.g. API-Sports' Free
   *  plan rejecting dates outside its demo window) — never conflate this
   *  with a genuine "no games that day" result. `games` is always `[]`
   *  when this is set; never fabricated from it. */
  planRestricted?: string;
}

export interface SportsProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  readonly supportedSports: SportSlug[];
  isConfigured(sport?: SportSlug): boolean;
  gamesByDate(sport: SportSlug, dateISO: string, league?: string): Promise<SportsDateResult | null>;
  gamesForTeam(sport: SportSlug, teamExternalId: string, opts?: { league?: string; season?: string }): Promise<SportsGameSummary[] | null>;
  searchTeams(sport: SportSlug, query: string): Promise<SportsTeam[] | null>;
  standings(sport: SportSlug, league: string, season?: string): Promise<SportsStandingsResult | null>;
}

export interface SportsStandingsResult {
  standings: SportsStanding[];
  /** Set only when API-Sports' response body itself signaled a plan
   *  restriction for the standings endpoint — same detection as
   *  SportsDateResult.planRestricted, never conflated with a genuine
   *  "no standings yet" result. */
  planRestricted?: string;
  /** The exact season string this result was actually queried with (e.g.
   *  "2025-2026" or "2026") — so a caller can label what's on screen
   *  precisely, rather than separately re-guessing the "current" season and
   *  risking it disagreeing with what was actually fetched. */
  season?: string;
}

export const PENDING_SPORTS_MESSAGE = "Live sports integration pending.";

/** Always unconfigured — used for a sport with no connected provider (today:
 *  none once API_SPORTS_KEY is set; always for High School until a licensed
 *  partner is connected). */
export const SportsPendingProvider: SportsProvider = {
  slug: "pending",
  name: "Sports (pending)",
  attribution: "",
  supportedSports: [],
  isConfigured(): boolean {
    return false;
  },
  async gamesByDate(): Promise<SportsDateResult | null> {
    return null;
  },
  async gamesForTeam(): Promise<SportsGameSummary[] | null> {
    return null;
  },
  async searchTeams(): Promise<SportsTeam[] | null> {
    return null;
  },
  async standings(): Promise<SportsStandingsResult | null> {
    return null;
  },
};

/** Placeholder for a future licensed high-school data partner. Deliberately
 *  identical in shape to SportsPendingProvider — kept as its own named export
 *  so the Sports UI can show a High School category/filter chip today while
 *  it honestly stays empty, without scraping or fabricating anything. */
export const HighSchoolPendingProvider: SportsProvider = {
  ...SportsPendingProvider,
  slug: "high_school_pending",
  name: "High School Sports (pending)",
};

// ── API-Sports config ─────────────────────────────────────────────
// Each sport lives on its own host under api-sports.io, authenticated with
// the same x-apisports-key header. `shape` picks which endpoint/field names
// that host uses ("games" for most verticals, "fixtures" for soccer's v3
// football API). League IDs below are API-Sports' own numeric league IDs —
// NFL (1) and the major soccer leagues are well-documented and stable; the
// others are best-known defaults and should be confirmed against API-Sports'
// live docs once a key is active, since this environment has no key to
// verify them against.
interface SportConfig {
  host: string;
  shape: "games" | "fixtures" | "fights" | "races";
  defaultLeague: string;
}

const SPORT_CONFIG: Record<SportSlug, SportConfig> = {
  nfl: { host: "v1.american-football.api-sports.io", shape: "games", defaultLeague: "1" },
  ncaaf: { host: "v1.american-football.api-sports.io", shape: "games", defaultLeague: "2" },
  nba: { host: "v1.basketball.api-sports.io", shape: "games", defaultLeague: "12" },
  wnba: { host: "v1.basketball.api-sports.io", shape: "games", defaultLeague: "13" },
  ncaab: { host: "v1.basketball.api-sports.io", shape: "games", defaultLeague: "116" },
  mlb: { host: "v1.baseball.api-sports.io", shape: "games", defaultLeague: "1" },
  soccer: { host: "v3.football.api-sports.io", shape: "fixtures", defaultLeague: "39" }, // Premier League
  nhl: { host: "v1.hockey.api-sports.io", shape: "games", defaultLeague: "57" },
  rugby: { host: "v1.rugby.api-sports.io", shape: "games", defaultLeague: "1" },
  volleyball: { host: "v1.volleyball.api-sports.io", shape: "games", defaultLeague: "1" },
  mma: { host: "v1.mma.api-sports.io", shape: "fights", defaultLeague: "" },
  f1: { host: "v1.formula-1.api-sports.io", shape: "races", defaultLeague: "" },
};

/** A sport's default API-Sports league id (e.g. NFL = "1") — exported so
 *  callers needing to query standings/teams directly (outside the
 *  SportsProvider interface's own default-league handling) don't have to
 *  duplicate SPORT_CONFIG. Empty string for MMA/F1 (fights/races, not a
 *  leagues-shaped competition). */
export function defaultLeagueId(sport: SportSlug): string {
  return SPORT_CONFIG[sport].defaultLeague;
}

function apiKey(): string | undefined {
  return process.env.API_SPORTS_KEY?.trim() || undefined;
}

// Basketball and hockey seasons span two calendar years, and API-Sports'
// basketball/hockey APIs require the split "YYYY-YYYY" season format (single
// non-split years get rejected or return an empty response) — confirmed
// against this project's own diagnostic page (admin/diagnostics/api-sports,
// which uses this same seasonParam()). Every other sport here uses a plain
// single-year season. A split season "starts" around August: a January 2026
// game is part of the "2025-2026" season, a November 2026 game starts
// "2026-2027".
const SPLIT_SEASON_SPORTS: ReadonlySet<SportSlug> = new Set(["nba", "nhl"]);

/** Exported for tests. */
export function seasonParam(sport: SportSlug, dateISO: string): string {
  const d = new Date(dateISO);
  const year = d.getFullYear();
  if (!SPLIT_SEASON_SPORTS.has(sport)) return String(year);
  const month = d.getMonth(); // 0-indexed; August = 7
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// API-Sports returns HTTP 200 even when a request falls outside what the
// current plan allows — the body carries a non-empty `errors` object/array
// (commonly keyed "plan") describing it, alongside an otherwise well-formed
// `response: []`. Left undetected, that reads exactly like a genuine "no
// games today" result. Exported for tests and for the admin diagnostic page
// (same detection logic, not duplicated).
export function detectPlanRestriction(json: unknown): string | null {
  const errors = (json as { errors?: unknown } | null | undefined)?.errors;
  if (errors == null) return null;
  const messages: string[] = Array.isArray(errors)
    ? errors.filter((e): e is string => typeof e === "string")
    : typeof errors === "object"
      ? Object.values(errors as Record<string, unknown>).filter((v): v is string => typeof v === "string")
      : [];
  if (!messages.length) return null;
  // Prefer a message that actually reads like a plan/access restriction —
  // a bad-parameter or rate-limit error also lands in `errors` but is a
  // real failure, not "this date isn't in your plan," and should stay in
  // the existing null/failed path instead.
  return messages.find((m) => /plan|subscription|not\s+(?:allowed|included|available)|don.?t\s+have\s+access/i.test(m)) ?? null;
}

async function apiSportsFetch(sport: SportSlug, path: string, params: Record<string, string | undefined>): Promise<unknown | null> {
  const key = apiKey();
  if (!key) return null;
  const cfg = SPORT_CONFIG[sport];
  const url = new URL(`https://${cfg.host}${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": key },
      // Short revalidation window, not indefinite: scores/status change
      // throughout the day, and an indefinitely-cached empty/error response
      // (e.g. fetched before today's games were announced) would otherwise
      // never retry for the rest of the day.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json ?? null;
  } catch {
    return null;
  }
}

function statusOf(shortStatus: string | undefined): "scheduled" | "live" | "final" {
  const s = (shortStatus || "").toUpperCase();
  if (["FT", "AOT", "FINAL", "POST", "AFTER OVERTIME"].includes(s)) return "final";
  if (["NS", "SCHEDULED", "TBD"].includes(s)) return "scheduled";
  if (!s) return "scheduled";
  return "live";
}

/** Maps one "games"-shaped API-Sports response item (american-football,
 *  basketball, baseball, hockey, rugby, volleyball all share this shape).
 *  Exported for tests. */
export function mapGameItem(sport: SportSlug, league: string, item: any): SportsGameSummary | null {
  const id = item?.game?.id ?? item?.id;
  const home = item?.teams?.home;
  const away = item?.teams?.away;
  const date = item?.game?.date?.date ?? item?.date;
  if (id == null || !home?.name || !away?.name || !date) return null;
  const homeScore = item?.scores?.home?.total ?? item?.scores?.home ?? undefined;
  const awayScore = item?.scores?.away?.total ?? item?.scores?.away ?? undefined;
  return {
    externalId: String(id),
    sport,
    league,
    homeTeam: { id: String(home.id ?? ""), name: home.name, logoUrl: home.logo || undefined },
    awayTeam: { id: String(away.id ?? ""), name: away.name, logoUrl: away.logo || undefined },
    startsAt: new Date(date).toISOString(),
    status: statusOf(item?.game?.status?.short ?? item?.status?.short),
    period: item?.game?.status?.long ?? item?.status?.long ?? undefined,
    homeScore: typeof homeScore === "number" ? homeScore : undefined,
    awayScore: typeof awayScore === "number" ? awayScore : undefined,
    // API-Sports nests stage under the same `game` object as id/date/status
    // for these verticals (not `league`, despite it being season/competition
    // metadata) — checked first since that's where it actually lives; the
    // other two are kept as fallbacks for any response shape that differs.
    stage: typeof item?.game?.stage === "string" ? item.game.stage
      : typeof item?.league?.stage === "string" ? item.league.stage
      : typeof item?.stage === "string" ? item.stage
      : undefined,
  };
}

/** Maps one soccer v3 "fixtures" item — same idea, different field names. */
function mapFixtureItem(league: string, item: any): SportsGameSummary | null {
  const id = item?.fixture?.id;
  const home = item?.teams?.home;
  const away = item?.teams?.away;
  const date = item?.fixture?.date;
  if (id == null || !home?.name || !away?.name || !date) return null;
  return {
    externalId: String(id),
    sport: "soccer",
    league,
    homeTeam: { id: String(home.id ?? ""), name: home.name, logoUrl: home.logo || undefined },
    awayTeam: { id: String(away.id ?? ""), name: away.name, logoUrl: away.logo || undefined },
    startsAt: new Date(date).toISOString(),
    status: statusOf(item?.fixture?.status?.short),
    period: item?.fixture?.status?.elapsed ? `${item.fixture.status.elapsed}'` : undefined,
    homeScore: item?.goals?.home ?? undefined,
    awayScore: item?.goals?.away ?? undefined,
  };
}

function mapGamesResponse(sport: SportSlug, league: string, json: any): SportsGameSummary[] | null {
  const list = Array.isArray(json?.response) ? json.response : null;
  if (!list) return null;
  const cfg = SPORT_CONFIG[sport];
  const mapped = list
    .map((item: any) => (cfg.shape === "fixtures" ? mapFixtureItem(league, item) : mapGameItem(sport, league, item)))
    .filter((g: SportsGameSummary | null): g is SportsGameSummary => g !== null);
  return mapped;
}

/** Resolves the configured competition through API-Sports itself so the UI
 * never guesses at, copies, or hard-codes league artwork. A missing endpoint,
 * unconfigured sport, mismatched id, or response without a valid HTTPS logo
 * intentionally returns null and lets the presentation use its text fallback. */
export async function getDefaultLeagueBrand(sport: SportSlug): Promise<SportsLeagueBrand | null> {
  const cfg = SPORT_CONFIG[sport];
  if (!cfg.defaultLeague || !apiKey() || sport === "mma" || sport === "f1") return null;
  const json = await apiSportsFetch(sport, "/leagues", { id: cfg.defaultLeague });
  const first = Array.isArray((json as any)?.response) ? (json as any).response[0] : null;
  const league = first?.league ?? first;
  const id = league?.id;
  const name = league?.name;
  const logo = league?.logo;
  if (String(id ?? "") !== cfg.defaultLeague || typeof name !== "string" || typeof logo !== "string" || !logo.startsWith("https://")) return null;
  return { id: String(id), name, logoUrl: logo };
}

export const ApiSportsProvider: SportsProvider = {
  slug: "api_sports",
  name: "API-Sports",
  attribution: "Game data via API-Sports",
  supportedSports: Object.keys(SPORT_CONFIG) as SportSlug[],

  isConfigured(sport?: SportSlug): boolean {
    if (!apiKey()) return false;
    // MMA and F1 don't fit the games/fixtures shape this provider maps today.
    if (sport === "mma" || sport === "f1") return false;
    return true;
  },

  async gamesByDate(sport, dateISO, league): Promise<SportsDateResult | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const lg = league || cfg.defaultLeague;
    const path = cfg.shape === "fixtures" ? "/fixtures" : "/games";
    const json = await apiSportsFetch(sport, path, { date: dateISO, league: lg, season: seasonParam(sport, dateISO) });
    if (!json) return null;
    const planRestricted = detectPlanRestriction(json) ?? undefined;
    const games = mapGamesResponse(sport, lg, json) ?? [];
    return { games, planRestricted };
  },

  async gamesForTeam(sport, teamExternalId, opts): Promise<SportsGameSummary[] | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const lg = opts?.league || cfg.defaultLeague;
    const season = opts?.season || seasonParam(sport, new Date().toISOString());
    const path = cfg.shape === "fixtures" ? "/fixtures" : "/games";
    const json = await apiSportsFetch(sport, path, { team: teamExternalId, league: lg, season });
    if (!json) return null;
    return mapGamesResponse(sport, lg, json);
  },

  async searchTeams(sport, query): Promise<SportsTeam[] | null> {
    if (!this.isConfigured(sport)) return null;
    // API-Sports' /teams endpoint treats `search` and `league` as mutually
    // exclusive filters — `league` only works paired with `season` (a
    // specific season's roster), so combining it with `search` here (a
    // name lookup across all of a sport's teams) silently returned zero
    // results for every query, e.g. "New England Patriots" under the NFL.
    const json = await apiSportsFetch(sport, "/teams", { search: query });
    const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
    if (!list) return null;
    return list
      .map((item: any) => {
        const t = item?.team ?? item;
        if (!t?.id || !t?.name) return null;
        return { id: String(t.id), name: t.name, logoUrl: t.logo || undefined } as SportsTeam;
      })
      .filter((t: SportsTeam | null): t is SportsTeam => t !== null);
  },

  async standings(sport, league, season): Promise<SportsStandingsResult | null> {
    if (!this.isConfigured(sport)) return null;
    const yr = season || seasonParam(sport, new Date().toISOString());
    const json = await apiSportsFetch(sport, "/standings", { league, season: yr });
    if (!json) return null;
    const planRestricted = detectPlanRestriction(json) ?? undefined;
    const raw = (json as any)?.response;
    const flat: any[] = Array.isArray(raw)
      ? (Array.isArray(raw[0]) ? raw.flat() : Array.isArray(raw[0]?.league?.standings?.[0]) ? raw[0].league.standings.flat() : raw)
      : [];
    const standings = flat
      .map((row: any) => {
        const t = row?.team;
        if (!t?.id || !t?.name) return null;
        const wins = row?.games?.win?.total ?? row?.won ?? undefined;
        const losses = row?.games?.lose?.total ?? row?.lost ?? undefined;
        const ties = row?.games?.draw?.total ?? row?.draw ?? undefined;
        const group = typeof row?.conference?.name === "string" ? row.conference.name
          : typeof row?.conference === "string" ? row.conference
          : typeof row?.group?.name === "string" ? row.group.name
          : typeof row?.group === "string" ? row.group
          : undefined;
        const division = typeof row?.division?.name === "string" ? row.division.name
          : typeof row?.division === "string" ? row.division
          : typeof row?.subgroup?.name === "string" ? row.subgroup.name
          : undefined;
        return {
          team: { id: String(t.id), name: t.name, logoUrl: t.logo || undefined },
          wins: typeof wins === "number" ? wins : undefined,
          losses: typeof losses === "number" ? losses : undefined,
          ties: typeof ties === "number" ? ties : undefined,
          rank: row?.position ?? row?.rank ?? undefined,
          group,
          division,
        } as SportsStanding;
      })
      .filter((s: SportsStanding | null): s is SportsStanding => s !== null);
    return { standings, planRestricted, season: yr };
  },
};

/** Fetches the real league logo API-Sports serves for a sport's default
 *  league (e.g. NFL league id 1 on the american-football host) — never a
 *  baked-in trademark asset of our own. Returns null when unconfigured, the
 *  sport has no leagues-endpoint id (MMA/F1 — fights/races, not leagues),
 *  or the provider simply doesn't return a logo for that league; callers
 *  fall back to a plain typographic treatment rather than inventing a mark.
 *  Exported standalone (not on SportsProvider) since only the Explore Sports
 *  grid needs it — caching lives in the service layer, matching every other
 *  provider call in this file. */
export async function fetchLeagueLogo(sport: SportSlug): Promise<string | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const cfg = SPORT_CONFIG[sport];
  if (!cfg.defaultLeague) return null;
  const json = await apiSportsFetch(sport, "/leagues", { id: cfg.defaultLeague });
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  // Football v3 nests identity under `league`; the other API-Sports
  // verticals return it at the response-item root. Supporting both shapes is
  // what lets NFL/NCAAF and basketball/baseball/hockey share this resolver.
  const item = list?.[0];
  const logo = item?.league?.logo ?? item?.logo;
  if (typeof logo !== "string") return null;
  const normalized = logo.trim();
  return /^https:\/\//i.test(normalized) && !/image[-_ ]?unavailable|placeholder|no[-_ ]?image/i.test(normalized)
    ? normalized
    : null;
}

/** The full season's schedule for a league — queried by season only (no
 *  date, no team), which API-Sports' games/fixtures endpoints support
 *  directly. Used to find real preseason/season-opener dates rather than
 *  guessing from a typical calendar. Exported standalone like
 *  fetchLeagueLogo — this isn't a per-date lookup so it doesn't belong on
 *  the SportsProvider interface. */
export async function fetchSeasonGames(sport: SportSlug, season: string, league?: string): Promise<SportsGameSummary[] | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const cfg = SPORT_CONFIG[sport];
  const lg = league || cfg.defaultLeague;
  if (!lg) return null;
  const path = cfg.shape === "fixtures" ? "/fixtures" : "/games";
  const json = await apiSportsFetch(sport, path, { league: lg, season });
  return mapGamesResponse(sport, lg, json);
}

/** The earliest real game of the given season whose provider-reported stage
 *  matches "pre season" (case/spacing-insensitive) — or null when the
 *  provider doesn't expose a stage/round distinction for this sport, or
 *  simply has no preseason games in its response. Never a computed/assumed
 *  date. */
export async function fetchFirstPreseasonGame(sport: SportSlug, season: string, league?: string): Promise<SportsGameSummary | null> {
  const games = await fetchSeasonGames(sport, season, league);
  if (!games) return null;
  const preseason = games
    .filter((g) => g.stage && /pre.?season/i.test(g.stage))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  return preseason[0] ?? null;
}

/** The earliest real game of the given season whose provider-reported stage
 *  matches "regular season" (case/spacing-insensitive) — the true season
 *  opener, straight from API-Sports. Null when the provider doesn't expose
 *  a stage/round distinction for this sport, or has no regular-season games
 *  in its response yet. Never a computed/assumed kickoff date. */
export async function fetchFirstRegularSeasonGame(sport: SportSlug, season: string, league?: string): Promise<SportsGameSummary | null> {
  const games = await fetchSeasonGames(sport, season, league);
  if (!games) return null;
  const regular = games
    .filter((g) => g.stage && /regular.?season/i.test(g.stage))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  return regular[0] ?? null;
}

/** The earliest real game of the given season whose provider-reported stage
 *  matches a postseason/playoff/championship label (case/spacing-insensitive
 *  — API-Sports' own wording varies by sport: "Postseason", "Playoffs",
 *  "Championship", a bowl name). Null when the provider doesn't expose a
 *  stage/round distinction for this sport, or has no postseason games in
 *  its response yet. Never a computed/assumed date. */
export async function fetchFirstPostseasonGame(sport: SportSlug, season: string, league?: string): Promise<SportsGameSummary | null> {
  const games = await fetchSeasonGames(sport, season, league);
  if (!games) return null;
  const postseason = games
    .filter((g) => g.stage && /post.?season|play.?offs?|championship|bowl/i.test(g.stage))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  return postseason[0] ?? null;
}

export interface SportsRosterPlayer {
  id: string;
  name: string;
  position?: string;
  number?: number;
  photoUrl?: string;
}

/** Pure: map one API-Sports /players response item → our shape. Exported
 *  for tests. American Football's real shape nests identity under
 *  `player` and roster details under `statistics[0].team`/`.position` —
 *  other verticals return player fields at the item root, so both are
 *  checked. Never fabricates a position or number the provider omitted. */
export function mapRosterPlayer(item: any): SportsRosterPlayer | null {
  const p = item?.player ?? item;
  const id = p?.id;
  const name = p?.name;
  if (id == null || !name) return null;
  const stat = Array.isArray(item?.statistics) ? item.statistics[0] : undefined;
  const position = typeof stat?.position === "string" ? stat.position : typeof p?.position === "string" ? p.position : undefined;
  const number = typeof stat?.number === "number" ? stat.number : typeof p?.number === "number" ? p.number : undefined;
  return {
    id: String(id),
    name: String(name),
    position,
    number,
    photoUrl: typeof p?.photo === "string" && p.photo.startsWith("https://") ? p.photo : undefined,
  };
}

/** A real team's current-season roster — straight from API-Sports'
 *  /players endpoint (team + season, the same "no bare search" filter
 *  rule the team-search fix relies on). Returns null on missing config or
 *  a failed/empty response; an empty array only when the provider itself
 *  returns zero players. Never invents a roster. */
export async function fetchTeamRoster(sport: SportSlug, teamExternalId: string, season: string): Promise<SportsRosterPlayer[] | null> {
  if (!ApiSportsProvider.isConfigured(sport) || !teamExternalId) return null;
  const json = await apiSportsFetch(sport, "/players", { team: teamExternalId, season });
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  if (!list) return null;
  return list.map(mapRosterPlayer).filter((p: SportsRosterPlayer | null): p is SportsRosterPlayer => p !== null);
}
