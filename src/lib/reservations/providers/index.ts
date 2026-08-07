// ── Restaurant discovery — provider registry ────────────────────
//
// The app asks here for "the restaurant discovery provider". Today that's Yelp
// when configured; tomorrow another provider can register the same way. When
// none is configured, callers get null and fall back to the honest
// "not connected → concierge request" path.

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

/** The active, fully-configured restaurant discovery provider, or null. */
export function restaurantProvider(): RestaurantProvider | null {
  if (YelpProvider.isConfigured()) return YelpProvider;
  return null;
}

/** True when live restaurant discovery is available. */
export function restaurantDiscoveryConfigured(): boolean {
  return restaurantProvider() !== null;
}
