// ── Restaurant discovery — provider registry ────────────────────
//
// The app asks here for "the restaurant discovery provider". Today that's Yelp
// when configured; tomorrow another provider can register the same way. When
// none is configured, callers get null and fall back to the honest
// "not connected → concierge request" path.

import { GooglePlacesProvider } from "./google-places";
import { YelpProvider } from "./yelp";
import type { RestaurantProvider, RestaurantSearchParams, RestaurantSearchResult } from "./types";

export type {
  RestaurantProvider,
  RestaurantSearchParams,
  RestaurantSearchResult,
  RestaurantSummary,
  RestaurantDetails,
  RestaurantHours,
} from "./types";

// Priority order: Google Places is the PRIMARY provider; Yelp is the automatic
// fallback. New providers slot into this list without touching Restaurants —
// the UI never learns which provider supplied the data.
const PROVIDERS: RestaurantProvider[] = [GooglePlacesProvider, YelpProvider];

/** The primary configured discovery provider (first in priority order), or null. */
export function restaurantProvider(): RestaurantProvider | null {
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

/** True when at least one discovery provider is configured. */
export function restaurantDiscoveryConfigured(): boolean {
  return PROVIDERS.some((p) => p.isConfigured());
}

/** Resolve a provider by its slug or display name (e.g. "google"/"Google"),
 *  or null. Used to route a detail/photo lookup back to the SAME provider that
 *  produced a result — a Google place id is not a Yelp id, and vice-versa. */
export function getProviderByName(name?: string | null): RestaurantProvider | null {
  if (!name) return null;
  const n = name.toLowerCase();
  return PROVIDERS.find((p) => (p.slug === n || p.name.toLowerCase() === n) && p.isConfigured()) ?? null;
}

/**
 * The provider that owns a given result's id. STRICT: when a provider is named
 * (every real result carries one), we resolve exactly that provider or null —
 * we NEVER route a Google id through Yelp (or vice-versa). Only a legacy call
 * with no provider hint falls back to the primary provider.
 */
export function providerForId(providerName?: string | null): RestaurantProvider | null {
  if (providerName) return getProviderByName(providerName);
  return restaurantProvider();
}

/**
 * Search with automatic fallback. Tries each configured provider in priority
 * order (Google, then Yelp). A provider that returns real results wins. A
 * provider that errors / is unavailable / over quota returns null → we move on.
 * A provider that is reachable but has no matches is remembered so we can show
 * an honest "no results" rather than a spurious error if nothing else matches.
 * The returned result carries the winning provider's name + attribution — data
 * is never mixed across providers.
 */
export async function searchRestaurants(
  params: RestaurantSearchParams,
  providers: RestaurantProvider[] = PROVIDERS, // injectable for tests
): Promise<RestaurantSearchResult | null> {
  let reachableButEmpty: RestaurantSearchResult | null = null;
  for (const p of providers) {
    if (!p.isConfigured()) continue;
    const res = await p.search(params);
    if (res && res.businesses.length > 0) return res; // a clear winner
    if (res) reachableButEmpty = reachableButEmpty ?? res; // reachable, no matches
    // res === null → error / unavailable / quota → fall through to the next
  }
  return reachableButEmpty; // honest empty set, or null if nothing was reachable
}
