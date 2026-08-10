// ── Magical Discovery — provider cache (SERVER ONLY) ─────────────
// Server-side fetch + Postgres-backed cache so we never call a third-party
// Discovery API from a member's browser, and never re-fetch on every page
// view. Cadence per category is the caller's job (see providers/*.ts callers
// in service.ts) — this module only knows how to read/write a TTL'd row.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { DiscoveryCategory } from "./types";

/** Stable cache key for a provider + its query params — order-independent. */
export function cacheKeyFor(params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().reduce<Record<string, unknown>>((acc, k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== "") acc[k] = params[k];
    return acc;
  }, {});
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex").slice(0, 32);
}

/**
 * Read a fresh cache row, or fetch live and store it. `fetchLive` returning
 * `null` means the provider was unreachable/unconfigured — we DON'T cache a
 * null (an outage shouldn't lock in "unavailable" for the TTL), and we fall
 * back to a stale cache row if one exists rather than showing nothing.
 */
export async function withCache<T>(
  category: DiscoveryCategory,
  provider: string,
  cacheKey: string,
  ttlMinutes: number,
  fetchLive: () => Promise<T | null>,
): Promise<{ data: T; source: "live" | "cache"; fetchedAt: Date } | null> {
  const fresh = await prisma.discoveryCache.findUnique({ where: { provider_cacheKey: { provider, cacheKey } } }).catch(() => null);
  if (fresh && fresh.expiresAt > new Date()) {
    try {
      return { data: JSON.parse(fresh.payload) as T, source: "cache", fetchedAt: fresh.fetchedAt };
    } catch {
      // Corrupt row — fall through and refetch.
    }
  }

  const live = await fetchLive();
  if (live !== null) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
    await prisma.discoveryCache.upsert({
      where: { provider_cacheKey: { provider, cacheKey } },
      create: { category, provider, cacheKey, payload: JSON.stringify(live), fetchedAt: now, expiresAt },
      update: { payload: JSON.stringify(live), fetchedAt: now, expiresAt },
    }).catch(() => null);
    return { data: live, source: "live", fetchedAt: now };
  }

  // Provider unreachable — serve a stale row rather than nothing, if we have one.
  if (fresh) {
    try {
      return { data: JSON.parse(fresh.payload) as T, source: "cache", fetchedAt: fresh.fetchedAt };
    } catch {
      return null;
    }
  }
  return null;
}
