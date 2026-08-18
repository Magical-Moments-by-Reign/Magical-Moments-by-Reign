// ── Magical Discovery — service layer (SERVER ONLY) ──────────────
// The ONLY place category pages talk to providers/cache/curation. Refresh
// cadence lives here, one line per category, matching the architecture spec:
//   news        15-60 min   →  15 min (NewsAPI's free tier allows frequent polls)
//   tv / movies  daily-ish  →  6h (TMDB catalog data barely moves hour to hour)
//   music chart  daily      →  24h
//   events       periodic   →  1h, plus a fresh fetch on a new location/date search
//   sports       n/a        →  no provider yet; always the honest pending state
//   trending     owner-set  →  no cache; DiscoveryFeatured is already the source of truth

import { prisma } from "@/lib/db";
import { withCache, cacheKeyFor } from "./cache";
import { NewsApiProvider, type NewsSection, type NewsStory } from "./providers/news";
import { TmdbWatchProvider, TmdbMovieProvider, recommendedTv, type WatchSection, type MovieSection, type WatchItem, type MovieItem, type WatchDetails, type MovieDetails } from "./providers/tmdb";
import { AppleMusicProvider, type MusicGenre, type MusicChart, type MusicChartEntry } from "./providers/music";
import { TicketmasterProvider, type EventCategory, type DiscoveredEvent } from "./providers/events";
import { SportsPendingProvider, PENDING_SPORTS_MESSAGE } from "./providers/sports";
import { getSportsLandingGames, SPORT_CATALOG } from "./sports/service";
import type { DiscoveryResult } from "./types";

// Default sports for the Curated For You row when no follows are known —
// the landing page has no per-member sports-follow context, so this picks
// from the whole catalog rather than guessing a favorite.
const CURATED_DEFAULT_SPORTS = SPORT_CATALOG.map((s) => s.slug);

const TTL = { news: 15, catalog: 360, chart: 1440, events: 60 };

export async function getTodayStories(section: NewsSection): Promise<DiscoveryResult<NewsStory>> {
  const cached = await withCache("today", NewsApiProvider.slug, cacheKeyFor({ section }), TTL.news, () =>
    NewsApiProvider.topStories({ section }));
  if (!cached) return { items: [], source: "unavailable" };
  return { items: cached.data, source: cached.source, providerName: NewsApiProvider.name, attribution: NewsApiProvider.attribution, fetchedAt: cached.fetchedAt.toISOString() };
}

export async function getWatchItems(section: WatchSection): Promise<DiscoveryResult<WatchItem>> {
  const cached = await withCache("watch", TmdbWatchProvider.slug, cacheKeyFor({ kind: "watch", section }), TTL.catalog, () =>
    TmdbWatchProvider.browse(section));
  if (!cached) return { items: [], source: "unavailable" };
  return { items: cached.data, source: cached.source, providerName: TmdbWatchProvider.name, attribution: TmdbWatchProvider.attribution, fetchedAt: cached.fetchedAt.toISOString() };
}

export async function getWatchDetails(id: string): Promise<WatchDetails | null> {
  const cached = await withCache("watch", TmdbWatchProvider.slug, cacheKeyFor({ kind: "watch_details", id }), TTL.catalog, () =>
    TmdbWatchProvider.details(id));
  return cached?.data ?? null;
}

export async function getRecommendedTv(id: string): Promise<WatchItem[]> {
  const cached = await withCache("watch", TmdbWatchProvider.slug, cacheKeyFor({ kind: "watch_recs", id }), TTL.catalog, () =>
    recommendedTv(id));
  return cached?.data ?? [];
}

export async function getMovieItems(section: MovieSection): Promise<DiscoveryResult<MovieItem>> {
  const cached = await withCache("movies", TmdbMovieProvider.slug, cacheKeyFor({ kind: "movie", section }), TTL.catalog, () =>
    TmdbMovieProvider.browse(section));
  if (!cached) return { items: [], source: "unavailable" };
  return { items: cached.data, source: cached.source, providerName: TmdbMovieProvider.name, attribution: TmdbMovieProvider.attribution, fetchedAt: cached.fetchedAt.toISOString() };
}

export async function getMovieDetails(id: string): Promise<MovieDetails | null> {
  const cached = await withCache("movies", TmdbMovieProvider.slug, cacheKeyFor({ kind: "movie_details", id }), TTL.catalog, () =>
    TmdbMovieProvider.details(id));
  return cached?.data ?? null;
}

export interface MusicChartResult {
  chartTitle: string;
  entries: MusicChartEntry[];
  isOfficial: boolean;
  source: "live" | "cache" | "manual" | "unavailable";
  attribution?: string;
}

/** Live Apple Music chart when configured; otherwise the owner's manual
 *  DiscoveryFeatured "music_chart" list for this genre, honestly labeled. */
export async function getMusicChart(genre: MusicGenre): Promise<MusicChartResult> {
  const cached = await withCache<MusicChart>("music", AppleMusicProvider.slug, cacheKeyFor({ genre }), TTL.chart, () =>
    AppleMusicProvider.chart(genre));
  if (cached) {
    return { chartTitle: cached.data.chartTitle, entries: cached.data.entries, isOfficial: true, source: cached.source, attribution: AppleMusicProvider.attribution };
  }

  const manual = await prisma.discoveryFeatured.findFirst({
    where: { section: "music_chart", category: genre },
    orderBy: { updatedAt: "desc" },
  }).catch(() => null);
  if (!manual) return { chartTitle: "", entries: [], isOfficial: false, source: "unavailable" };

  let entries: MusicChartEntry[] = [];
  try {
    const parsed = JSON.parse(manual.entries);
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    entries = [];
  }
  return { chartTitle: manual.title, entries, isOfficial: false, source: "manual" };
}

export async function getNearYouEvents(params: { location?: string; coords?: { lat: number; lng: number }; category?: EventCategory; radiusMiles?: number; keyword?: string; limit?: number; sort?: "relevance" }): Promise<DiscoveryResult<DiscoveredEvent>> {
  if (!params.coords && !params.location?.trim() && !params.keyword?.trim() && params.sort !== "relevance") return { items: [], source: "unavailable" };
  // Round coordinates to ~1.1km buckets (2 decimal places) before they reach
  // the cache key, so nearby members (or the same member's slightly-jittered
  // GPS reads) share a cache entry instead of every exact lat/lng missing
  // the cache individually — a real device location is essentially never
  // bit-for-bit identical twice.
  const bucketedCoords = params.coords ? { lat: Math.round(params.coords.lat * 100) / 100, lng: Math.round(params.coords.lng * 100) / 100 } : undefined;
  const cached = await withCache("near_you", TicketmasterProvider.slug, cacheKeyFor({ ...params, coords: bucketedCoords }), TTL.events, () =>
    TicketmasterProvider.search({ ...params, coords: bucketedCoords }));
  if (!cached) return { items: [], source: "unavailable" };
  return { items: cached.data, source: cached.source, providerName: TicketmasterProvider.name, attribution: TicketmasterProvider.attribution, fetchedAt: cached.fetchedAt.toISOString() };
}

export interface SportsResult {
  games: never[]; // never fabricated — always empty until a real provider is connected
  pendingMessage: string;
  /** Sporting-event tickets can still surface via Ticketmaster today. */
  ticketedEvents: DiscoveryResult<DiscoveredEvent>;
}

export async function getSportsFeed(location?: string): Promise<SportsResult> {
  void SportsPendingProvider; // no live games source yet — see providers/sports.ts
  const ticketedEvents = location?.trim()
    ? await getNearYouEvents({ location, category: "sports" })
    : { items: [], source: "unavailable" as const };
  return { games: [], pendingMessage: PENDING_SPORTS_MESSAGE, ticketedEvents };
}

// Owner-curated "trending now" artists for the Near You page — each is a
// real, live Ticketmaster keyword search by name, never a hardcoded date/
// venue/image. An artist with no current on-sale listing anywhere in the
// country simply doesn't appear in the row — never fabricated to fill a
// slot. Add/remove names here as the Owner's picks change.
const TRENDING_NEAR_YOU_KEYWORDS = ["Usher", "Chris Brown"];

/** One real Ticketmaster listing per Owner-curated trending artist, for the
 *  "Trending Now" row at the bottom of Near You. Searched nationwide (no
 *  location required) so it works before a member enters one. */
export async function getTrendingNearYouEvents(): Promise<DiscoveredEvent[]> {
  const results = await Promise.all(
    TRENDING_NEAR_YOU_KEYWORDS.map((keyword) => getNearYouEvents({ keyword, limit: 1 })),
  );
  return results.flatMap((r) => r.items.slice(0, 1));
}

/** What's actually trending on Ticketmaster right now, nationwide — sorted
 *  by Ticketmaster's own real `relevance` ranking (their algorithm, not
 *  ours), with no location or keyword filter. There is no dedicated
 *  "trending" endpoint on the Discovery API, so this is the honest proxy:
 *  real, currently on-sale events, in the order Ticketmaster itself ranks
 *  them most relevant. Never a fabricated or hand-picked list. */
export async function getTicketmasterTrending(limit = 8): Promise<DiscoveryResult<DiscoveredEvent>> {
  return getNearYouEvents({ sort: "relevance", limit });
}

export interface CuratedItem {
  category: "Watch" | "Movies" | "Music" | "Events" | "Sports";
  title: string;
  description?: string;
  image?: string;
  href: string;
  external?: boolean;
}

// The owner's current explicit editorial pick for the Events slot — a real,
// on-sale tour, searched live against Ticketmaster by name rather than any
// hardcoded date/venue/image, so it always reflects Ticketmaster's actual
// current listing (or disappears on its own once nothing matches). Revisit
// once this tour is no longer on sale.
const CURATED_FEATURED_EVENT_KEYWORD = "Chris Brown";

/** One real item per category (Watch/Movies/Music/Sports/Events) for the
 *  Discovery hub's "Curated For You" row. Watch/Movies/Music/Sports each
 *  fall back across a few real sources so the row rarely looks sparse.
 *  Events tries the owner's current featured keyword search first (a real,
 *  live Ticketmaster listing), then falls back to a location-based search
 *  when the member has an address on file — there is no server-side
 *  geolocation on the landing page. A category with no real item anywhere
 *  is simply omitted — never fabricated to fill the slot. */
export async function getCuratedForYou(opts: { location?: string } = {}): Promise<CuratedItem[]> {
  const [watch, movies, music, featuredEvent, sportsGames] = await Promise.all([
    getWatchItems("trending"),
    getMovieItems("now_playing"),
    getMusicChart("top"),
    getNearYouEvents({ keyword: CURATED_FEATURED_EVENT_KEYWORD, limit: 1 }),
    getSportsLandingGames(CURATED_DEFAULT_SPORTS, 1),
  ]);
  const events = featuredEvent.items.length
    ? featuredEvent
    : opts.location?.trim() ? await getNearYouEvents({ location: opts.location.trim() }) : { items: [], source: "unavailable" as const };

  const items: CuratedItem[] = [];
  const w = watch.items[0];
  if (w) items.push({ category: "Watch", title: w.title, description: w.firstAirDate ? `New episodes · ${w.firstAirDate.slice(0, 4)}` : undefined, image: w.backdropUrl ?? w.posterUrl, href: `/dashboard/discovery/watch/${w.id}` });
  const m = movies.items[0];
  if (m) items.push({ category: "Movies", title: m.title, description: "Now In Theaters", image: m.posterUrl ?? m.backdropUrl, href: `/dashboard/discovery/movies/${m.id}` });
  const track = music.entries[0];
  if (track) items.push({ category: "Music", title: track.artist, description: track.song, image: track.artworkUrl, href: "/dashboard/discovery/music" });
  const game = sportsGames.live[0] ?? sportsGames.upcoming[0];
  if (game) {
    const sportLabel = SPORT_CATALOG.find((s) => s.slug === game.sport)?.label ?? game.sport;
    items.push({
      category: "Sports",
      title: `${game.awayTeamName} @ ${game.homeTeamName}`,
      description: game.status === "live" ? `Live now · ${sportLabel}` : `${sportLabel} · ${game.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
      image: game.awayTeamLogoUrl ?? game.homeTeamLogoUrl ?? undefined,
      href: `/dashboard/discovery/sports/game/${game.id}`,
    });
  }
  const event = events.items[0];
  if (event) items.push({ category: "Events", title: event.name, description: event.venueName ?? ([event.city, event.state].filter(Boolean).join(", ") || undefined), image: event.imageUrl, href: event.ticketUrl, external: true });

  return items.slice(0, 5);
}

/** Owner-curated Trending items — by design, no live provider (see architecture spec). */
export async function getTrendingItems(category?: string) {
  const now = new Date();
  return prisma.discoveryFeatured.findMany({
    where: {
      section: "trending",
      featured: true,
      ...(category ? { category } : {}),
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  }).catch(() => []);
}

/** The single Featured item for a section (Today/Watch/Movie/Near You), if the
 *  owner has set one — shown as a highlighted card, never replacing the live feed. */
export async function getFeaturedItem(section: "today" | "watch" | "movie" | "near_you") {
  const now = new Date();
  return prisma.discoveryFeatured.findFirst({
    where: {
      section,
      featured: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  }).catch(() => null);
}
