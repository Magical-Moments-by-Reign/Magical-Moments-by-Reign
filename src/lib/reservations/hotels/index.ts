// ── Hotel discovery — provider registry ─────────────────────────
//
// Same pattern as the restaurant registry. Expedia Rapid is Provider #1;
// Booking.com, Hotels.com, Google Hotels, etc. slot into PROVIDERS later with
// no page changes. The UI never learns which provider supplied the data.

import { ExpediaRapidProvider } from "./expedia";
import { HotelbedsProvider } from "./hotelbeds";
import type { HotelProvider, HotelSearchParams, HotelSearchResult } from "./types";

export type {
  HotelProvider, HotelSearchParams, HotelSearchResult, HotelSummary,
  HotelDetails, HotelRoomOption, HotelSort, Money,
} from "./types";
export { verifyHotelbedsAuth, hotelbedsBase } from "./hotelbeds";
export { searchDestinations, destinationByCode, verifyHotelbedsReadiness, type HotelbedsDestination, type HotelbedsReadiness } from "./hotelbeds-destinations";

// Priority order. Hotelbeds is the live provider (real credentials); Expedia
// remains for its schema-accurate sample mode until its own credentials land.
// New hotel providers slot in here with no page changes.
const PROVIDERS: HotelProvider[] = [HotelbedsProvider, ExpediaRapidProvider];

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
 * Search across providers in priority order.
 *
 * LIVE IS AUTHORITATIVE: the moment a live provider (sample:false) is reachable
 * — even with zero matches — we return its result and STOP. A live "no hotels
 * found" is never papered over with another provider's sample data. Sample
 * providers are consulted only when no live provider answered (so the UI still
 * works before credentials arrive). A provider that errors (null) is skipped.
 */
export async function searchHotels(
  params: HotelSearchParams,
  providers: HotelProvider[] = PROVIDERS,
): Promise<HotelSearchResult | null> {
  let sampleFallback: HotelSearchResult | null = null;
  for (const p of providers) {
    const res = await p.search(params);
    if (!res) continue; // error / unavailable → try the next
    if (!res.sample) return res; // live + reachable → authoritative (even if empty)
    sampleFallback = sampleFallback ?? res; // remember sample; keep seeking a live one
  }
  return sampleFallback;
}
