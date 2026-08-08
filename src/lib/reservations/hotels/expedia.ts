// ── Expedia Rapid — hotel provider (SERVER ONLY) ────────────────
//
// Implements HotelProvider. EVERY Expedia API call is isolated in this file.
// Credentials (EXPEDIA_RAPID_API_KEY + EXPEDIA_RAPID_SHARED_SECRET) are read
// on the server only and used to build the EAN signature — never returned to a
// caller, never in HTML, never in the browser. Each request carries a unique
// Partner-Transaction-ID.
//
// Until credentials arrive, `search`/`details` return SCHEMA-ACCURATE sample
// data (sample: true) through the SAME mapper the live responses will use — so
// going live only swaps the fetch layer (liveSearch/liveDetails), nothing else.
//
// HONESTY: sample results are flagged sample:true (UI shows them as examples).
// Live results are never fabricated — an empty live response yields an empty
// list ("No hotels were found matching your search.").

import { createHash } from "crypto";
import { MOCK_AVAILABILITY, MOCK_CONTENT } from "./expedia-mock";
import { newPartnerTransactionId } from "./partner-tx";
import type { HotelDetails, HotelProvider, HotelSearchParams, HotelSearchResult, HotelSort, HotelSummary, Money } from "./types";

const RAPID_BASE = "https://api.ean.com/v3";

/* eslint-disable @typescript-eslint/no-explicit-any */

function creds(): { key: string; secret: string } | null {
  const key = process.env.EXPEDIA_RAPID_API_KEY;
  const secret = process.env.EXPEDIA_RAPID_SHARED_SECRET;
  return key && secret ? { key, secret } : null;
}

// ── Pure mappers (shared by mock + live) ────────────────────────

function firstPricing(availProp: any): any | undefined {
  const occ = availProp?.rooms?.[0]?.rates?.[0]?.occupancy_pricing;
  if (!occ || typeof occ !== "object") return undefined;
  const firstKey = Object.keys(occ)[0];
  return firstKey ? occ[firstKey] : undefined;
}
function money(value: unknown, currency: unknown): Money | undefined {
  const amt = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(amt)) return undefined;
  return { amount: amt, currency: typeof currency === "string" ? currency : "USD" };
}
function nightlyMoney(pricing: any): Money | undefined {
  const cell = pricing?.nightly?.[0]?.[0];
  return cell ? money(cell.value, cell.currency) : undefined;
}
function totalMoney(pricing: any): Money | undefined {
  const bc = pricing?.totals?.inclusive?.billable_currency;
  return bc ? money(bc.value, bc.currency) : undefined;
}
function amenityNames(content: any): string[] {
  const a = content?.amenities;
  if (!a || typeof a !== "object") return [];
  return Object.values(a).map((x: any) => x?.name).filter((n: any): n is string => typeof n === "string");
}
function imageHrefs(content: any): string[] {
  const imgs = content?.images;
  if (!Array.isArray(imgs)) return [];
  return imgs.map((i: any) => i?.links?.["1000px"]?.href).filter((h: any): h is string => typeof h === "string");
}
function heroImage(content: any): string | undefined {
  const imgs = content?.images;
  if (!Array.isArray(imgs)) return undefined;
  const hero = imgs.find((i: any) => i?.hero_image) ?? imgs[0];
  return hero?.links?.["1000px"]?.href;
}
function numOrUndef(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Pure: merge Rapid content + availability for one property → summary. */
export function mapSummary(propertyId: string, content: any, availProp: any): HotelSummary | null {
  if (!content?.name) return null;
  const pricing = firstPricing(availProp);
  const addr = content.address ?? {};
  return {
    provider: "expedia",
    id: String(propertyId),
    name: String(content.name),
    address: [addr.line_1, addr.city, addr.state_province_name].filter(Boolean).join(", ") || undefined,
    city: addr.city,
    thumbnail: heroImage(content),
    starRating: numOrUndef(content?.ratings?.property?.rating),
    guestRating: numOrUndef(content?.ratings?.guest?.overall),
    reviewCount: numOrUndef(content?.ratings?.guest?.count),
    pricePerNight: nightlyMoney(pricing),
    totalPrice: totalMoney(pricing),
    amenities: amenityNames(content).slice(0, 6),
    latitude: numOrUndef(content?.location?.coordinates?.latitude),
    longitude: numOrUndef(content?.location?.coordinates?.longitude),
  };
}

/** Pure: full details for one property. */
export function mapDetails(propertyId: string, content: any, availProp: any): HotelDetails | null {
  const summary = mapSummary(propertyId, content, availProp);
  if (!summary) return null;
  const rooms = (availProp?.rooms ?? []).map((r: any) => {
    const pricing = r?.rates?.[0]?.occupancy_pricing;
    const firstKey = pricing ? Object.keys(pricing)[0] : undefined;
    const p = firstKey ? pricing[firstKey] : undefined;
    return { name: String(r?.room_name ?? "Room"), price: totalMoney(p), refundable: r?.rates?.[0]?.refundable };
  });
  return {
    ...summary,
    images: imageHrefs(content),
    description: content?.descriptions?.location || content?.descriptions?.amenities || undefined,
    amenitiesFull: amenityNames(content),
    checkInTime: content?.checkin?.begin_time,
    checkOutTime: content?.checkout?.time,
    rooms,
  };
}

// ── Pure filters + sort (client-side refinement) ────────────────

export function applyHotelFilters(hotels: HotelSummary[], params: HotelSearchParams): HotelSummary[] {
  return hotels.filter((h) => {
    if (params.starRatings?.length && !(h.starRating && params.starRatings.some((s) => Math.floor(h.starRating!) === s))) return false;
    if (typeof params.minPrice === "number" && (h.pricePerNight?.amount ?? 0) < params.minPrice) return false;
    if (typeof params.maxPrice === "number" && (h.pricePerNight?.amount ?? Infinity) > params.maxPrice) return false;
    if (params.amenities?.length && !params.amenities.every((a) => h.amenities.some((ha) => ha.toLowerCase() === a.toLowerCase()))) return false;
    return true;
  });
}

export function sortHotels(hotels: HotelSummary[], sort?: HotelSort): HotelSummary[] {
  const out = [...hotels];
  switch (sort) {
    case "price_low": return out.sort((a, b) => (a.pricePerNight?.amount ?? Infinity) - (b.pricePerNight?.amount ?? Infinity));
    case "price_high": return out.sort((a, b) => (b.pricePerNight?.amount ?? -Infinity) - (a.pricePerNight?.amount ?? -Infinity));
    case "rating": return out.sort((a, b) => (b.guestRating ?? 0) - (a.guestRating ?? 0));
    case "stars": return out.sort((a, b) => (b.starRating ?? 0) - (a.starRating ?? 0));
    default: return out; // "recommended" → provider order
  }
}

// ── The provider ────────────────────────────────────────────────

export const ExpediaRapidProvider: HotelProvider = {
  slug: "expedia",
  name: "Expedia",
  attribution: "Hotels provided by Expedia",

  isConfigured(): boolean {
    return creds() !== null;
  },

  async search(params: HotelSearchParams): Promise<HotelSearchResult | null> {
    const txId = newPartnerTransactionId(params.userId ?? "guest", "HOTEL");
    if (this.isConfigured()) return liveSearch(params, txId);

    // Sample mode — schema-accurate mock through the SAME mapper.
    let hotels = MOCK_AVAILABILITY
      .map((a) => mapSummary(a.property_id, MOCK_CONTENT[a.property_id], a))
      .filter((h): h is HotelSummary => h !== null);
    hotels = sortHotels(applyHotelFilters(hotels, params), params.sortBy);
    return { provider: this.name, attribution: this.attribution, sample: true, hotels, total: hotels.length };
  },

  async details(id: string, params?: HotelSearchParams): Promise<HotelDetails | null> {
    const txId = newPartnerTransactionId(params?.userId ?? "guest", "HOTEL");
    if (this.isConfigured()) return liveDetails(id, txId);
    const availProp = MOCK_AVAILABILITY.find((a) => a.property_id === id);
    const content = MOCK_CONTENT[id];
    return content ? mapDetails(id, content, availProp) : null;
  },
};

// ── Live fetch layer (ISOLATED — swap-in point when creds arrive) ─
//
// Everything below is the only code that touches the network. The EAN
// signature auth + Partner-Transaction-ID are built here; the response flows
// through the SAME mappers above. Returns null on any failure so the UI
// degrades gracefully.

/** Build EAN Rapid auth + Partner-Transaction-ID headers. Server-side only. */
function rapidHeaders(txId: string): Record<string, string> | null {
  const c = creds();
  if (!c) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha512").update(c.key + c.secret + timestamp).digest("hex");
  return {
    Authorization: `EAN apikey=${c.key},signature=${signature},timestamp=${timestamp}`,
    Accept: "application/json",
    "Partner-Transaction-ID": txId,
  };
}

async function liveSearch(params: HotelSearchParams, txId: string): Promise<HotelSearchResult | null> {
  const headers = rapidHeaders(txId);
  if (!headers) return null;
  try {
    const q = new URLSearchParams({
      currency: "USD", language: "en-US", country_code: "US",
      sales_channel: "website", sales_environment: "hotel_only", occupancy: String(params.guests ?? 2),
    });
    if (params.checkIn) q.set("checkin", params.checkIn);
    if (params.checkOut) q.set("checkout", params.checkOut);
    // NOTE: Rapid resolves a text location via /properties/geography first; that
    // region→property_id step is wired here when credentials + a region id map
    // are available. Until then this path is intentionally inert (returns null).
    const res = await fetch(`${RAPID_BASE}/properties/availability?${q.toString()}`, { headers });
    if (!res.ok) return null;
    const availability = await res.json();
    if (!Array.isArray(availability) || availability.length === 0) {
      return { provider: ExpediaRapidProvider.name, attribution: ExpediaRapidProvider.attribution, sample: false, hotels: [], total: 0 };
    }
    // Fetch content for the returned property ids, then map through the shared mapper.
    const ids = availability.map((a: any) => a.property_id).filter(Boolean);
    const contentRes = await fetch(`${RAPID_BASE}/properties/content?language=en-US&property_id=${ids.join("&property_id=")}`, { headers });
    const content = contentRes.ok ? await contentRes.json() : {};
    const hotels = availability
      .map((a: any) => mapSummary(a.property_id, content?.[a.property_id], a))
      .filter((h: HotelSummary | null): h is HotelSummary => h !== null);
    return { provider: ExpediaRapidProvider.name, attribution: ExpediaRapidProvider.attribution, sample: false, hotels, total: hotels.length };
  } catch {
    return null;
  }
}

async function liveDetails(id: string, txId: string): Promise<HotelDetails | null> {
  const headers = rapidHeaders(txId);
  if (!headers) return null;
  try {
    const contentRes = await fetch(`${RAPID_BASE}/properties/content?language=en-US&property_id=${id}`, { headers });
    if (!contentRes.ok) return null;
    const content = await contentRes.json();
    const availRes = await fetch(`${RAPID_BASE}/properties/availability?currency=USD&language=en-US&country_code=US&sales_channel=website&sales_environment=hotel_only&occupancy=2&property_id=${id}`, { headers });
    const availability = availRes.ok ? await availRes.json() : [];
    const availProp = Array.isArray(availability) ? availability.find((a: any) => a.property_id === id) : undefined;
    return content?.[id] ? mapDetails(id, content[id], availProp) : null;
  } catch {
    return null;
  }
}
