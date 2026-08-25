// ── SportsDataIO — players, transactions, award-race futures (SERVER ONLY) ──
// Powers Player Search and Magical Heisman/MVP Watch. SPORTSDATAIO_API_KEY
// never reaches the client — every call here runs on the server, behind a
// requireAccount-gated route or server action.
//
// SportsDataIO's Futures/BettingMarkets product uses numeric market-type ids
// that vary by league and aren't guaranteed stable, so rather than hardcode
// one we resolve it live from BettingMarketTypes by matching its Name (e.g.
// "MVP", "Heisman Trophy") — the same "ask the provider, never hardcode"
// discipline this codebase already uses for league artwork (see
// getDefaultLeagueBrand in providers/sports.ts). Any endpoint, market, or
// field this trial key doesn't return comes back null/empty and the caller
// shows a graceful "unavailable" state — never fabricated.

export type SdioLeague = "nfl" | "cfb" | "nba" | "wnba";

const HOST: Record<SdioLeague, string> = {
  nfl: "api.sportsdata.io/v3/nfl",
  cfb: "api.sportsdata.io/v3/cfb",
  nba: "api.sportsdata.io/v3/nba",
  wnba: "api.sportsdata.io/v3/wnba",
};

// College football uses roster/transfer language, never "trade" — a
// transaction feed isn't guaranteed for cfb, so this stays NFL/NBA/WNBA only.
const TRANSACTIONS_SUPPORTED: ReadonlySet<SdioLeague> = new Set(["nfl", "nba", "wnba"]);

export interface SdioPlayer {
  playerId: string;
  name: string;
  league: SdioLeague;
  team?: string;
  teamId?: string;
  position?: string;
  number?: number; // real jersey number, per the provider — never invented
  status?: string; // Active, Injured Reserve, Free Agent, etc. — provider's own label
  photoUrl?: string;
  age?: number;
  birthDate?: string; // ISO, provider's own BirthDate — for a real DOB display, not just derived age
  college?: string;
  experienceYears?: number; // seasons played, per the provider's own count
  /** Below: fields the standard SportsDataIO Player object documents for its
   *  NFL/CFB/NBA/WNBA products but this codebase hasn't previously read —
   *  same graceful-degrade discipline as everything else here: absent or
   *  unrecognized shape just leaves the field undefined, never guessed. */
  heightInches?: number;
  weightLbs?: number;
  birthCity?: string;
  birthState?: string;
  highSchool?: string;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  draftTeam?: string;
}

export interface SdioTransaction {
  date?: string; // ISO
  type?: string; // e.g. "Trade", "Waived", "Signed"
  team?: string;
  description?: string;
  playerId?: string; // the transaction's own PlayerID, for filtering to one player's timeline
}

export interface AwardRaceEntry {
  league: SdioLeague;
  award: string; // "Heisman" | "MVP"
  playerId: string;
  playerName: string;
  team?: string;
  position?: string;
  currentRank?: number;
  previousRank?: number;
  movement?: "up" | "down" | "same";
  seasonStats?: string; // provider's own stat line summary, never invented
  teamRecord?: string;
  futuresConsensus?: string; // e.g. "+450" — a betting-market signal, not a vote count
  lastUpdated: string; // ISO, when we fetched it
  source: "SportsDataIO";
}

function apiKey(): string | undefined {
  return process.env.SPORTSDATAIO_API_KEY?.trim() || undefined;
}

// Same fail-fast guard as apiSportsFetch in providers/sports.ts — a hung
// upstream connection must never run out the serverless function's own
// execution-time limit (which returns a raw platform error page instead of
// this module's honest null).
const PROVIDER_TIMEOUT_MS = 8_000;

async function sdioFetch(league: SdioLeague, path: string): Promise<unknown | null> {
  const key = apiKey();
  if (!key) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${HOST[league]}${path}`, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      next: { revalidate: 900 },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Age computed from the provider's own BirthDate — never guessed. Falls
 *  back to the provider's own Age field (some SportsDataIO endpoints
 *  return one directly) when BirthDate itself is missing or unparsable. */
function deriveAge(p: any): number | undefined {
  const birthDate = p?.BirthDate;
  if (typeof birthDate === "string") {
    const d = new Date(birthDate);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const beforeBirthdayThisYear = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
      if (beforeBirthdayThisYear) age -= 1;
      if (age > 0 && age < 100) return age;
    }
  }
  return typeof p?.Age === "number" && p.Age > 0 ? p.Age : undefined;
}

/** Height in total inches from whatever shape the provider used — a plain
 *  number (already inches), or a "6'2"" / "6-2" feet-inches string. Returns
 *  undefined rather than guess on an unrecognized shape. */
function parseHeightInches(v: unknown): number | undefined {
  if (typeof v === "number" && v > 0 && v < 100) return v;
  if (typeof v === "string") {
    const m = v.match(/(\d+)['\-](\d+)/);
    if (m) return Number(m[1]) * 12 + Number(m[2]);
  }
  return undefined;
}

/** Exported for tests. */
export function toPlayer(league: SdioLeague, p: any): SdioPlayer | null {
  const id = p?.PlayerID ?? p?.PlayerId;
  const name = p?.Name ?? [p?.FirstName, p?.LastName].filter(Boolean).join(" ");
  if (id == null || !name) return null;
  return {
    playerId: String(id),
    name,
    league,
    team: p?.Team ?? p?.TeamName ?? undefined,
    teamId: p?.TeamID != null ? String(p.TeamID) : undefined,
    position: p?.Position ?? p?.FantasyPosition ?? undefined,
    number: typeof p?.Jersey === "number" ? p.Jersey : typeof p?.JerseyNumber === "number" ? p.JerseyNumber : undefined,
    status: p?.Status ?? undefined,
    photoUrl: typeof p?.PhotoUrl === "string" && p.PhotoUrl.startsWith("http") ? p.PhotoUrl : undefined,
    age: deriveAge(p),
    birthDate: typeof p?.BirthDate === "string" && !Number.isNaN(+new Date(p.BirthDate)) ? new Date(p.BirthDate).toISOString() : undefined,
    college: [p?.College, p?.CollegeName].find((v) => typeof v === "string" && v.trim())?.trim(),
    experienceYears: parseExperience(p?.Experience ?? p?.ExperienceSeasons ?? p?.Seasons),
    heightInches: parseHeightInches(p?.Height),
    weightLbs: typeof p?.Weight === "number" && p.Weight > 0 ? p.Weight : undefined,
    birthCity: typeof p?.BirthCity === "string" && p.BirthCity.trim() ? p.BirthCity.trim() : undefined,
    birthState: typeof p?.BirthState === "string" && p.BirthState.trim() ? p.BirthState.trim() : undefined,
    highSchool: typeof p?.HighSchool === "string" && p.HighSchool.trim() ? p.HighSchool.trim() : undefined,
    draftYear: typeof p?.CollegeDraftYear === "number" ? p.CollegeDraftYear : undefined,
    draftRound: typeof p?.CollegeDraftRound === "number" ? p.CollegeDraftRound : undefined,
    draftPick: typeof p?.CollegeDraftPick === "number" ? p.CollegeDraftPick : undefined,
    draftTeam: typeof p?.CollegeDraftTeam === "string" && p.CollegeDraftTeam.trim() ? p.CollegeDraftTeam.trim() : undefined,
  };
}

function parseExperience(v: unknown): number | undefined {
  if (typeof v === "number") return v >= 0 ? v : undefined;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

/** Full active-roster player list for a league, used as the search index.
 *  Cache this at the call site (DiscoveryCache) — it's a large, slow-moving
 *  list, not something to refetch per keystroke. */
export async function fetchAllPlayers(league: SdioLeague): Promise<SdioPlayer[] | null> {
  const json = await sdioFetch(league, "/scores/json/Players");
  if (!Array.isArray(json)) return null;
  const players = json.map((p) => toPlayer(league, p)).filter((p): p is SdioPlayer => p !== null);
  return players.length ? players : null;
}

/** Recent transactions/roster moves league-wide for the current season —
 *  filtered down to one player's by playerId at the call site. Returns null
 *  (not []) when the league doesn't expose a transaction feed at all, so
 *  callers can tell "not supported" from "nothing recent." */
export async function fetchRecentTransactions(league: SdioLeague, season: number): Promise<SdioTransaction[] | null> {
  if (!TRANSACTIONS_SUPPORTED.has(league)) return null;
  const json = await sdioFetch(league, `/scores/json/Transactions/${season}`);
  if (!Array.isArray(json)) return null;
  return json
    .map((t: any) => ({
      date: typeof t?.Date === "string" ? new Date(t.Date).toISOString() : undefined,
      type: t?.TransactionType ?? t?.Type ?? undefined,
      team: t?.Team ?? undefined,
      description: t?.Description ?? undefined,
      playerId: t?.PlayerID != null ? String(t.PlayerID) : undefined,
    }))
    .filter((t: any) => t.description || t.type);
}

/** Resolves a betting-market-type id by matching its provider-given Name
 *  (case-insensitive substring) rather than a hardcoded id. Returns null if
 *  this league/plan doesn't expose that market at all. */
async function resolveBettingMarketTypeId(league: SdioLeague, nameMatch: RegExp): Promise<string | null> {
  const json = await sdioFetch(league, "/odds/json/BettingMarketTypes");
  if (!Array.isArray(json)) return null;
  const match = json.find((m: any) => typeof m?.Name === "string" && nameMatch.test(m.Name));
  return match?.BettingMarketTypeID != null ? String(match.BettingMarketTypeID) : null;
}

/** One award-race futures market (Heisman, NFL/NBA/WNBA MVP), normalized.
 *  `season` is the 4-digit year the futures market covers. Returns [] when
 *  the market can't be located or the trial plan doesn't include Futures —
 *  never invented. */
export async function fetchAwardFutures(league: SdioLeague, award: "Heisman" | "MVP", season: number): Promise<AwardRaceEntry[]> {
  const marketTypeId = await resolveBettingMarketTypeId(league, award === "Heisman" ? /heisman/i : /\bmvp\b/i);
  if (!marketTypeId) return [];
  const json = await sdioFetch(league, `/odds/json/BettingFuturesByBettingMarketType/${season}/${marketTypeId}`);
  const markets = Array.isArray(json) ? json : Array.isArray((json as any)?.BettingOutcomes) ? [json] : null;
  if (!markets) return [];

  const now = new Date().toISOString();
  const entries: AwardRaceEntry[] = [];
  for (const market of markets) {
    const outcomes = Array.isArray((market as any)?.BettingOutcomes) ? (market as any).BettingOutcomes : [];
    outcomes.forEach((o: any, i: number) => {
      const playerName = o?.PlayerName ?? o?.Name;
      const playerId = o?.PlayerID != null ? String(o.PlayerID) : undefined;
      if (!playerName) return;
      entries.push({
        league,
        award,
        playerId: playerId ?? `${league}-${award}-${i}`,
        playerName,
        team: o?.Team ?? undefined,
        position: o?.Position ?? undefined,
        currentRank: i + 1,
        futuresConsensus: typeof o?.Payout === "number" ? (o.Payout > 0 ? `+${o.Payout}` : String(o.Payout)) : undefined,
        lastUpdated: now,
        source: "SportsDataIO",
      });
    });
  }
  return entries;
}

export function sdioConfigured(): boolean {
  return Boolean(apiKey());
}

/** True once SPORTSDATAIO_COMMERCIAL_DATA="true" is set — flip this the day
 *  the account moves off SportsDataIO's free trial (which is known to return
 *  scrambled values for some fields, e.g. a player's team). Until then,
 *  every SportsDataIO-driven surface (player search, tracked players,
 *  Magical Watch award races) is restricted to owner/admin preview only —
 *  see isOwnerAccount in lib/guard.ts — so members never see unverified
 *  trial data presented as real. No code change needed to go live for
 *  everyone once this flips: callers already check it. */
export function sdioCommercialMode(): boolean {
  return process.env.SPORTSDATAIO_COMMERCIAL_DATA === "true";
}

// A handful of headline stat fields per sport, in priority order — whatever
// the provider actually returns gets joined into a short summary. Nothing
// here is invented; a field simply drops out of the summary if it's absent
// or the whole call fails.
const STAT_FIELDS: Record<SdioLeague, { field: string; label: string }[]> = {
  nfl: [{ field: "PassingYards", label: "pass yds" }, { field: "PassingTouchdowns", label: "pass TD" }, { field: "RushingYards", label: "rush yds" }, { field: "RushingTouchdowns", label: "rush TD" }, { field: "ReceivingYards", label: "rec yds" }, { field: "ReceivingTouchdowns", label: "rec TD" }],
  cfb: [{ field: "PassingYards", label: "pass yds" }, { field: "PassingTouchdowns", label: "pass TD" }, { field: "RushingYards", label: "rush yds" }, { field: "RushingTouchdowns", label: "rush TD" }, { field: "ReceivingYards", label: "rec yds" }],
  nba: [{ field: "Points", label: "PPG" }, { field: "Rebounds", label: "RPG" }, { field: "Assists", label: "APG" }],
  wnba: [{ field: "Points", label: "PPG" }, { field: "Rebounds", label: "RPG" }, { field: "Assists", label: "APG" }],
};

async function fetchPlayerSeasonStatsRows(league: SdioLeague, playerId: string, season: number): Promise<any[]> {
  const json = await sdioFetch(league, `/stats/json/PlayerSeasonStatsByPlayerID/${season}/${playerId}`);
  if (Array.isArray(json)) return json.filter((r) => r && typeof r === "object");
  return json && typeof json === "object" ? [json] : [];
}

/** Best-effort season-stat summary for one player (e.g. "3,842 pass yds ·
 *  31 pass TD"). Returns undefined — not a fabricated line — when the stats
 *  endpoint has nothing real for this player/season. */
export async function fetchPlayerSeasonStatSummary(league: SdioLeague, playerId: string, season: number): Promise<string | undefined> {
  const rows = (await fetchPlayerSeasonStatsRows(league, playerId, season)).filter((r) => !looksLikeScrambledStats(league, r));
  const row = rows[0];
  if (!row) return undefined;
  const parts = STAT_FIELDS[league]
    .map(({ field, label }) => {
      const v = row[field];
      return typeof v === "number" && v !== 0 ? `${v.toLocaleString("en-US")} ${label}` : null;
    })
    .filter((s): s is string => s !== null);
  return parts.length ? parts.slice(0, 3).join(" · ") : undefined;
}

// A wider raw-field allowlist for the Player Profile's structured stat
// panel — every field here is a standard SportsDataIO PlayerSeasonStats
// field name; the caller (position-aware UI) picks which subset to display
// for a given position. Fields absent from a given response simply don't
// appear in the returned object — never a fabricated zero.
const STRUCTURED_STAT_FIELDS: Record<SdioLeague, string[]> = {
  nfl: ["Games", "Started", "Completions", "PassingAttempts", "PassingYards", "PassingTouchdowns", "PassingInterceptions", "PassingCompletionPercentage", "RushingAttempts", "RushingYards", "RushingYardsPerAttempt", "RushingTouchdowns", "RushingLong", "Receptions", "ReceivingYards", "ReceivingYardsPerReception", "ReceivingTouchdowns", "ReceivingLong", "Tackles", "SoloTackles", "TacklesForLoss", "Sacks", "Interceptions", "PassesDefended", "FumblesForced"],
  cfb: ["Games", "Started", "Completions", "PassingAttempts", "PassingYards", "PassingTouchdowns", "PassingInterceptions", "PassingCompletionPercentage", "RushingAttempts", "RushingYards", "RushingYardsPerAttempt", "RushingTouchdowns", "RushingLong", "Receptions", "ReceivingYards", "ReceivingYardsPerReception", "ReceivingTouchdowns", "ReceivingLong", "Tackles", "SoloTackles", "TacklesForLoss", "Sacks", "Interceptions", "PassesDefended", "FumblesForced"],
  nba: ["Games", "Minutes", "Points", "Rebounds", "Assists", "Steals", "BlockedShots", "Turnovers", "FieldGoalsPercentage", "ThreePointersPercentage", "FreeThrowsPercentage"],
  wnba: ["Games", "Minutes", "Points", "Rebounds", "Assists", "Steals", "BlockedShots", "Turnovers", "FieldGoalsPercentage", "ThreePointersPercentage", "FreeThrowsPercentage"],
};

// Real NFL/CFB counting stats are always whole numbers — EXCEPT tackle-
// family fields (Tackles, TacklesForLoss, Sacks), which the league itself
// scores in halves for an assisted play (e.g. "2.5 sacks" is a real,
// official stat, not corrupted data). Every other counting field here is
// never fractional in an actual completed-game/season line, so a decimal
// value (e.g. "60.6 receptions") is a reliable signal that the response is
// projection/fantasy/trial-scrambled data rather than a real historical
// stat line — SportsDataIO's own trial-key documentation notes some
// endpoints return obfuscated values as an anti-scraping measure. Rate
// fields (percentages, per-attempt averages) are legitimately decimal and
// are intentionally left out of this list.
const INTEGER_STAT_FIELDS: Record<SdioLeague, string[]> = {
  nfl: ["Games", "Started", "Completions", "PassingAttempts", "PassingYards", "PassingTouchdowns", "PassingInterceptions", "RushingAttempts", "RushingYards", "RushingTouchdowns", "RushingLong", "Receptions", "ReceivingYards", "ReceivingTouchdowns", "ReceivingLong", "SoloTackles", "Interceptions", "PassesDefended", "FumblesForced"],
  cfb: ["Games", "Started", "Completions", "PassingAttempts", "PassingYards", "PassingTouchdowns", "PassingInterceptions", "RushingAttempts", "RushingYards", "RushingTouchdowns", "RushingLong", "Receptions", "ReceivingYards", "ReceivingTouchdowns", "ReceivingLong", "SoloTackles", "Interceptions", "PassesDefended", "FumblesForced"],
  nba: ["Games", "Points", "Rebounds", "Assists", "Steals", "BlockedShots", "Turnovers"],
  wnba: ["Games", "Points", "Rebounds", "Assists", "Steals", "BlockedShots", "Turnovers"],
};

/** True when a real SportsDataIO PlayerSeasonStats row reports a fractional
 *  value for a stat that is never fractional in real completed-game data
 *  (e.g. 60.6 receptions) — the signature of projection/fantasy/trial-
 *  scrambled data rather than an actual historical stat line. Exported for
 *  tests. A row that fails this check is rejected outright rather than
 *  partially trusted, since scrambled data corrupts the whole row, not just
 *  the one field that happened to reveal it. */
export function looksLikeScrambledStats(league: SdioLeague, row: Record<string, unknown>): boolean {
  return INTEGER_STAT_FIELDS[league].some((field) => {
    const v = row[field];
    return typeof v === "number" && Number.isFinite(v) && !Number.isInteger(v);
  });
}

export interface PlayerSeasonStatsRow {
  team?: string;
  stats: Record<string, number>;
}

/** Structured season stats for one player, one row per real team the
 *  provider reports them under for that season (almost always one row; two
 *  when the player was traded/claimed mid-season and the provider preserves
 *  a per-team split) — every real numeric field from STRUCTURED_STAT_FIELDS,
 *  keyed by the provider's own field name. Powers the Player Profile's
 *  position-aware stat panel and year-by-year table.
 *
 *  A row whose counting stats look projection/trial-scrambled (see
 *  looksLikeScrambledStats) is dropped entirely rather than shown as if it
 *  were real — per the Magical Sports Data Policy, a source that fails
 *  validation is rejected and the caller falls back to "unavailable" for
 *  that season rather than display wrong-but-authoritative-looking numbers.
 *  (API-Sports and a verified official source are the next two tiers this
 *  policy calls for; neither currently has a per-player season-stats feed
 *  wired into this codebase, so today the chain ends here — same documented
 *  gap as the rest of this file's provider-tier comments.)
 *
 *  Returns [] when the endpoint has nothing real for this player/season. */
export async function fetchPlayerSeasonStats(league: SdioLeague, playerId: string, season: number): Promise<PlayerSeasonStatsRow[]> {
  const rows = await fetchPlayerSeasonStatsRows(league, playerId, season);
  const out: PlayerSeasonStatsRow[] = [];
  for (const row of rows) {
    if (looksLikeScrambledStats(league, row)) continue;
    const stats: Record<string, number> = {};
    for (const field of STRUCTURED_STAT_FIELDS[league]) {
      const v = row[field];
      if (typeof v === "number") stats[field] = v;
    }
    if (Object.keys(stats).length) {
      const team = typeof row.Team === "string" ? row.Team : typeof row.TeamName === "string" ? row.TeamName : undefined;
      out.push({ team, stats });
    }
  }
  return out;
}

// ── NFL weekly player/defense stats — Fantasy Football scoring ──────────
// Field names verified against SportsDataIO's own published NFL Stats API
// OpenAPI spec (sportsdataio-nfl-v3-stats-api-openapi.yml) rather than
// guessed — this sandbox has no live SPORTSDATAIO_API_KEY to smoke-test
// against, so treat this as high-confidence-but-unverified-live the same
// way other provider-schema work in this codebase is disclosed, and
// smoke-test once deployed with a real key.

export interface SdioPlayerWeekStats {
  playerId: string;
  name: string;
  team?: string;
  position?: string;
  played: boolean;
  isGameOver: boolean;
  passingYards: number;
  passingTouchdowns: number;
  passingInterceptions: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  fumblesLost: number;
  fieldGoalsMade: number;
  extraPointsMade: number;
  /** The provider's own computed standard fantasy points — kept for
   *  reference/cross-check only. Magical Fantasy scores from the raw
   *  counting stats above via our own rules (fantasy.ts computeFantasyPoints)
   *  rather than trusting this number as the scored result, per "we own the
   *  game rules." */
  providerFantasyPoints?: number;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Real per-player stats for one NFL week — updates live as games are
 *  played (per SportsDataIO's own docs), so this is the right endpoint for
 *  both a live-during-games poll and the final weekly score once every
 *  game has gone final. Returns [] on missing config or a failed call —
 *  never fabricated stats. */
export async function fetchPlayerGameStatsByWeek(season: number, week: number): Promise<SdioPlayerWeekStats[]> {
  const json = await sdioFetch("nfl", `/stats/json/PlayerGameStatsByWeek/${season}/${week}`);
  if (!Array.isArray(json)) return [];
  return json
    .map((p: any): SdioPlayerWeekStats | null => {
      if (p?.PlayerID == null || typeof p?.Name !== "string") return null;
      return {
        playerId: String(p.PlayerID),
        name: p.Name,
        team: typeof p.Team === "string" ? p.Team : undefined,
        position: typeof p.Position === "string" ? p.Position : undefined,
        played: Boolean(p.Played),
        isGameOver: Boolean(p.IsGameOver),
        passingYards: num(p.PassingYards),
        passingTouchdowns: num(p.PassingTouchdowns),
        passingInterceptions: num(p.PassingInterceptions),
        rushingYards: num(p.RushingYards),
        rushingTouchdowns: num(p.RushingTouchdowns),
        receptions: num(p.Receptions),
        receivingYards: num(p.ReceivingYards),
        receivingTouchdowns: num(p.ReceivingTouchdowns),
        fumblesLost: num(p.FumblesLost),
        fieldGoalsMade: num(p.FieldGoalsMade),
        extraPointsMade: num(p.ExtraPointsMade),
        providerFantasyPoints: typeof p.FantasyPoints === "number" ? p.FantasyPoints : undefined,
      };
    })
    .filter((p): p is SdioPlayerWeekStats => p !== null);
}

export interface SdioTeamDefenseWeekStats {
  team: string;
  sacks: number;
  interceptions: number;
  fumblesRecovered: number;
  touchdownsScored: number;
  pointsAllowed: number;
  safeties: number;
}

/** Real team defense/special-teams stats for one NFL week — the DST slot's
 *  scoring source (a team defense isn't a row in PlayerGameStatsByWeek).
 *  Returns [] on missing config or a failed call. */
export async function fetchTeamDefenseGameStatsByWeek(season: number, week: number): Promise<SdioTeamDefenseWeekStats[]> {
  const json = await sdioFetch("nfl", `/stats/json/FantasyDefenseByGame/${season}/${week}`);
  if (!Array.isArray(json)) return [];
  return json
    .map((d: any): SdioTeamDefenseWeekStats | null => {
      const team = typeof d?.Team === "string" ? d.Team : undefined;
      if (!team) return null;
      return {
        team,
        sacks: num(d.Sacks),
        interceptions: num(d.Interceptions),
        fumblesRecovered: num(d.FumblesRecovered),
        touchdownsScored: num(d.TouchdownsScored),
        pointsAllowed: num(d.PointsAllowed),
        safeties: num(d.Safeties),
      };
    })
    .filter((d): d is SdioTeamDefenseWeekStats => d !== null);
}

/** The real, provider-reported current NFL week/season — never inferred
 *  from today's date (NFL weeks run Tue–Mon, not Sun–Sat, and preseason/
 *  postseason numbering doesn't follow a simple calendar formula, so a
 *  guessed week risks scoring the wrong week entirely). Returns null on
 *  missing config or a failed call. */
export async function fetchCurrentNflWeek(): Promise<number | null> {
  const json = await sdioFetch("nfl", "/scores/json/CurrentWeek");
  return typeof json === "number" ? json : null;
}

export async function fetchCurrentNflSeason(): Promise<number | null> {
  const json = await sdioFetch("nfl", "/scores/json/CurrentSeason");
  return typeof json === "number" ? json : null;
}

export interface SdioGame {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO
  status?: string;
  channel?: string;
}

/** Maps one SportsDataIO /scores/json/Games/{season} row. SportsDataIO
 *  doesn't return team logos on this endpoint (unlike API-Sports), so
 *  callers show a placeholder rather than an invented crest. Exported for
 *  tests. */
export function toSdioGame(g: any): SdioGame | null {
  const id = g?.GameID ?? g?.GameId ?? g?.GameKey;
  const dateTime = g?.DateTime ?? g?.DateTimeUTC ?? g?.Day;
  const home = g?.HomeTeamName ?? g?.HomeTeam;
  const away = g?.AwayTeamName ?? g?.AwayTeam;
  if (id == null || !dateTime || !home || !away) return null;
  const startsAt = new Date(dateTime);
  if (Number.isNaN(+startsAt)) return null;
  return {
    externalId: String(id),
    homeTeam: String(home),
    awayTeam: String(away),
    startsAt: startsAt.toISOString(),
    status: typeof g?.Status === "string" ? g.Status : undefined,
    channel: typeof g?.Channel === "string" ? g.Channel : undefined,
  };
}

/** The earliest real, not-yet-started game for an NBA season key
 *  ("2026" for the 2026-27 regular season, "2026PRE" for its preseason —
 *  SportsDataIO's own convention for separating the two). A secondary
 *  source to API-Sports: used only when API-Sports hasn't ingested the
 *  season yet. Returns null on missing config, a failed call, or no
 *  games in that key — never a computed/assumed date. */
export async function fetchNbaFirstGame(seasonKey: string): Promise<SdioGame | null> {
  const json = await sdioFetch("nba", `/scores/json/Games/${seasonKey}`);
  if (!Array.isArray(json)) return null;
  const games = json.map(toSdioGame).filter((g): g is SdioGame => g !== null && g.status !== "Canceled");
  games.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const now = Date.now();
  return games.find((g) => +new Date(g.startsAt) > now) ?? null;
}

/** Real games scheduled for one calendar date ("YYYY-MM-DD") in a given
 *  league — secondary source for the Today's Games panel when API-Sports
 *  has nothing for that date yet. Same GamesByDate endpoint SportsDataIO
 *  documents uniformly across its NFL/CFB/NBA/WNBA score feeds, so this is
 *  shared rather than duplicated per league. Returns null on missing
 *  config or a failed call; [] only when the provider itself has no games
 *  that day. */
export async function fetchGamesByDate(league: SdioLeague, dateISO: string): Promise<SdioGame[] | null> {
  const json = await sdioFetch(league, `/scores/json/GamesByDate/${dateISO}`);
  if (!Array.isArray(json)) return null;
  return json.map(toSdioGame).filter((g): g is SdioGame => g !== null);
}

export interface SdioStandingRow {
  team: string;
  teamId?: string;
  /** The provider's short team code (e.g. "BOS") — real, never derived from
   *  the full name. A verified secondary identity signal only; TeamID is
   *  always the primary key for cross-provider team resolution. */
  key?: string;
  wins: number;
  losses: number;
}

// Exported for tests.
export function toSdioStandingRow(t: any): SdioStandingRow | null {
  const team = t?.Name ?? t?.Team;
  const wins = t?.Wins;
  const losses = t?.Losses;
  if (!team || typeof wins !== "number" || typeof losses !== "number") return null;
  return { team: String(team), teamId: t?.TeamID != null ? String(t.TeamID) : undefined, key: typeof t?.Key === "string" ? t.Key : undefined, wins, losses };
}

/** Real standings for a season in a given league — secondary source for the
 *  Standings panel when API-Sports has nothing yet. Same /Standings/{season}
 *  shape across NFL/CFB/NBA/WNBA. Returns null on missing config, a failed
 *  call, or a response with no usable win/loss rows — never a guessed
 *  record. */
export async function fetchStandings(league: SdioLeague, season: number): Promise<SdioStandingRow[] | null> {
  const json = await sdioFetch(league, `/scores/json/Standings/${season}`);
  if (!Array.isArray(json)) return null;
  const rows = json.map(toSdioStandingRow).filter((r): r is SdioStandingRow => r !== null);
  return rows.length ? rows : null;
}

/** Best-effort "W-L" (or "W-L-T") record for a team from season standings.
 *  Returns undefined when the team can't be matched in the standings
 *  response — never a guessed record. */
export async function fetchTeamRecord(league: SdioLeague, teamKey: string | undefined, season: number): Promise<string | undefined> {
  if (!teamKey) return undefined;
  const json = await sdioFetch(league, `/scores/json/Standings/${season}`);
  if (!Array.isArray(json)) return undefined;
  const row = json.find((t: any) => t?.Team === teamKey || t?.Key === teamKey || String(t?.TeamID) === teamKey);
  if (!row) return undefined;
  const wins = row?.Wins;
  const losses = row?.Losses;
  const ties = row?.Ties;
  if (typeof wins !== "number" || typeof losses !== "number") return undefined;
  return typeof ties === "number" && ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export interface SdioInjury {
  playerId: string;
  playerName: string;
  team?: string;
  teamId?: string;
  position?: string;
  status?: string; // Out, Doubtful, Questionable, Probable — provider's own label
  bodyPart?: string;
  practiceStatus?: string;
  updated?: string; // ISO, per the provider's own timestamp
}

/** Maps one /stats/json/InjuredPlayers row. Exported for tests. */
export function toSdioInjury(r: any): SdioInjury | null {
  const id = r?.PlayerID ?? r?.PlayerId;
  const name = r?.Name ?? [r?.FirstName, r?.LastName].filter(Boolean).join(" ");
  if (id == null || !name) return null;
  return {
    playerId: String(id),
    playerName: name,
    team: r?.Team ?? undefined,
    teamId: r?.TeamID != null ? String(r.TeamID) : undefined,
    position: r?.Position ?? undefined,
    status: r?.InjuryStatus ?? r?.Status ?? undefined,
    bodyPart: r?.InjuryBodyPart ?? r?.BodyPart ?? undefined,
    practiceStatus: r?.InjuryPractice ?? undefined,
    updated: typeof r?.Updated === "string" ? r.Updated : typeof r?.InjuryStartDate === "string" ? r.InjuryStartDate : undefined,
  };
}

/** Current league-wide injury list — the same /stats/json/InjuredPlayers
 *  convention SportsDataIO documents across its NFL/CFB/NBA/WNBA products
 *  (a live, current snapshot rather than a per-week report). Like the rest
 *  of this file's less-certain endpoints, this hasn't been confirmed
 *  against live docs since this environment has no active key — a shape
 *  mismatch simply degrades to null rather than throwing. Filter the result
 *  to one team/player at the call site. Returns null on missing config, a
 *  failed call, or a response this parser can't recognize; [] only when the
 *  provider itself currently has no injuries listed. */
export async function fetchInjuries(league: SdioLeague): Promise<SdioInjury[] | null> {
  const json = await sdioFetch(league, "/stats/json/InjuredPlayers");
  if (!Array.isArray(json)) return null;
  return json.map(toSdioInjury).filter((i): i is SdioInjury => i !== null);
}

export interface SdioRanking {
  rank: number;
  team: string;
  teamId?: string;
  poll?: string; // "AP Top 25", "Coaches Poll", etc. — provider's own label
  points?: number;
  previousRank?: number;
}

/** Maps one CFB /scores/json/Rankings/{season}/{week} row. Exported for
 *  tests. */
export function toSdioRanking(r: any): SdioRanking | null {
  const rank = r?.Rank ?? r?.CoachesRank ?? r?.APRank;
  const team = r?.Name ?? r?.School ?? r?.Team;
  if (typeof rank !== "number" || !team) return null;
  return {
    rank,
    team: String(team),
    teamId: r?.TeamID != null ? String(r.TeamID) : undefined,
    poll: r?.Poll ?? undefined,
    points: typeof r?.Points === "number" ? r.Points : undefined,
    previousRank: typeof r?.PreviousRank === "number" ? r.PreviousRank : undefined,
  };
}

/** College Football's weekly poll rankings (AP/Coaches, per the provider) —
 *  the one league in this codebase's SportsDataIO coverage with a
 *  documented rankings feed; NFL/NBA/WNBA have no equivalent poll to fetch.
 *  Best-known endpoint shape, unconfirmed against live docs for the same
 *  reason as fetchInjuries above. Returns null on missing config, a failed
 *  call, or an unrecognized response; [] only when the provider itself has
 *  no rankings for that week yet — never a guessed order. */
export async function fetchRankings(season: number, week: number): Promise<SdioRanking[] | null> {
  const json = await sdioFetch("cfb", `/scores/json/Rankings/${season}/${week}`);
  if (!Array.isArray(json)) return null;
  return json.map(toSdioRanking).filter((r): r is SdioRanking => r !== null).sort((a, b) => a.rank - b.rank);
}
