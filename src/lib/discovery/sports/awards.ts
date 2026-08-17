// ── Sports — player search + Magical Watch award races (SERVER ONLY) ──────
// Orchestrates the SportsDataIO adapter: caches the (large, slow-moving)
// player roster per league, filters it for search, and enriches each award-
// race entry with season stats + team record. Called only from the player
// search route and the Sports page — never imported client-side.

import { withCache, cacheKeyFor } from "../cache";
import {
  fetchAllPlayers, fetchRecentTransactions, fetchAwardFutures,
  fetchPlayerSeasonStatSummary, fetchTeamRecord, sdioConfigured,
  type SdioLeague, type SdioPlayer, type SdioTransaction, type AwardRaceEntry,
} from "../providers/sportsdata";

const ROSTER_TTL = 360; // minutes — a league's active roster barely moves hour to hour
const AWARDS_TTL = 180; // minutes — futures odds move during the day but not by the minute

/** NFL/CFB seasons are named for the year they start (an August-through-
 *  January season is "this" year's season even in January); NBA/WNBA the
 *  same convention as used elsewhere for this app's other providers. */
function currentSeasonYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  return month <= 1 ? now.getFullYear() - 1 : now.getFullYear();
}

export interface PlayerSearchResult extends SdioPlayer {
  transactions: SdioTransaction[] | null; // null = league doesn't expose a transaction feed
  /** College players use roster/transfer language, never "trade." */
  movementLabel: "Trade" | "Roster Move";
  /** The most recent transaction that actually moved this player onto their
   *  CURRENT team (Signed/Trade/Claim types, team name matching). Only set
   *  when the provider's own transaction feed supports the inference —
   *  never a guessed or computed-from-silence date. */
  withCurrentTeamSince?: { date?: string; via?: string };
}

const JOIN_TYPES = /sign|trade|claim|activat/i;

export async function searchPlayers(query: string, league: SdioLeague): Promise<PlayerSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q || !sdioConfigured()) return [];

  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "sdio_roster", league }), ROSTER_TTL, () =>
    fetchAllPlayers(league));
  const roster = cached?.data ?? [];
  const matches = roster.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 12);
  if (!matches.length) return [];

  const season = currentSeasonYear();
  const txCached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "sdio_transactions", league, season }), ROSTER_TTL, () =>
    fetchRecentTransactions(league, season));
  const txByPlayer = new Map<string, SdioTransaction[]>();
  for (const t of (txCached?.data ?? []) as (SdioTransaction & { playerId?: string })[]) {
    if (!t.playerId) continue;
    const list = txByPlayer.get(t.playerId) ?? [];
    list.push(t);
    txByPlayer.set(t.playerId, list);
  }

  return matches.map((p) => {
    const playerTx = txByPlayer.get(p.playerId) ?? [];
    const joinEvent = playerTx
      .filter((t) => t.team && p.team && t.team === p.team && t.type && JOIN_TYPES.test(t.type) && t.date)
      .sort((a, b) => +new Date(b.date!) - +new Date(a.date!))[0];
    return {
      ...p,
      transactions: txCached?.data === null ? null : playerTx,
      movementLabel: league === "cfb" ? "Roster Move" : "Trade",
      withCurrentTeamSince: joinEvent ? { date: joinEvent.date, via: joinEvent.type } : undefined,
    };
  });
}

export async function getAwardRace(league: SdioLeague, award: "Heisman" | "MVP"): Promise<AwardRaceEntry[]> {
  if (!sdioConfigured()) return [];
  const season = currentSeasonYear();
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "sdio_award", league, award, season }), AWARDS_TTL, async () => {
    const entries = await fetchAwardFutures(league, award, season);
    if (!entries.length) return entries;
    const enriched = await Promise.all(entries.slice(0, 10).map(async (e) => ({
      ...e,
      seasonStats: await fetchPlayerSeasonStatSummary(league, e.playerId, season),
      teamRecord: await fetchTeamRecord(league, e.team, season),
    })));
    return enriched;
  });
  return cached?.data ?? [];
}

export const AWARD_RACES: { league: SdioLeague; award: "Heisman" | "MVP"; label: string }[] = [
  { league: "cfb", award: "Heisman", label: "Magical Heisman Watch" },
  { league: "nfl", award: "MVP", label: "NFL MVP Race" },
  { league: "nba", award: "MVP", label: "NBA MVP Race" },
  { league: "wnba", award: "MVP", label: "WNBA MVP Race" },
];
