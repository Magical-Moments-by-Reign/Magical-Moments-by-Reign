// ── Magical Discovery — provider registry ────────────────────────
// One place that knows every Discovery provider, for both the service layer
// and the Owner's Discovery Content Center status panel. Adding a provider
// later (e.g. a second events source, a real sports feed) means registering
// it here — nothing else needs to change.

import { prisma } from "@/lib/db";
import { NewsApiProvider } from "./providers/news";
import { TmdbMovieProvider, TmdbWatchProvider } from "./providers/tmdb";
import { AppleMusicProvider } from "./providers/music";
import { TicketmasterProvider } from "./providers/events";
import { ApiSportsProvider, HighSchoolPendingProvider } from "./providers/sports";
import type { DiscoveryCategory, ProviderStatusReport } from "./types";

interface RegistryEntry {
  category: DiscoveryCategory;
  slug: string;
  name: string;
  isConfigured: () => boolean;
}

// "trending" has no live provider by design (owner-curated only — see the
// Trending section in the architecture spec), so it's intentionally absent
// here; its status is reported separately in discoveryProviderStatuses().
const REGISTRY: RegistryEntry[] = [
  { category: "today", slug: NewsApiProvider.slug, name: NewsApiProvider.name, isConfigured: () => NewsApiProvider.isConfigured() },
  { category: "watch", slug: TmdbWatchProvider.slug, name: TmdbWatchProvider.name, isConfigured: () => TmdbWatchProvider.isConfigured() },
  { category: "movies", slug: TmdbMovieProvider.slug, name: TmdbMovieProvider.name, isConfigured: () => TmdbMovieProvider.isConfigured() },
  { category: "music", slug: AppleMusicProvider.slug, name: AppleMusicProvider.name, isConfigured: () => AppleMusicProvider.isConfigured() },
  { category: "near_you", slug: TicketmasterProvider.slug, name: TicketmasterProvider.name, isConfigured: () => TicketmasterProvider.isConfigured() },
  { category: "sports", slug: ApiSportsProvider.slug, name: ApiSportsProvider.name, isConfigured: () => ApiSportsProvider.isConfigured("nfl") },
];

/**
 * CONNECTED / NOT_CONNECTED / ERROR + last-updated per category, for the
 * Owner's Discovery Content Center. "Error" is reserved for a provider that
 * IS configured but whose most recent cache write attempt failed outright
 * (we don't ping live APIs just to render a status page — that would burn
 * rate limit for a page view). Absent any cache history, a configured
 * provider reads CONNECTED (credentials present) rather than guessing.
 */
export async function discoveryProviderStatuses(): Promise<ProviderStatusReport[]> {
  const now = new Date().toISOString();
  const reports: ProviderStatusReport[] = [];

  for (const entry of REGISTRY) {
    const configured = entry.isConfigured();
    const lastRow = configured
      ? await prisma.discoveryCache.findFirst({
          where: { category: entry.category, provider: entry.slug },
          orderBy: { fetchedAt: "desc" },
          select: { fetchedAt: true },
        }).catch(() => null)
      : null;

    reports.push({
      category: entry.category,
      providerSlug: entry.slug,
      providerName: entry.name,
      status: !configured ? "not_connected" : "connected",
      detail: !configured
        ? entry.category === "sports"
          ? "API_SPORTS_KEY not set. NFL, NCAAF, NBA, MLB, Soccer, NHL, Rugby, and Volleyball activate once it's configured; MMA and F1 aren't mapped by this provider."
          : "No API key configured for this provider."
        : lastRow
          ? "Credentials present; serving from cache/live fetch."
          : "Credentials present; no successful fetch recorded yet.",
      lastCheckedAt: now,
      lastUpdatedAt: lastRow?.fetchedAt.toISOString(),
    });
  }

  // High School sports — always pending until a licensed data partner is
  // connected; never reads live data, so no cache lookup needed.
  reports.push({
    category: "sports",
    providerSlug: HighSchoolPendingProvider.slug,
    providerName: "High School Sports",
    status: "not_connected",
    detail: "No licensed high-school sports data partner connected yet — a separate integration, tracked apart from the main Sports providers above.",
    lastCheckedAt: now,
  });

  // Trending has no live provider — always reported as owner-curated.
  reports.push({
    category: "trending",
    providerSlug: "owner_curated",
    providerName: "Owner Curated",
    status: "connected",
    detail: "Trending is owner-curated by design (no external product API connected).",
    lastCheckedAt: now,
  });

  return reports;
}
