// ── Restaurant discovery — provider registry ────────────────────
//
// The app asks here for "the restaurant discovery provider". Today that's Yelp
// when configured; tomorrow another provider can register the same way. When
// none is configured, callers get null and fall back to the honest
// "not connected → concierge request" path.

import { GooglePlacesProvider } from "./google-places";
import { YelpProvider } from "./yelp";
import type { RestaurantProvider } from "./types";

export type {
  RestaurantProvider,
  RestaurantSearchParams,
  RestaurantSearchResult,
  RestaurantSummary,
  RestaurantDetails,
  RestaurantHours,
} from "./types";

// Priority order: Google Places is the PRIMARY provider; Yelp is the automatic
// fallback. New providers slot into this list without touching Restaurants.
const PROVIDERS: RestaurantProvider[] = [GooglePlacesProvider, YelpProvider];

/** The active, fully-configured restaurant discovery provider, or null. */
export function restaurantProvider(): RestaurantProvider | null {
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

/** True when live restaurant discovery is available. */
export function restaurantDiscoveryConfigured(): boolean {
  return restaurantProvider() !== null;
}
