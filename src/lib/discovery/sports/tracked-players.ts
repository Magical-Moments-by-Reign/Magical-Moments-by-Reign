// ── Sports — tracked players across leagues (SERVER ONLY) ─────────────────
// A member can track any number of players across NFL/CFB/NBA/WNBA at once.
// Only the pick itself is stored; current status/team/transactions are read
// live from SportsDataIO at render time via searchPlayers-style lookups so
// they're never stale. Every read/write degrades gracefully (never crashes
// the page) when the TrackedPlayer table hasn't been schema-pushed yet —
// same convention as watchlist.ts (see DEPLOY.md).

import { prisma } from "@/lib/db";
import { fetchAllPlayers, fetchRecentTransactions, type SdioLeague, type SdioPlayer, type SdioTransaction } from "../providers/sportsdata";
import { withCache, cacheKeyFor } from "../cache";

const ROSTER_TTL = 360;

export interface TrackedPlayerEntry {
  id: string; // TrackedPlayer row id
  league: SdioLeague;
  playerId: string;
  playerName: string;
  team?: string;
  position?: string;
  addedAt: Date;
  live: SdioPlayer | null; // null only when the live lookup can't find/reach this player right now
  transactions: SdioTransaction[] | null;
}

export async function getMyTrackedPlayers(accountId: string): Promise<TrackedPlayerEntry[]> {
  const rows = await prisma.trackedPlayer.findMany({ where: { accountId }, orderBy: { addedAt: "desc" } }).catch(() => []);
  if (!rows.length) return [];

  const leagues = [...new Set(rows.map((r) => r.league as SdioLeague))];
  const rosters = new Map<SdioLeague, SdioPlayer[]>();
  const txByLeague = new Map<SdioLeague, Map<string, SdioTransaction[]> | null>();
  const season = new Date().getFullYear();

  await Promise.all(leagues.map(async (league) => {
    const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "sdio_roster", league }), ROSTER_TTL, () => fetchAllPlayers(league));
    rosters.set(league, cached?.data ?? []);

    const txCached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "sdio_transactions", league, season }), ROSTER_TTL, () => fetchRecentTransactions(league, season));
    if (txCached?.data == null) { txByLeague.set(league, null); return; }
    const map = new Map<string, SdioTransaction[]>();
    for (const t of txCached.data as (SdioTransaction & { playerId?: string })[]) {
      if (!t.playerId) continue;
      const list = map.get(t.playerId) ?? [];
      list.push(t);
      map.set(t.playerId, list);
    }
    txByLeague.set(league, map);
  }));

  return rows.map((r) => {
    const league = r.league as SdioLeague;
    const live = rosters.get(league)?.find((p) => p.playerId === r.playerId) ?? null;
    const txMap = txByLeague.get(league);
    return {
      id: r.id,
      league,
      playerId: r.playerId,
      playerName: live?.name ?? r.playerName,
      team: live?.team ?? r.team ?? undefined,
      position: live?.position ?? r.position ?? undefined,
      addedAt: r.addedAt,
      live,
      transactions: txMap === null ? null : (txMap?.get(r.playerId) ?? []),
    };
  });
}

export async function trackPlayer(accountId: string, league: SdioLeague, playerId: string, playerName: string, team?: string, position?: string): Promise<void> {
  await prisma.trackedPlayer.upsert({
    where: { accountId_league_playerId: { accountId, league, playerId } },
    update: {},
    create: { accountId, league, playerId, playerName, team, position },
  }).catch(() => undefined);
}

export async function untrackPlayer(accountId: string, league: SdioLeague, playerId: string): Promise<void> {
  await prisma.trackedPlayer.deleteMany({ where: { accountId, league, playerId } }).catch(() => undefined);
}
