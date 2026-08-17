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
  status?: string; // Active, Injured Reserve, Free Agent, etc. — provider's own label
  photoUrl?: string;
}

export interface SdioTransaction {
  date?: string; // ISO
  type?: string; // e.g. "Trade", "Waived", "Signed"
  team?: string;
  description?: string;
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

async function sdioFetch(league: SdioLeague, path: string): Promise<unknown | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const res = await fetch(`https://${HOST[league]}${path}`, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toPlayer(league: SdioLeague, p: any): SdioPlayer | null {
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
    status: p?.Status ?? undefined,
    photoUrl: typeof p?.PhotoUrl === "string" && p.PhotoUrl.startsWith("http") ? p.PhotoUrl : undefined,
  };
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

/** Best-effort season-stat summary for one player (e.g. "3,842 pass yds ·
 *  31 pass TD"). Returns undefined — not a fabricated line — when the stats
 *  endpoint has nothing for this player/season. */
export async function fetchPlayerSeasonStatSummary(league: SdioLeague, playerId: string, season: number): Promise<string | undefined> {
  const path = league === "nfl" || league === "cfb"
    ? `/stats/json/PlayerSeasonStatsByPlayerID/${season}/${playerId}`
    : `/stats/json/PlayerSeasonStatsByPlayerID/${season}/${playerId}`;
  const json = await sdioFetch(league, path);
  const row = Array.isArray(json) ? json[0] : json;
  if (!row || typeof row !== "object") return undefined;
  const parts = STAT_FIELDS[league]
    .map(({ field, label }) => {
      const v = (row as any)[field];
      return typeof v === "number" && v !== 0 ? `${v.toLocaleString("en-US")} ${label}` : null;
    })
    .filter((s): s is string => s !== null);
  return parts.length ? parts.slice(0, 3).join(" · ") : undefined;
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
