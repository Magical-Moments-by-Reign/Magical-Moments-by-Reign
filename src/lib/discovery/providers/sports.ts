// ── Sports — provider architecture (SERVER ONLY) ──────────────────
// API-Sports exposes each sport on its own host, but the response shapes are
// close cousins of each other (their whole product line shares one design).
// One ApiSportsProvider covers every sport we support today; SPORT_CONFIG is
// the only place that changes to add a sport. A future HIGH_SCHOOL_PROVIDER
// (or any other source) just implements the same SportsProvider interface —
// nothing else in the app changes. Never invents scores, standings, or teams;
// every method returns null on missing config or a failed/empty response.

export type SportSlug =
  | "nfl" | "ncaaf" | "nba" | "mlb" | "soccer" | "nhl" | "mma" | "rugby" | "volleyball" | "f1";

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
}

export interface SportsStanding {
  team: SportsTeam;
  wins?: number;
  losses?: number;
  ties?: number;
  rank?: number;
  summary?: string; // fallback display when the provider doesn't split W/L/T
}

/** Sports whose format is a two-side matchup — the only ones offered in the
 *  Pick / community-vote UI. F1 (a multi-entrant race, not head-to-head) and
 *  MMA (individual fighters, not team logos) are discoverable but excluded —
 *  "who you got" doesn't map cleanly onto either format. */
export const MATCHUP_SPORTS: SportSlug[] = ["nfl", "ncaaf", "nba", "mlb", "soccer", "nhl", "rugby", "volleyball"];

export interface SportsProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  readonly supportedSports: SportSlug[];
  isConfigured(sport?: SportSlug): boolean;
  gamesByDate(sport: SportSlug, dateISO: string, league?: string): Promise<SportsGameSummary[] | null>;
  gamesForTeam(sport: SportSlug, teamExternalId: string, opts?: { league?: string; season?: string }): Promise<SportsGameSummary[] | null>;
  searchTeams(sport: SportSlug, query: string, league?: string): Promise<SportsTeam[] | null>;
  standings(sport: SportSlug, league: string, season?: string): Promise<SportsStanding[] | null>;
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
  async gamesByDate(): Promise<SportsGameSummary[] | null> {
    return null;
  },
  async gamesForTeam(): Promise<SportsGameSummary[] | null> {
    return null;
  },
  async searchTeams(): Promise<SportsTeam[] | null> {
    return null;
  },
  async standings(): Promise<SportsStanding[] | null> {
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
  mlb: { host: "v1.baseball.api-sports.io", shape: "games", defaultLeague: "1" },
  soccer: { host: "v3.football.api-sports.io", shape: "fixtures", defaultLeague: "39" }, // Premier League
  nhl: { host: "v1.hockey.api-sports.io", shape: "games", defaultLeague: "57" },
  rugby: { host: "v1.rugby.api-sports.io", shape: "games", defaultLeague: "1" },
  volleyball: { host: "v1.volleyball.api-sports.io", shape: "games", defaultLeague: "1" },
  mma: { host: "v1.mma.api-sports.io", shape: "fights", defaultLeague: "" },
  f1: { host: "v1.formula-1.api-sports.io", shape: "races", defaultLeague: "" },
};

function apiKey(): string | undefined {
  return process.env.API_SPORTS_KEY?.trim() || undefined;
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
      next: { revalidate: false },
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
 *  basketball, baseball, hockey, rugby, volleyball all share this shape). */
function mapGameItem(sport: SportSlug, league: string, item: any): SportsGameSummary | null {
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

  async gamesByDate(sport, dateISO, league): Promise<SportsGameSummary[] | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const lg = league || cfg.defaultLeague;
    const path = cfg.shape === "fixtures" ? "/fixtures" : "/games";
    const dateParam = { date: dateISO };
    const json = await apiSportsFetch(sport, path, cfg.shape === "fixtures"
      ? { ...dateParam, league: lg, season: String(new Date(dateISO).getFullYear()) }
      : { ...dateParam, league: lg, season: String(new Date(dateISO).getFullYear()) });
    if (!json) return null;
    return mapGamesResponse(sport, lg, json);
  },

  async gamesForTeam(sport, teamExternalId, opts): Promise<SportsGameSummary[] | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const lg = opts?.league || cfg.defaultLeague;
    const season = opts?.season || String(new Date().getFullYear());
    const path = cfg.shape === "fixtures" ? "/fixtures" : "/games";
    const json = await apiSportsFetch(sport, path, { team: teamExternalId, league: lg, season });
    if (!json) return null;
    return mapGamesResponse(sport, lg, json);
  },

  async searchTeams(sport, query, league): Promise<SportsTeam[] | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const json = await apiSportsFetch(sport, "/teams", { search: query, league: league || cfg.defaultLeague });
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

  async standings(sport, league, season): Promise<SportsStanding[] | null> {
    if (!this.isConfigured(sport)) return null;
    const cfg = SPORT_CONFIG[sport];
    const yr = season || String(new Date().getFullYear());
    const json = await apiSportsFetch(sport, "/standings", { league, season: yr });
    const raw = (json as any)?.response;
    const flat: any[] = Array.isArray(raw)
      ? (Array.isArray(raw[0]) ? raw.flat() : Array.isArray(raw[0]?.league?.standings?.[0]) ? raw[0].league.standings.flat() : raw)
      : [];
    if (!flat.length) return null;
    return flat
      .map((row: any) => {
        const t = row?.team;
        if (!t?.id || !t?.name) return null;
        const wins = row?.games?.win?.total ?? row?.won ?? undefined;
        const losses = row?.games?.lose?.total ?? row?.lost ?? undefined;
        const ties = row?.games?.draw?.total ?? row?.draw ?? undefined;
        return {
          team: { id: String(t.id), name: t.name, logoUrl: t.logo || undefined },
          wins: typeof wins === "number" ? wins : undefined,
          losses: typeof losses === "number" ? losses : undefined,
          ties: typeof ties === "number" ? ties : undefined,
          rank: row?.position ?? row?.rank ?? undefined,
        } as SportsStanding;
      })
      .filter((s: SportsStanding | null): s is SportsStanding => s !== null);
    void cfg;
  },
};
