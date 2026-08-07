// ── Hotelbeds — hotel provider (SERVER ONLY) ────────────────────
//
// Implements HotelProvider using the Hotelbeds APItude APIs. EVERY Hotelbeds
// call is isolated in this file. Credentials are read server-side only:
//   HOTELBEDS_API_KEY, HOTELBEDS_SECRET, HOTELBEDS_ENVIRONMENT (test|production)
// Auth uses an X-Signature = SHA256(ApiKey + Secret + unixSeconds). Neither the
// key, the secret, nor the signature is ever returned to the browser.
//
// SEQUENCING (per the owner): authentication is verified against the test
// environment (verifyHotelbedsAuth → GET /hotel-api/1.0/status) before search
// is trusted. search/details are implemented against the published Booking API
// schema and flow through pure mappers; they never fabricate availability or
// pricing — an empty live response yields an empty list.

import { createHash } from "crypto";
import type { HotelDetails, HotelProvider, HotelSearchParams, HotelSearchResult, HotelSummary, Money } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function hbCreds(): { key: string; secret: string } | null {
  const key = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_SECRET;
  return key && secret ? { key, secret } : null;
}

/** Test vs production base host, from HOTELBEDS_ENVIRONMENT. */
export function hotelbedsBase(): string {
  const env = (process.env.HOTELBEDS_ENVIRONMENT || "test").toLowerCase();
  return env === "production" || env === "prod" || env === "live"
    ? "https://api.hotelbeds.com"
    : "https://api.test.hotelbeds.com";
}

/** Pure: the Hotelbeds X-Signature = sha256(apiKey + secret + unixSeconds). */
export function hotelbedsSignature(apiKey: string, secret: string, unixSeconds: number): string {
  return createHash("sha256").update(`${apiKey}${secret}${unixSeconds}`).digest("hex");
}

/** Server-side auth headers. Returns null when credentials are absent. */
function hbHeaders(): Record<string, string> | null {
  const c = hbCreds();
  if (!c) return null;
  const ts = Math.floor(Date.now() / 1000);
  return {
    "Api-key": c.key,
    "X-Signature": hotelbedsSignature(c.key, c.secret, ts),
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
  };
}

export interface HotelbedsAuthResult {
  ok: boolean;
  environment: string;
  httpStatus?: number;
  message: string;
}

/**
 * VERIFY AUTHENTICATION against the (test) environment by calling the Hotelbeds
 * status endpoint. This is the first thing to confirm before trusting search.
 * Never throws — returns a structured result the owner can read.
 */
export async function verifyHotelbedsAuth(): Promise<HotelbedsAuthResult> {
  const env = (process.env.HOTELBEDS_ENVIRONMENT || "test").toLowerCase();
  const headers = hbHeaders();
  if (!headers) return { ok: false, environment: env, message: "Hotelbeds credentials are not configured (HOTELBEDS_API_KEY / HOTELBEDS_SECRET)." };
  try {
    const res = await fetch(`${hotelbedsBase()}/hotel-api/1.0/status`, { headers });
    const text = await res.text().catch(() => "");
    if (res.ok) {
      return { ok: true, environment: env, httpStatus: res.status, message: `Authentication succeeded. Hotelbeds responded: ${text.slice(0, 200) || "OK"}` };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, environment: env, httpStatus: res.status, message: `Authentication rejected (${res.status}). Check the API key, secret, and that the signature clock is in sync.` };
    }
    return { ok: false, environment: env, httpStatus: res.status, message: `Hotelbeds returned HTTP ${res.status}. ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, environment: env, message: `Could not reach Hotelbeds: ${(e as Error).message}` };
  }
}

// ── Pure mappers (Booking API availability + Content API) ───────

/** Parse a leading star count from a Hotelbeds category name, e.g. "4 STARS". */
export function parseStars(categoryName?: string): number | undefined {
  if (!categoryName) return undefined;
  const m = categoryName.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : undefined;
}

function money(value: unknown, currency: unknown): Money | undefined {
  const amt = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(amt)) return undefined;
  return { amount: amt, currency: typeof currency === "string" ? currency : "EUR" };
}

/** Pure: one hotel from the availability response → summary. */
export function mapAvailabilityHotel(h: any, currency?: string): HotelSummary | null {
  if (!h?.code || !h?.name) return null;
  const cur = h?.currency || currency || "EUR";
  return {
    provider: "hotelbeds",
    id: String(h.code),
    name: String(h.name),
    address: [h.zoneName, h.destinationName].filter(Boolean).join(", ") || undefined,
    city: h.destinationName || h.zoneName,
    thumbnail: undefined, // availability has no images; the detail page loads content
    starRating: parseStars(h.categoryName),
    guestRating: typeof h.reviews?.[0]?.rate === "number" ? h.reviews[0].rate : undefined,
    reviewCount: typeof h.reviews?.[0]?.count === "number" ? h.reviews[0].count : undefined,
    pricePerNight: undefined, // Hotelbeds minRate is a stay total, not per-night — don't imply otherwise
    totalPrice: money(h.minRate, cur),
    amenities: [],
    latitude: typeof h.latitude === "number" ? h.latitude : (h.latitude ? parseFloat(h.latitude) : undefined),
    longitude: typeof h.longitude === "number" ? h.longitude : (h.longitude ? parseFloat(h.longitude) : undefined),
  };
}

/** Pure: map the whole availability payload → summaries. */
export function mapAvailability(payload: any): HotelSummary[] {
  const list = payload?.hotels?.hotels;
  const currency = payload?.hotels?.currency;
  if (!Array.isArray(list)) return [];
  return list.map((h: any) => mapAvailabilityHotel(h, currency)).filter((x: HotelSummary | null): x is HotelSummary => x !== null);
}

const HB_IMAGE_CDN = "https://photos.hotelbeds.com/giata/";

/** Pure: merge Content API detail (+ optional availability) → HotelDetails. */
export function mapContentDetail(content: any, avail?: HotelSummary): HotelDetails {
  const images: string[] = Array.isArray(content?.images)
    ? content.images.map((im: any) => (typeof im?.path === "string" ? HB_IMAGE_CDN + im.path : null)).filter((s: any): s is string => Boolean(s)).slice(0, 8)
    : [];
  const facilities: string[] = Array.isArray(content?.facilities)
    ? content.facilities.map((f: any) => f?.description?.content).filter((s: any): s is string => typeof s === "string")
    : [];
  const name = content?.name?.content || avail?.name || "Hotel";
  const address = content?.address?.content || avail?.address;
  return {
    provider: "hotelbeds",
    id: String(content?.code ?? avail?.id ?? ""),
    name,
    address,
    city: content?.city?.content || avail?.city,
    thumbnail: images[0],
    starRating: parseStars(content?.category?.description?.content) ?? avail?.starRating,
    guestRating: avail?.guestRating,
    reviewCount: avail?.reviewCount,
    pricePerNight: avail?.pricePerNight,
    totalPrice: avail?.totalPrice,
    amenities: facilities.slice(0, 6),
    latitude: typeof content?.coordinates?.latitude === "number" ? content.coordinates.latitude : avail?.latitude,
    longitude: typeof content?.coordinates?.longitude === "number" ? content.coordinates.longitude : avail?.longitude,
    images,
    description: content?.description?.content || undefined,
    amenitiesFull: facilities,
    rooms: [],
  };
}

// ── The provider ────────────────────────────────────────────────

export const HotelbedsProvider: HotelProvider = {
  slug: "hotelbeds",
  name: "Hotelbeds",
  attribution: "Hotels provided by Hotelbeds",

  isConfigured(): boolean {
    return hbCreds() !== null;
  },

  async search(params: HotelSearchParams): Promise<HotelSearchResult | null> {
    const headers = hbHeaders();
    if (!headers) return null;
    try {
      // Booking API availability. A text destination is resolved to a
      // destination code via the content locations endpoint when available;
      // this call is the isolated swap point. Returns live data only.
      const body: any = { stay: {}, occupancies: [{ rooms: params.rooms ?? 1, adults: params.guests ?? 2, children: 0 }] };
      if (params.checkIn) body.stay.checkIn = params.checkIn;
      if (params.checkOut) body.stay.checkOut = params.checkOut;
      // Hotelbeds requires a destination code / geolocation / hotel list. When a
      // resolved destination code is available it is set here; until then this
      // path returns an honest empty result rather than fabricated inventory.
      const destinationCode = params.location && /^[A-Z]{3}$/.test(params.location) ? params.location : undefined;
      if (destinationCode) body.destination = { code: destinationCode };
      else return { provider: this.name, attribution: this.attribution, sample: false, hotels: [], total: 0 };

      const res = await fetch(`${hotelbedsBase()}/hotel-api/1.0/hotels`, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) return null;
      const payload = await res.json();
      const hotels = mapAvailability(payload);
      return { provider: this.name, attribution: this.attribution, sample: false, hotels, total: typeof payload?.hotels?.total === "number" ? payload.hotels.total : hotels.length };
    } catch {
      return null;
    }
  },

  async details(id: string): Promise<HotelDetails | null> {
    const headers = hbHeaders();
    if (!headers) return null;
    try {
      const res = await fetch(`${hotelbedsBase()}/hotel-content-api/1.0/hotels/${encodeURIComponent(id)}/details?language=ENG&useSecondaryLanguage=false`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.hotel) return null;
      return mapContentDetail(data.hotel);
    } catch {
      return null;
    }
  },
};
