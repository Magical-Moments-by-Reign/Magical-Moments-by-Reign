// ── Hotel discovery — provider registry ─────────────────────────
//
// Same pattern as the restaurant registry. Expedia Rapid is Provider #1;
// Booking.com, Hotels.com, Google Hotels, etc. slot into PROVIDERS later with
// no page changes. The UI never learns which provider supplied the data.

import { ExpediaRapidProvider } from "./expedia";
import type { HotelProvider, HotelSearchParams, HotelSearchResult } from "./types";

export type {
  HotelProvider, HotelSearchParams, HotelSearchResult, HotelSummary,
  HotelDetails, HotelRoomOption, HotelSort, Money,
} from "./types";

// Priority order. Expedia is primary; add fallbacks here.
const PROVIDERS: HotelProvider[] = [ExpediaRapidProvider];

/** The primary hotel provider (always present so the UI works with sample data). */
export function hotelProvider(): HotelProvider | null {
  return PROVIDERS[0] ?? null;
}

/** True when a hotel provider has LIVE credentials (drives the "live" badge). */
export function hotelDiscoveryConfigured(): boolean {
  return PROVIDERS.some((p) => p.isConfigured());
}

/** Resolve a provider by slug/name, or null. Keeps a property id bound to its
 *  own provider — an Expedia id is never routed through another provider. */
export function getHotelProviderByName(name?: string | null): HotelProvider | null {
  if (!name) return null;
  const n = name.toLowerCase();
  return PROVIDERS.find((p) => p.slug === n || p.name.toLowerCase() === n) ?? null;
}

export function hotelProviderForId(providerName?: string | null): HotelProvider | null {
  if (providerName) return getHotelProviderByName(providerName);
  return hotelProvider();
}

/**
 * Search with automatic fallback across configured providers (Expedia today).
 * A provider returning results wins; one that errors/returns null is skipped;
 * a reachable-but-empty provider yields an honest empty result. Sample results
 * (no live creds) are returned as-is with sample:true.
 */
export async function searchHotels(
  params: HotelSearchParams,
  providers: HotelProvider[] = PROVIDERS,
): Promise<HotelSearchResult | null> {
  let reachableButEmpty: HotelSearchResult | null = null;
  for (const p of providers) {
    const res = await p.search(params);
    if (res && res.hotels.length > 0) return res;
    if (res) reachableButEmpty = reachableButEmpty ?? res;
  }
  return reachableButEmpty;
}
