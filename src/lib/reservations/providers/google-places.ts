// ── Google Places — restaurant discovery adapter (SERVER ONLY) ──
//
// Implements RestaurantProvider using the Google Places API (v1). The API key
// is read from GOOGLE_PLACES_API_KEY on the server ONLY and sent as the
// X-Goog-Api-Key header — never returned to a caller, never in HTML, never in
// the browser.
//
// PHOTOS: Google's photo-media URL embeds the API key, so we NEVER hand a
// client a Google photo URL. Instead photo references are exposed as our own
// keyless proxy path (/api/luxury/place-photo?name=…), which fetches the image
// server-side. That keeps the key private.
//
// Discovery only: search, details, photos, categories, price, hours, rating,
// location — NOT reservations. Booking stays with the concierge.

import type {
  RestaurantDetails,
  RestaurantProvider,
  RestaurantSearchParams,
  RestaurantSearchResult,
  RestaurantSummary,
} from "./types";

const PLACES_BASE = "https://places.googleapis.com/v1";

const SEARCH_FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.rating",
  "places.userRatingCount", "places.priceLevel", "places.types",
  "places.primaryTypeDisplayName", "places.photos", "places.location",
  "places.businessStatus", "places.nationalPhoneNumber", "places.googleMapsUri",
].join(",");

const DETAIL_FIELDS = [
  "id", "displayName", "formattedAddress", "rating", "userRatingCount",
  "priceLevel", "types", "primaryTypeDisplayName", "photos", "regularOpeningHours",
  "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "googleMapsUri",
  "location", "businessStatus",
].join(",");

function googleKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY || undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Pure: Google price-level enum → "$"–"$$$$". Exported for tests. */
export function priceLevelToDollars(level: unknown): string | undefined {
  switch (level) {
    case "PRICE_LEVEL_INEXPENSIVE": return "$";
    case "PRICE_LEVEL_MODERATE": return "$$";
    case "PRICE_LEVEL_EXPENSIVE": return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE": return "$$$$";
    default: return undefined; // FREE / UNSPECIFIED / missing → don't guess
  }
}

/** Pure: prettify a Google place type like "italian_restaurant" → "Italian". */
export function prettifyType(t: string): string {
  return t.replace(/_/g, " ").replace(/\brestaurant\b/i, "").trim().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Pure: derive readable categories from a place. Exported for tests. */
export function toCategories(p: any): string[] {
  const primary = p?.primaryTypeDisplayName?.text;
  if (typeof primary === "string" && primary.trim()) return [primary.trim()];
  const types: string[] = Array.isArray(p?.types) ? p.types : [];
  const skip = new Set(["restaurant", "food", "point_of_interest", "establishment"]);
  return types.filter((t) => !skip.has(t)).map(prettifyType).filter(Boolean).slice(0, 3);
}

/** Pure: our keyless proxy URL for a Google photo resource. Exported for tests. */
export function photoProxyUrl(name: string, width = 800): string {
  return `/api/luxury/place-photo?name=${encodeURIComponent(name)}&w=${width}`;
}

function firstPhotoUrl(p: any, width = 800): string | undefined {
  const name = p?.photos?.[0]?.name;
  return typeof name === "string" && name ? photoProxyUrl(name, width) : undefined;
}

/** Pure: map a Google place → our summary shape. Exported for tests. */
export function mapPlace(p: any): RestaurantSummary {
  const status = p?.businessStatus;
  return {
    id: String(p?.id ?? ""),
    name: String(p?.displayName?.text ?? ""),
    imageUrl: firstPhotoUrl(p),
    categories: toCategories(p),
    priceLevel: priceLevelToDollars(p?.priceLevel),
    rating: typeof p?.rating === "number" ? p.rating : undefined,
    reviewCount: typeof p?.userRatingCount === "number" ? p.userRatingCount : undefined,
    address: typeof p?.formattedAddress === "string" ? p.formattedAddress : undefined,
    phone: typeof p?.nationalPhoneNumber === "string" ? p.nationalPhoneNumber : undefined,
    providerUrl: typeof p?.googleMapsUri === "string" ? p.googleMapsUri : undefined,
    // Google Text Search has no distance without user coords — omit, never guess.
    distanceMeters: undefined,
    isClosed: status ? status !== "OPERATIONAL" : undefined,
  };
}

/** Pure: map a Google place detail → our details shape. Exported for tests. */
export function mapPlaceDetails(p: any): RestaurantDetails {
  const photoNames: string[] = Array.isArray(p?.photos)
    ? p.photos.map((ph: any) => ph?.name).filter((n: any): n is string => typeof n === "string")
    : [];
  const weekday = p?.regularOpeningHours?.weekdayDescriptions;
  return {
    ...mapPlace(p),
    photos: photoNames.slice(0, 8).map((n) => photoProxyUrl(n, 1000)),
    hours: [],
    hoursText: Array.isArray(weekday) ? weekday.filter((d: any): d is string => typeof d === "string") : undefined,
    website: typeof p?.websiteUri === "string" ? p.websiteUri : undefined,
    displayPhone: typeof p?.nationalPhoneNumber === "string" ? p.nationalPhoneNumber : undefined,
    latitude: typeof p?.location?.latitude === "number" ? p.location.latitude : undefined,
    longitude: typeof p?.location?.longitude === "number" ? p.location.longitude : undefined,
  };
}

export const GooglePlacesProvider: RestaurantProvider = {
  name: "Google",
  attribution: "Powered by Google",

  isConfigured(): boolean {
    return Boolean(googleKey());
  },

  async search(params: RestaurantSearchParams): Promise<RestaurantSearchResult | null> {
    const key = googleKey();
    if (!key || !params.location?.trim()) return null;

    const textQuery = `${params.term?.trim() || "restaurants"} in ${params.location.trim()}`;
    const body: Record<string, unknown> = {
      textQuery,
      includedType: "restaurant",
      maxResultCount: Math.min(Math.max(params.limit ?? 20, 1), 20),
    };
    if (params.openNow) body.openNow = true;
    if (params.price?.length) {
      const map = ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"];
      body.priceLevels = params.price.filter((n) => n >= 1 && n <= 4).map((n) => map[n - 1]);
    }

    try {
      const res = await fetch(`${PLACES_BASE}/places:searchText`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": SEARCH_FIELDS },
        body: JSON.stringify(body),
        next: { revalidate: 120 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const businesses = Array.isArray(data?.places) ? data.places.map(mapPlace).filter((b: RestaurantSummary) => b.id && b.name) : [];
      return { provider: this.name, attribution: this.attribution, businesses, total: businesses.length };
    } catch {
      return null;
    }
  },

  async details(id: string): Promise<RestaurantDetails | null> {
    const key = googleKey();
    if (!key || !id) return null;
    try {
      const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(id)}`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": DETAIL_FIELDS },
        next: { revalidate: 300 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.id) return null;
      return mapPlaceDetails(data);
    } catch {
      return null;
    }
  },
};

/** Server-side resolver of a Google photo resource → raw image bytes (for the
 *  proxy route). Keeps the API key out of the browser. Returns null on failure. */
export async function fetchPlacePhoto(name: string, width: number): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const key = googleKey();
  if (!key || !name.startsWith("places/")) return null;
  try {
    const w = Math.min(Math.max(width || 800, 100), 1600);
    const res = await fetch(`${PLACES_BASE}/${name}/media?maxWidthPx=${w}&key=${encodeURIComponent(key)}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return { body: await res.arrayBuffer(), contentType };
  } catch {
    return null;
  }
}
