// ── Sports — provider architecture (SERVER ONLY) ──────────────────
// API-Sports exposes each sport on its own host, but the response shapes are
// close cousins of each other (their whole product line shares one design).
// One ApiSportsProvider covers every sport we support today; SPORT_CONFIG is
// the only place that changes to add a sport. A future HIGH_SCHOOL_PROVIDER
// (or any other source) just implements the same SportsProvider interface —
// nothing else in the app changes. Never invents scores, standings, or teams;
// every method returns null on missing config or a failed/empty response.

export type SportSlug =
  | "nfl" | "ncaaf" | "nba" | "wnba" | "ncaab" | "mlb" | "ncaabaseball" | "soccer" | "nhl" | "mma" | "rugby" | "volleyball" | "f1";

export interface SportsTeam {
  id: string;
  name: string;
  logoUrl?: string;
  /** The provider's own real short code/abbreviation (e.g. "BUF"), when it
   *  returns one — never derived or guessed. A secondary, verified match
   *  key for resolving a team from a source that only gives a code rather
   *  than a full name (see resolveTeamByName's use of this in service.ts). */
  code?: string;
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
  /** The provider's own venue name (and city, when both are given) — never
   *  a guessed home stadium. Undefined when the response doesn't include one. */
  venue?: string;
}

export interface SportsStanding {
  team: SportsTeam;
  wins?: number;
  losses?: number;
  ties?: number;
  /** The provider's own real points total (e.g. soccer's 3/1/0 win/draw/loss
   *  points table) when the response includes one — never computed from
   *  wins/losses ourselves, since the real points formula differs by sport
   *  (soccer 3/1/0, hockey 2/1/0, etc.) and guessing it risks a wrong table. */
  points?: number;
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
export const MATCHUP_SPORTS: SportSlug[] = ["nfl", "ncaaf", "nba", "wnba", "ncaab", "mlb", "ncaabaseball", "soccer", "nhl", "rugby", "volleyball"];

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
  /** One real game, fetched fresh (never a cached/local snapshot) — the
   *  live-poll primitive for a game detail page. Returns null when
   *  unconfigured, not found, or the call fails. */
  gameById(sport: SportSlug, externalId: string, opts?: { league?: string; season?: string }): Promise<SportsGameSummary | null>;
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
  async gameById(): Promise<SportsGameSummary | null> {
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
//
// `defaultLeague: ""` is a deliberate, honest "unresolved" — not a bug.
// MMA/F1 use it because they're fights/races, not leagues, at all. College
// baseball (ncaabaseball) uses it for a different reason: unlike college
// football (ncaaf, league id 2) and college basketball (ncaab, league id
// 116), API-Sports' own published baseball product documentation lists MLB,
// LMB (Mexico), and NPB (Japan) as its covered competitions — NCAA/college
// baseball has never been confirmed as part of that product. This sandbox
// has neither a live API_SPORTS_KEY nor network access to api-sports.io to
// check the real /leagues catalog directly (both were attempted and
// blocked), so rather than hardcode a guessed numeric id — which could
// silently point at the wrong real league and misrepresent someone else's
// competition as NCAA baseball — resolveNcaaBaseballLeagueId() below asks
// the provider itself at runtime, the same "ask, don't hardcode" discipline
// resolveBettingMarketTypeId (sportsdata.ts) already uses. See
// resolveDefaultLeagueId in service.ts for how every "games"-shaped call
// (schedules, standings, team directory, Follow My Team) picks up whatever
// that resolver finds — or honestly degrades to "not available yet" when it
// finds nothing, exactly like MMA/F1 do today for their own empty default.
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
  // Same host as MLB (API-Sports' whole baseball product line lives on one
  // host) — but no static defaultLeague id; see the module comment above and
  // resolveNcaaBaseballLeagueId just below.
  ncaabaseball: { host: "v1.baseball.api-sports.io", shape: "games", defaultLeague: "" },
  soccer: { host: "v3.football.api-sports.io", shape: "fixtures", defaultLeague: "39" }, // Premier League
  nhl: { host: "v1.hockey.api-sports.io", shape: "games", defaultLeague: "57" },
  rugby: { host: "v1.rugby.api-sports.io", shape: "games", defaultLeague: "1" },
  volleyball: { host: "v1.volleyball.api-sports.io", shape: "games", defaultLeague: "1" },
  mma: { host: "v1.mma.api-sports.io", shape: "fights", defaultLeague: "" },
  f1: { host: "v1.formula-1.api-sports.io", shape: "races", defaultLeague: "" },
};

/** Resolves NCAA/college baseball's real API-Sports league id by searching
 *  the baseball host's own /leagues catalog for an NCAA/College name match —
 *  never a hardcoded numeric id (see the SPORT_CONFIG comment above for why).
 *  Mirrors resolveBettingMarketTypeId's pattern in sportsdata.ts: fetch the
 *  real list, match by the provider's own Name field, return the real id or
 *  null. Returns null (never a fabricated id) when unconfigured, the call
 *  fails, or nothing in the response matches — callers must treat that as
 *  "this data source doesn't have NCAA baseball," not "broken." Exported for
 *  tests; service.ts wraps this with the app's normal cache discipline. */
export async function resolveNcaaBaseballLeagueId(): Promise<string | null> {
  const json = await apiSportsFetch("ncaabaseball", "/leagues", {});
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  if (!list) return null;
  const match = list.find((item: any) => {
    const name = item?.league?.name ?? item?.name;
    return typeof name === "string" && /NCAA|College/i.test(name);
  });
  const id = match?.league?.id ?? match?.id;
  return id != null ? String(id) : null;
}

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

// API-Sports' basketball and hockey PRODUCTS (the entire v1.basketball and
// v1.hockey hosts — every league they carry, not just NBA/NHL) require the
// split "YYYY-YYYY" season format; single non-split years get rejected or
// return an empty response. This was originally confirmed here only for NBA
// (see this project's own diagnostic page, admin/diagnostics/api-sports,
// which uses this same seasonParam()) and the set below used to read
// `["nba", "nhl"]` — reasoning from "does this SPORT's real calendar span
// two years" rather than "which HOST/product is this sport served from."
// That miscategorized ncaab (NCAAB's own real season IS split-year, so this
// was harmless for ncaab specifically, but the reasoning was still wrong)
// and, more seriously, wnba: it was moved into this set on host-membership
// grounds alone (wnba lives on the SAME v1.basketball.api-sports.io host as
// nba), without accounting for WNBA's own real calendar — a WNBA season
// runs entirely within one calendar year (May-October), never spanning a
// year boundary the way NBA/NHL/NCAAB genuinely do. A split "YYYY-YYYY" key
// has no real WNBA season it could correspond to, which is the confirmed
// root cause of WNBA's team catalog (and, before this file's off-season
// catalog fallback was added below, its standings) coming back empty in
// production — not a provider outage, not a wrong league id. WNBA has been
// removed from this set; it now gets the same plain single-year format
// every other non-hoops/hockey host already uses, which actually matches
// its real season shape.
//
// Every other host used here (american-football, baseball, football/soccer
// v3, rugby, volleyball) uses a plain single-year season. A split season
// "starts" around August: a January 2026 game is part of the "2025-2026"
// season, a November 2026 game starts "2026-2027".
const SPLIT_SEASON_SPORTS: ReadonlySet<SportSlug> = new Set(["nba", "ncaab", "nhl"]);

/** Exported for tests. */
export function seasonParam(sport: SportSlug, dateISO: string): string {
  const d = new Date(dateISO);
  const year = d.getFullYear();
  if (!SPLIT_SEASON_SPORTS.has(sport)) return String(year);
  const month = d.getMonth(); // 0-indexed; August = 7
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/** The season immediately BEFORE the one seasonParam() would resolve for
 *  this date — i.e. the last season that's actually plausible to have a
 *  completed schedule and final standings right now. Built from the exact
 *  same real per-sport split/plain convention seasonParam uses, just
 *  stepped back one — never a separately-guessed format. Used by the
 *  Standings panel's off-season fallback: when the CURRENT (or upcoming,
 *  not-yet-started) season has nothing posted yet, this is the real prior
 *  season to retry with instead of showing a blank panel. Exported for
 *  tests. */
export function previousSeasonParam(sport: SportSlug, dateISO: string): string {
  const current = seasonParam(sport, dateISO);
  const split = current.match(/^(\d{4})-(\d{4})$/);
  if (split) return `${Number(split[1]) - 1}-${Number(split[2]) - 1}`;
  const year = parseInt(current, 10);
  return Number.isFinite(year) ? String(year - 1) : current;
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

// No request ever hangs indefinitely — a slow/unresponsive upstream fails
// fast instead of running out the serverless function's own execution-time
// limit (which returns a raw platform error page instead of this module's
// honest null, indistinguishable from a JS exception to the caller). See
// sdioFetch's identical guard just below in sportsdata.ts.
const PROVIDER_TIMEOUT_MS = 8_000;

async function apiSportsFetch(sport: SportSlug, path: string, params: Record<string, string | undefined>): Promise<unknown | null> {
  const key = apiKey();
  if (!key) return null;
  const cfg = SPORT_CONFIG[sport];
  const url = new URL(`https://${cfg.host}${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": key },
      // Short revalidation window, not indefinite: scores/status change
      // throughout the day, and an indefinitely-cached empty/error response
      // (e.g. fetched before today's games were announced) would otherwise
      // never retry for the rest of the day.
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function statusOf(shortStatus: string | undefined): "scheduled" | "live" | "final" {
  const s = (shortStatus || "").toUpperCase();
  if (["FT", "AOT", "FINAL", "POST", "AFTER OVERTIME"].includes(s)) return "final";
  if (["NS", "SCHEDULED", "TBD"].includes(s)) return "scheduled";
  if (!s) return "scheduled";
  return "live";
}

/** API-Sports' "games" family (american-football, basketball, baseball,
 *  hockey, rugby, volleyball) nests the real kickoff/tipoff moment under
 *  `game.date` as an object — `{date, time, timestamp, timezone}` — not a
 *  single ready-to-parse string. Reading only `date.date` (a calendar day
 *  with no time) silently parses as local midnight, which is the exact
 *  "shows 12:00 AM" bug this fixes: prefer the real Unix `timestamp` when
 *  present (unambiguous), else combine the real `date` + `time` strings,
 *  and only fall back to the bare date — never inventing a kickoff time
 *  the provider didn't report. Exported for tests. */
export function gameDateToISO(dateField: any, fallback: any): string | null {
  if (typeof dateField?.timestamp === "number") return new Date(dateField.timestamp * 1000).toISOString();
  const datePart = typeof dateField === "string" ? dateField : typeof dateField?.date === "string" ? dateField.date : undefined;
  const timePart = typeof dateField?.time === "string" ? dateField.time : undefined;
  const combined = datePart && timePart ? `${datePart}T${timePart}` : (datePart ?? (typeof fallback === "string" ? fallback : undefined));
  if (!combined) return null;
  const parsed = new Date(combined);
  return Number.isNaN(+parsed) ? null : parsed.toISOString();
}

/** Maps one "games"-shaped API-Sports response item (american-football,
 *  basketball, baseball, hockey, rugby, volleyball all share this shape).
 *  Exported for tests. */
export function mapGameItem(sport: SportSlug, league: string, item: any): SportsGameSummary | null {
  const id = item?.game?.id ?? item?.id;
  const home = item?.teams?.home;
  const away = item?.teams?.away;
  const startsAt = gameDateToISO(item?.game?.date, item?.date);
  if (id == null || !home?.name || !away?.name || !startsAt) return null;
  const homeScore = item?.scores?.home?.total ?? item?.scores?.home ?? undefined;
  const awayScore = item?.scores?.away?.total ?? item?.scores?.away ?? undefined;
  const venue = item?.game?.venue;
  return {
    externalId: String(id),
    sport,
    league,
    homeTeam: { id: String(home.id ?? ""), name: home.name, logoUrl: home.logo || undefined },
    awayTeam: { id: String(away.id ?? ""), name: away.name, logoUrl: away.logo || undefined },
    startsAt,
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
    venue: typeof venue === "string" ? venue : typeof venue?.name === "string" ? [venue.name, venue.city].filter(Boolean).join(", ") : undefined,
  };
}

/** Maps one soccer v3 "fixtures" item — same idea, different field names. */
function mapFixtureItem(league: string, item: any): SportsGameSummary | null {
  const id = item?.fixture?.id;
  const home = item?.teams?.home;
  const away = item?.teams?.away;
  const date = item?.fixture?.date;
  if (id == null || !home?.name || !away?.name || !date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(+parsed)) return null;
  const venue = item?.fixture?.venue;
  return {
    externalId: String(id),
    sport: "soccer",
    league,
    homeTeam: { id: String(home.id ?? ""), name: home.name, logoUrl: home.logo || undefined },
    awayTeam: { id: String(away.id ?? ""), name: away.name, logoUrl: away.logo || undefined },
    startsAt: parsed.toISOString(),
    status: statusOf(item?.fixture?.status?.short),
    period: item?.fixture?.status?.elapsed ? `${item.fixture.status.elapsed}'` : undefined,
    homeScore: item?.goals?.home ?? undefined,
    awayScore: item?.goals?.away ?? undefined,
    venue: typeof venue?.name === "string" ? [venue.name, venue.city].filter(Boolean).join(", ") : undefined,
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

  async gameById(sport, externalId, opts): Promise<SportsGameSummary | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const lg = opts?.league || cfg.defaultLeague;
    const season = opts?.season || seasonParam(sport, new Date().toISOString());
    const path = cfg.shape === "fixtures" ? "/fixtures" : "/games";
    // A single real game/fixture, fetched fresh by its own id — the
    // standard id-lookup param API-Sports documents uniformly across every
    // "games"-shaped product. season is included since some of these hosts
    // require it alongside id; harmless when the id alone is sufficient.
    const json = await apiSportsFetch(sport, path, { id: externalId, league: lg, season });
    if (!json) return null;
    const games = mapGamesResponse(sport, lg, json);
    return games?.[0] ?? null;
  },

  async searchTeams(sport, query): Promise<SportsTeam[] | null> {
    if (!this.isConfigured(sport)) return null;
    // API-Sports' /teams endpoint treats `search` and `league` as mutually
    // exclusive filters — `league` only works paired with `season` (a
    // specific season's roster), so combining it with `search` here (a
    // name lookup across all of a sport's teams) silently returned zero
    // results for every query, e.g. "New England Patriots" under the NFL.
    // This is deliberately a LAST-RESORT, unscoped search across the
    // sport's ENTIRE catalog (every league/division API-Sports has on that
    // host — G-League, international, women's leagues, everything) — real
    // callers should prefer fetchTeamsForLeague + local matching (see
    // service.ts's searchTeamsForSport) so results never cross leagues.
    const json = await apiSportsFetch(sport, "/teams", { search: query });
    return mapTeamsResponse(json);
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
    // Soccer's standings response (API-Sports' Football product) nests real
    // win/draw/loss counts under `all` (`all.win`/`all.draw`/`all.lose`) and
    // carries a top-level `points` field — a different, real shape from the
    // `games.win.total` convention basketball/baseball/hockey/American
    // football use on their own API-Sports hosts. Reading the wrong shape
    // silently left every soccer row's wins/losses undefined even on a
    // successful call, rendering "—/—" instead of the real record.
    const isSoccer = sport === "soccer";
    const standings = flat
      .map((row: any) => {
        const t = row?.team;
        if (!t?.id || !t?.name) return null;
        const wins = isSoccer ? row?.all?.win : row?.games?.win?.total ?? row?.won ?? undefined;
        const losses = isSoccer ? row?.all?.lose : row?.games?.lose?.total ?? row?.lost ?? undefined;
        const ties = isSoccer ? row?.all?.draw : row?.games?.draw?.total ?? row?.draw ?? undefined;
        const points = typeof row?.points === "number" ? row.points : undefined;
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
          points,
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
function mapTeamsResponse(json: unknown): SportsTeam[] | null {
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  if (!list) return null;
  return list
    .map((item: any) => {
      const t = item?.team ?? item;
      if (!t?.id || !t?.name) return null;
      return { id: String(t.id), name: t.name, logoUrl: t.logo || undefined, code: typeof t.code === "string" && t.code.trim() ? t.code.trim() : undefined } as SportsTeam;
    })
    .filter((t: SportsTeam | null): t is SportsTeam => t !== null);
}

/** Ranks a real, already league-scoped team list against a query — never
 *  filters IN a team that doesn't belong; the scoping happens upstream by
 *  only ever calling this against a roster fetched via fetchTeamsForLeague
 *  (or an equivalent verified list), never the unscoped catalog search.
 *  Exact name match first, then an exact word match ("Bulls" inside
 *  "Chicago Bulls"), then a name that starts with the query, then any
 *  other substring match — so "Bulls" ranks "Chicago Bulls" first even
 *  though nothing else in a real single-league roster would match it
 *  anyway. Exported for tests. */
export function rankTeamMatches(roster: SportsTeam[], query: string): SportsTeam[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return roster
    .map((t) => {
      const name = t.name.toLowerCase();
      let score = -1;
      if (name === q) score = 0;
      else if (name.split(/\s+/).includes(q)) score = 1;
      else if (name.startsWith(q)) score = 2;
      else if (name.includes(q)) score = 3;
      return { t, score };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => a.score - b.score || a.t.name.localeCompare(b.t.name))
    .map((r) => r.t);
}

/** Every team in one league for one season — the real, verified roster
 *  (e.g. exactly the NBA's 30 current franchises when league="12"), never
 *  mixed with other leagues/divisions on the same host. This is the
 *  correct scoped source for team search: fetch it once (cached at the
 *  call site), then match locally — see searchTeamsForSport in service.ts.
 *  Returns null on missing config, a failed call, or an empty response
 *  (e.g. the season hasn't been posted for this league yet). */
export async function fetchTeamsForLeague(sport: SportSlug, league: string, season?: string): Promise<SportsTeam[] | null> {
  if (!ApiSportsProvider.isConfigured(sport)) return null;
  const yr = season || seasonParam(sport, new Date().toISOString());
  const json = await apiSportsFetch(sport, "/teams", { league, season: yr });
  const first = mapTeamsResponse(json);
  if (!first) return null;

  // API-Sports paginates a large `/teams` response (a real `paging.total`
  // field in the envelope, e.g. NBA's 30 teams can span more than one
  // page) — reading only page 1 silently drops whichever teams landed on
  // later pages, which is exactly what left roughly half of a league's
  // teams with no resolvable id/logo even though the call itself
  // "succeeded." Fetch every remaining real page and merge; a response
  // with no paging field (or just one page) makes this a no-op.
  const paging = (json as any)?.paging;
  const totalPages = typeof paging?.total === "number" ? paging.total : 1;
  if (totalPages <= 1) return first;

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map((page) =>
      apiSportsFetch(sport, "/teams", { league, season: yr, page: String(page) }))
  );
  const rest = restPages.flatMap((p) => mapTeamsResponse(p) ?? []);

  // Defensive: never trust that "another page" necessarily means "more
  // real teams" — if paging.total means something other than what this
  // assumed, or a later page echoes page 1 back, deduping by the
  // provider's own real team id is what actually guarantees the merged
  // list is never bigger than the real league (e.g. never a doubled
  // 60-team MLB list from a genuine 30-team league).
  const byId = new Map<string, SportsTeam>();
  for (const t of [...first, ...rest]) byId.set(t.id, t);
  return Array.from(byId.values());
}

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
/** Classifies a game's real season phase from the provider's own stage
 *  label — same three regexes fetchFirstPreseasonGame/fetchFirstRegularSeasonGame/
 *  fetchFirstPostseasonGame already use to find each phase's opener, reused
 *  here so every synced game is tagged with its real phase (never guessed).
 *  A missing/unrecognized stage (most sports don't expose one) defaults to
 *  "regular" — the correct assumption for a provider with no phase concept. */
export function classifySeasonPhase(stage?: string | null): "preseason" | "regular" | "postseason" {
  if (stage && /pre.?season/i.test(stage)) return "preseason";
  if (stage && /post.?season|play.?offs?|championship|bowl/i.test(stage)) return "postseason";
  return "regular";
}

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

export interface RosterFetchResult {
  players: SportsRosterPlayer[];
  /** Set only when API-Sports itself reported a plan/subscription
   *  restriction for this team's roster (same detectPlanRestriction used by
   *  the games/standings paths) — a genuine zero-player response never sets
   *  this. Callers must not conflate the two: a plan restriction is not
   *  "this team has no roster," it's "our plan can't ask for it." */
  planRestricted?: string;
}

/** A real team's current-season roster — straight from API-Sports'
 *  /players endpoint (team + season, the same "no bare search" filter
 *  rule the team-search fix relies on). Returns null on missing config, no
 *  team id, or a failed request (bad HTTP status / unparseable body) — a
 *  genuine provider ERROR, distinct from both of the two real "we got an
 *  answer" cases below. A real response with zero players still returns an
 *  object (`{ players: [] }`), never invents a roster. */
export async function fetchTeamRoster(sport: SportSlug, teamExternalId: string, season: string): Promise<RosterFetchResult | null> {
  if (!ApiSportsProvider.isConfigured(sport) || !teamExternalId) return null;
  const json = await apiSportsFetch(sport, "/players", { team: teamExternalId, season });
  if (!json) return null;
  const planRestricted = detectPlanRestriction(json) ?? undefined;
  if (planRestricted) return { players: [], planRestricted };
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  if (!list) return null;
  return { players: list.map(mapRosterPlayer).filter((p: SportsRosterPlayer | null): p is SportsRosterPlayer => p !== null) };
}

// ── Game-level box score / team + player stats (NFL/NCAAF today) ──────────
// Real, confirmed endpoint paths — /games/statistics/teams and
// /games/statistics/players on the american-football host are named
// explicitly in API-Sports' own public documentation and search-indexed
// references. This sandbox has no live API_SPORTS_KEY to confirm the exact
// response field names against, though, so every mapper below is
// deliberately defensive: it reads whichever of the two real conventions
// this provider's product line is documented to use (a flat {type|name,
// value} stat entry, or a named-field object whose own keys ARE the stats —
// the same {player:{...}, statistics:[...]} envelope already confirmed
// working for /players just above) and otherwise returns nothing for that
// row rather than fabricate a stat the response didn't actually contain.
// Confirm the exact shape against API-Sports' live docs once a key is
// active, the same disclosed-until-verified posture SPORT_CONFIG's league
// ids already carry.

export interface GameStatLine {
  label: string;
  value: string | number;
}

function humanizeStatKey(key: string): string {
  const spaced = key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const STAT_ENTRY_META_KEYS = new Set(["type", "name", "category", "group", "id"]);

/** Pure: one raw stat entry → real label/value pairs, tolerant of either
 *  documented convention. Exported for tests. */
export function flattenStatEntry(entry: unknown): GameStatLine[] {
  if (entry == null || typeof entry !== "object") return [];
  const e = entry as Record<string, unknown>;
  const label = typeof e.type === "string" ? e.type : typeof e.name === "string" ? e.name : undefined;
  if (label && "value" in e && (typeof e.value === "number" || typeof e.value === "string")) {
    return [{ label, value: e.value as string | number }];
  }
  return Object.entries(e)
    .filter(([k, v]) => !STAT_ENTRY_META_KEYS.has(k) && (typeof v === "number" || typeof v === "string"))
    .map(([k, v]) => ({ label: humanizeStatKey(k), value: v as string | number }));
}

export interface TeamGameStats {
  team: SportsTeam;
  stats: GameStatLine[];
}

/** Pure: one team's row from /games/statistics/teams → our shape. Exported for tests. */
export function mapTeamGameStats(item: unknown): TeamGameStats | null {
  const it = item as Record<string, any> | null | undefined;
  const t = it?.team;
  if (!t?.id || !t?.name) return null;
  const rawStats: unknown[] = Array.isArray(it?.statistics) ? it.statistics : [];
  const stats = rawStats.flatMap(flattenStatEntry);
  return { team: { id: String(t.id), name: t.name, logoUrl: t.logo || undefined }, stats };
}

export async function fetchGameTeamStats(sport: SportSlug, gameExternalId: string): Promise<TeamGameStats[] | null> {
  if (!ApiSportsProvider.isConfigured(sport) || (sport !== "nfl" && sport !== "ncaaf") || !gameExternalId) return null;
  const json = await apiSportsFetch(sport, "/games/statistics/teams", { id: gameExternalId });
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  if (!list) return null;
  return list.map(mapTeamGameStats).filter((t: TeamGameStats | null): t is TeamGameStats => t !== null);
}

export interface PlayerGameStatLine {
  player: { id: string; name: string };
  category?: string;
  stats: GameStatLine[];
}

export interface TeamPlayerGameStats {
  team: SportsTeam;
  players: PlayerGameStatLine[];
}

/** Pure: one team's row from /games/statistics/players → our shape.
 *  Handles both a players array directly under the team and players nested
 *  under named statistical groups (Passing, Rushing, ...) — real
 *  conventions this provider family uses elsewhere for per-category
 *  breakdowns. Exported for tests. */
export function mapTeamPlayerGameStats(item: unknown): TeamPlayerGameStats | null {
  const it = item as Record<string, any> | null | undefined;
  const t = it?.team;
  if (!t?.id || !t?.name) return null;
  const players: PlayerGameStatLine[] = [];

  const readPlayerRow = (p: any, category?: string) => {
    const player = p?.player;
    if (!player?.id || !player?.name) return;
    const rawStats: unknown[] = Array.isArray(p?.statistics) ? p.statistics : [];
    const stats = rawStats.flatMap(flattenStatEntry);
    if (stats.length) players.push({ player: { id: String(player.id), name: player.name }, category, stats });
  };

  const direct: any[] = Array.isArray(it?.players) ? it.players : [];
  for (const p of direct) readPlayerRow(p);

  const groups: any[] = Array.isArray(it?.groups) ? it.groups : [];
  for (const g of groups) {
    const category = typeof g?.name === "string" ? g.name : undefined;
    const groupPlayers: any[] = Array.isArray(g?.players) ? g.players : [];
    for (const p of groupPlayers) readPlayerRow(p, category);
  }

  return { team: { id: String(t.id), name: t.name, logoUrl: t.logo || undefined }, players };
}

export async function fetchGamePlayerStats(sport: SportSlug, gameExternalId: string): Promise<TeamPlayerGameStats[] | null> {
  if (!ApiSportsProvider.isConfigured(sport) || (sport !== "nfl" && sport !== "ncaaf") || !gameExternalId) return null;
  const json = await apiSportsFetch(sport, "/games/statistics/players", { id: gameExternalId });
  const list = Array.isArray((json as any)?.response) ? (json as any).response : null;
  if (!list) return null;
  return list.map(mapTeamPlayerGameStats).filter((t: TeamPlayerGameStats | null): t is TeamPlayerGameStats => t !== null);
}
