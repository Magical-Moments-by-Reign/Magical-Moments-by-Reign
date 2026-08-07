// ── Yelp Fusion — restaurant discovery adapter (SERVER ONLY) ────
//
// Implements RestaurantProvider using the Yelp Fusion v3 API. The API key is
// read from the server environment ONLY and sent as a Bearer header — it is
// never returned to a caller, never placed in HTML, never exposed to the
// browser. Every network failure degrades to null so the app falls back to
// the honest "not connected / concierge request" path.
//
// Discovery only: Yelp gives search, details, photos, categories, price,
// hours, rating, and location — NOT reservations. Booking stays with the
// concierge, so this adapter never returns availability or confirmations.

import type {
  RestaurantDetails,
  RestaurantHours,
  RestaurantProvider,
  RestaurantSearchParams,
  RestaurantSearchResult,
  RestaurantSummary,
} from "./types";

const YELP_BASE = "https://api.yelp.com/v3";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function yelpKey(): string | undefined {
  return process.env.YELP_API_KEY || process.env.YELP_FUSION_API_KEY || undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Pure: map one Yelp business object → our summary shape. Exported for tests. */
export function mapBusiness(b: any): RestaurantSummary {
  return {
    id: String(b?.id ?? ""),
    name: String(b?.name ?? ""),
    imageUrl: typeof b?.image_url === "string" && b.image_url ? b.image_url : undefined,
    categories: Array.isArray(b?.categories) ? b.categories.map((c: any) => c?.title).filter((t: any): t is string => typeof t === "string") : [],
    priceLevel: typeof b?.price === "string" ? b.price : undefined,
    rating: typeof b?.rating === "number" ? b.rating : undefined,
    reviewCount: typeof b?.review_count === "number" ? b.review_count : undefined,
    address: Array.isArray(b?.location?.display_address) ? b.location.display_address.join(", ") : undefined,
    phone: typeof b?.display_phone === "string" && b.display_phone ? b.display_phone : (typeof b?.phone === "string" ? b.phone : undefined),
    providerUrl: typeof b?.url === "string" ? b.url : undefined,
    distanceMeters: typeof b?.distance === "number" ? b.distance : undefined,
    isClosed: typeof b?.is_closed === "boolean" ? b.is_closed : undefined,
  };
}

/** Pure: map Yelp `hours[0].open[]` → readable weekly hours. Exported for tests. */
export function mapHours(raw: any): RestaurantHours[] {
  const open = raw?.hours?.[0]?.open;
  if (!Array.isArray(open)) return [];
  return open
    .filter((o: any) => o && typeof o.day === "number")
    .map((o: any) => ({ day: DAYS[o.day] ?? String(o.day), start: String(o.start ?? ""), end: String(o.end ?? "") }));
}

/** Pure: map a Yelp details object → our details shape. Exported for tests. */
export function mapDetails(b: any): RestaurantDetails {
  return {
    ...mapBusiness(b),
    photos: Array.isArray(b?.photos) ? b.photos.filter((p: any): p is string => typeof p === "string") : [],
    hours: mapHours(b),
    latitude: typeof b?.coordinates?.latitude === "number" ? b.coordinates.latitude : undefined,
    longitude: typeof b?.coordinates?.longitude === "number" ? b.coordinates.longitude : undefined,
    displayPhone: typeof b?.display_phone === "string" ? b.display_phone : undefined,
  };
}

/** Pure: Yelp wants price as "1,2,3,4". Exported for tests. */
export function priceParam(price?: number[]): string | undefined {
  if (!price?.length) return undefined;
  const clean = price.filter((n) => n >= 1 && n <= 4);
  return clean.length ? clean.join(",") : undefined;
}

export const YelpProvider: RestaurantProvider = {
  name: "Yelp",
  attribution: "Powered by Yelp",

  isConfigured(): boolean {
    return Boolean(yelpKey());
  },

  async search(params: RestaurantSearchParams): Promise<RestaurantSearchResult | null> {
    const key = yelpKey();
    if (!key || !params.location?.trim()) return null;

    const q = new URLSearchParams();
    q.set("location", params.location.trim());
    q.set("term", params.term?.trim() || "restaurants");
    q.set("categories", (params.categories?.length ? params.categories : ["restaurants"]).join(","));
    q.set("limit", String(Math.min(Math.max(params.limit ?? 20, 1), 50)));
    if (params.offset) q.set("offset", String(params.offset));
    if (params.openNow) q.set("open_now", "true");
    if (params.sortBy) q.set("sort_by", params.sortBy);
    const price = priceParam(params.price);
    if (price) q.set("price", price);

    try {
      const res = await fetch(`${YELP_BASE}/businesses/search?${q.toString()}`, {
        headers: { Authorization: `Bearer ${key}` },
        // Discovery data is fine to cache briefly; keeps us within rate limits.
        next: { revalidate: 120 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const businesses = Array.isArray(data?.businesses) ? data.businesses.map(mapBusiness).filter((b: RestaurantSummary) => b.id && b.name) : [];
      return { provider: this.name, attribution: this.attribution, businesses, total: typeof data?.total === "number" ? data.total : businesses.length };
    } catch {
      return null;
    }
  },

  async details(id: string): Promise<RestaurantDetails | null> {
    const key = yelpKey();
    if (!key || !id) return null;
    try {
      const res = await fetch(`${YELP_BASE}/businesses/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` },
        next: { revalidate: 300 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.id) return null;
      return mapDetails(data);
    } catch {
      return null;
    }
  },
};
