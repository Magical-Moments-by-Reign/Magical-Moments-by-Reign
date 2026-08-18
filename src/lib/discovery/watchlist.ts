// ── Watch TV Show — personal lineup (SERVER ONLY) ──────────────────
// Only the member's own picks + favorite flag live in Postgres
// (WatchlistItem). Everything else — poster, network, next-episode date,
// season/episode — is read live from TMDB via getWatchDetails at render
// time, never duplicated or cached stale in our own table.

import { prisma } from "@/lib/db";
import { getWatchDetails, getRecommendedTv, getWatchItems } from "./service";
import type { WatchDetails, WatchItem } from "./providers/tmdb";

export interface LineupEntry {
  id: string; // WatchlistItem row id
  tmdbId: string;
  isFavorite: boolean;
  addedAt: Date;
  title: string;
  posterUrl?: string;
  /** null only when TMDB itself is unavailable right now — the row still
   *  renders using the title/poster snapshot taken when it was added. */
  details: WatchDetails | null;
}

/** Reads degrade to an empty lineup (never crash the page) when the
 *  WatchlistItem table hasn't been pushed to this environment's database
 *  yet — schema deploys are a deliberate manual step here (see DEPLOY.md),
 *  so a brand-new model can legitimately be missing for a while. */
export async function getMyLineup(accountId: string): Promise<LineupEntry[]> {
  const rows = await prisma.watchlistItem.findMany({ where: { accountId }, orderBy: { addedAt: "desc" } }).catch(() => []);
  const details = await Promise.all(rows.map((r) => getWatchDetails(r.tmdbId)));
  return rows.map((r, i) => ({
    id: r.id,
    tmdbId: r.tmdbId,
    isFavorite: r.isFavorite,
    addedAt: r.addedAt,
    title: details[i]?.title ?? r.title,
    posterUrl: details[i]?.posterUrl ?? r.posterUrl ?? undefined,
    details: details[i],
  }));
}

export async function addToLineup(accountId: string, tmdbId: string, title: string, posterUrl?: string): Promise<void> {
  await prisma.watchlistItem.upsert({
    where: { accountId_tmdbId: { accountId, tmdbId } },
    update: {},
    create: { accountId, tmdbId, title, posterUrl },
  }).catch(() => undefined);
}

export async function removeFromLineup(accountId: string, tmdbId: string): Promise<void> {
  await prisma.watchlistItem.deleteMany({ where: { accountId, tmdbId } }).catch(() => undefined);
}

export async function toggleFavorite(accountId: string, tmdbId: string): Promise<void> {
  const row = await prisma.watchlistItem.findUnique({ where: { accountId_tmdbId: { accountId, tmdbId } } }).catch(() => null);
  if (!row) return;
  await prisma.watchlistItem.update({ where: { id: row.id }, data: { isFavorite: !row.isFavorite } }).catch(() => undefined);
}

/** The very first time a member's lineup is checked, fills it with a
 *  handful of real trending shows so "Your Lineup" and the schedule table
 *  aren't blank on first visit — remove/add work normally afterward, and a
 *  member who clears their whole lineup stays honestly empty (this only
 *  ever runs once per account, tracked by Account.watchLineupSeeded). Never
 *  invents a show — the starter picks are the same live TMDB trending feed
 *  "Suggested For You" already uses. */
export async function seedStarterLineup(accountId: string): Promise<void> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { watchLineupSeeded: true } }).catch(() => null);
  if (!account || account.watchLineupSeeded) return;

  const existing = await prisma.watchlistItem.count({ where: { accountId } }).catch(() => 0);
  if (existing === 0) {
    const trending = await getWatchItems("trending");
    for (const item of trending.items.slice(0, 6)) {
      await addToLineup(accountId, item.id, item.title, item.posterUrl);
    }
  }

  await prisma.account.update({ where: { id: accountId }, data: { watchLineupSeeded: true } }).catch(() => undefined);
}

/** TMDB's own recommendations, seeded from up to 3 of the member's most
 *  recently added lineup shows, deduped against the lineup and against each
 *  other. Falls back to trending TV when the lineup is empty or TMDB
 *  returns nothing usable for any seed — never a fabricated suggestion. */
export async function getSuggestedForYou(accountId: string, limit = 10): Promise<WatchItem[]> {
  const lineupRows = await prisma.watchlistItem.findMany({ where: { accountId }, orderBy: { addedAt: "desc" } }).catch(() => []);
  const lineupIds = new Set(lineupRows.map((r) => r.tmdbId));

  if (lineupRows.length) {
    const recSets = await Promise.all(lineupRows.slice(0, 3).map((r) => getRecommendedTv(r.tmdbId)));
    const seen = new Set<string>();
    const merged: WatchItem[] = [];
    for (const set of recSets) {
      for (const item of set) {
        if (lineupIds.has(item.id) || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    }
    if (merged.length) return merged.slice(0, limit);
  }

  const trending = await getWatchItems("trending");
  return trending.items.filter((i) => !lineupIds.has(i.id)).slice(0, limit);
}
