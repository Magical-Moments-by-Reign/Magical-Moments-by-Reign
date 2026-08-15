// ── Near You — events provider (SERVER ONLY) ─────────────────────
// Generic EventsProvider interface so a second provider (e.g. a local venue
// feed) can slot in later without touching the UI. Ticketmaster Discovery is
// the initial adapter. Location is only ever used with the member's consent
// (collected client-side; a city/zip/lat-lng reaches this function, nothing
// tracked or stored beyond the request).

import { writeEventsDiagnostic, type EventsDiagnostic } from "../events-diagnostics";

export type EventCategory = "concerts" | "festivals" | "comedy" | "theater" | "sports" | "family" | "arts_culture" | "other";

export interface EventSearchParams {
  /** City name ("Atlanta"), "City, ST" ("Atlanta, GA"), or a 5-digit US ZIP
   *  ("30032") — whatever the member typed, or a human-readable label for a
   *  `coords` search (e.g. "Near you"). Required as a display label even
   *  when `coords` is set; resolved into Ticketmaster's own
   *  postalCode/city/stateCode params only when `coords` is absent — no
   *  geocoding involved, no third-party geocoder needed. */
  location: string;
  /** Real device/browser geolocation, when the member granted permission —
   *  sent to Ticketmaster's own `latlong` radius search directly. Takes
   *  priority over `location` for the actual query; `location` is still
   *  used as the display label. Rounded to ~1km buckets by the caller
   *  before this reaches the cache key, so nearby requests share a cache
   *  entry instead of each exact coordinate pair missing every time. */
  coords?: { lat: number; lng: number };
  /** Free-text artist/team/venue search — sent straight through to
   *  Ticketmaster's own `keyword` param, no local matching/guessing. */
  keyword?: string;
  category?: EventCategory;
  radiusMiles?: number;
  limit?: number;
}

export interface DiscoveredEvent {
  id: string; // provider event id
  name: string;
  imageUrl?: string;
  startsAt?: string; // ISO, when the provider gives a real date/time
  venueName?: string;
  city?: string;
  state?: string; // USPS state code, when Ticketmaster's venue record has one
  category: EventCategory;
  ticketUrl: string; // the provider's own official ticket page — always
}

export interface EventsProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  isConfigured(): boolean;
  search(params: EventSearchParams): Promise<DiscoveredEvent[] | null>;
}

const TICKETMASTER_BASE = "https://app.ticketmaster.com/discovery/v2";

// Ticketmaster's real Discovery API segments (confirmed against current
// platform docs — Music, Sports, Arts & Theatre, Family, Film, Miscellaneous
// — there is no distinct top-level "Comedy" or "Festival" segment; Comedy is
// a GENRE under Arts & Theatre, and festivals span multiple segments, so
// neither gets an outbound `segmentName` — see CLASSIFICATION_NAME_MAP for
// the one addition that IS a real, documented Discovery API param).
export const SEGMENT_MAP: Partial<Record<EventCategory, string>> = {
  concerts: "Music",
  sports: "Sports",
  theater: "Arts & Theatre",
  arts_culture: "Arts & Theatre",
  family: "Family",
};

// `classificationName` is a separate, documented Discovery API param that
// fuzzy-matches a segment, genre, or sub-genre name — used here only for
// "comedy", which Ticketmaster doesn't expose as its own segment.
export const CLASSIFICATION_NAME_MAP: Partial<Record<EventCategory, string>> = {
  comedy: "Comedy",
};

// USPS state/territory codes — used to recognize a trailing "City, ST" or
// "City ST" pattern in free-text location input without guessing. Anything
// that doesn't match one of these falls back to a plain `city` search.
const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR",
]);

export interface ResolvedLocation {
  postalCode: string | null;
  city: string | null;
  stateCode: string | null;
  countryCode: string | null;
}

/** Pure: turn free-text member input into Ticketmaster's own location
 *  params — postalCode for a 5-digit US ZIP, city/stateCode for "City, ST",
 *  or a plain city search otherwise. No geocoding — Ticketmaster's Discovery
 *  API accepts all three natively. Exported for tests. */
export function buildLocationParams(location: string): ResolvedLocation {
  const trimmed = location.trim();

  if (/^\d{5}$/.test(trimmed)) {
    return { postalCode: trimmed, city: null, stateCode: null, countryCode: "US" };
  }

  const cityStateMatch = trimmed.match(/^(.+?),?\s+([A-Za-z]{2})$/);
  const candidateState = cityStateMatch?.[2]?.toUpperCase();
  if (cityStateMatch && candidateState && US_STATE_CODES.has(candidateState)) {
    return { postalCode: null, city: cityStateMatch[1].trim(), stateCode: candidateState, countryCode: "US" };
  }

  return { postalCode: null, city: trimmed, stateCode: null, countryCode: null };
}

function tmKey(): string | undefined {
  return process.env.TICKETMASTER_API_KEY || undefined;
}

/** Pure: Ticketmaster classification → our category. Exported for tests. */
export function inferCategory(classifications: unknown): EventCategory {
  const first = Array.isArray(classifications) ? (classifications[0] as { segment?: { name?: unknown }; genre?: { name?: unknown } }) : undefined;
  const seg = first?.segment?.name;
  const genre = first?.genre?.name;
  if (seg === "Arts & Theatre" && genre === "Comedy") return "comedy";
  if (seg === "Music") return "concerts";
  if (seg === "Sports") return "sports";
  if (seg === "Arts & Theatre") return "theater";
  if (seg === "Family") return "family";
  if (seg === "Film") return "arts_culture";
  return "other";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Pure: map one Ticketmaster event → our shape. Exported for tests. */
export function mapEvent(e: any): DiscoveredEvent | null {
  const id = e?.id;
  const name = e?.name;
  const url = e?.url;
  if (!id || !name || !url) return null;
  const venue = e?._embedded?.venues?.[0];
  const images: any[] = Array.isArray(e?.images) ? e.images : [];
  const bestImage = images.sort((a, b) => (b?.width ?? 0) - (a?.width ?? 0))[0];
  return {
    id: String(id),
    name: String(name),
    imageUrl: typeof bestImage?.url === "string" ? bestImage.url : undefined,
    startsAt: typeof e?.dates?.start?.dateTime === "string" ? e.dates.start.dateTime : undefined,
    venueName: typeof venue?.name === "string" ? venue.name : undefined,
    city: typeof venue?.city?.name === "string" ? venue.city.name : undefined,
    state: typeof venue?.state?.stateCode === "string" ? venue.state.stateCode : undefined,
    category: inferCategory(e?.classifications),
    ticketUrl: String(url),
  };
}

export const TicketmasterProvider: EventsProvider = {
  slug: "ticketmaster",
  name: "Ticketmaster",
  attribution: "Powered by Ticketmaster Discovery.",

  isConfigured(): boolean {
    return Boolean(tmKey());
  },

  async search(params: EventSearchParams): Promise<DiscoveredEvent[] | null> {
    const key = tmKey();
    const radiusMiles = params.radiusMiles ?? 25;
    const location = params.coords ? { postalCode: null, city: null, stateCode: null, countryCode: null } : buildLocationParams(params.location ?? "");
    const segment = params.category ? SEGMENT_MAP[params.category] : undefined;
    const classificationName = params.category ? CLASSIFICATION_NAME_MAP[params.category] : undefined;
    const classificationSent = segment ?? classificationName ?? null;
    const hasUsableLocation = Boolean(params.coords) || Boolean(params.location?.trim());

    const diag: EventsDiagnostic = {
      requestAttempted: false,
      apiKeyPresent: Boolean(key),
      searchInput: params.coords ? `${params.coords.lat},${params.coords.lng}` : (params.location ?? "").trim().slice(0, 80),
      postalCodeSent: location.postalCode,
      citySent: location.city,
      stateCodeSent: location.stateCode,
      radiusMiles,
      classificationSent,
      httpStatus: null,
      contentType: null,
      jsonParsed: false,
      safeError: null,
      embeddedEventsPresent: false,
      eventsReturned: 0,
      recordedAt: new Date().toISOString(),
    };

    if (!key || !hasUsableLocation) {
      await writeEventsDiagnostic(diag);
      return null;
    }

    const q = new URLSearchParams();
    q.set("apikey", key);
    if (params.coords) {
      q.set("latlong", `${params.coords.lat},${params.coords.lng}`);
    } else {
      if (location.postalCode) q.set("postalCode", location.postalCode);
      if (location.city) q.set("city", location.city);
      if (location.stateCode) q.set("stateCode", location.stateCode);
      if (location.countryCode) q.set("countryCode", location.countryCode);
    }
    q.set("size", String(Math.min(Math.max(params.limit ?? 12, 1), 50)));
    q.set("radius", String(radiusMiles));
    q.set("unit", "miles");
    q.set("sort", "date,asc");
    if (params.keyword?.trim()) q.set("keyword", params.keyword.trim());
    if (segment) q.set("segmentName", segment);
    else if (classificationName) q.set("classificationName", classificationName);

    diag.requestAttempted = true;

    const res = await fetch(`${TICKETMASTER_BASE}/events.json?${q.toString()}`, { next: { revalidate: 3600 } }).catch(() => null);
    if (!res) {
      diag.safeError = "network_error";
      await writeEventsDiagnostic(diag);
      return null;
    }

    diag.httpStatus = res.status;
    diag.contentType = res.headers.get("content-type");

    const data = await res.json().catch(() => null);
    diag.jsonParsed = data !== null && typeof data === "object";

    if (!res.ok) {
      const errObj = diag.jsonParsed ? (data as { fault?: { faultstring?: unknown }; errors?: unknown[] }) : null;
      diag.safeError = errObj?.fault?.faultstring
        ? String(errObj.fault.faultstring).slice(0, 200)
        : Array.isArray(errObj?.errors) && errObj.errors[0]
          ? JSON.stringify(errObj.errors[0]).slice(0, 200)
          : `HTTP ${res.status}`;
      await writeEventsDiagnostic(diag);
      return null;
    }

    if (!diag.jsonParsed) {
      diag.safeError = "invalid_json";
      await writeEventsDiagnostic(diag);
      return null;
    }

    const events: any[] = (data as any)?._embedded?.events ?? [];
    diag.embeddedEventsPresent = Boolean((data as any)?._embedded?.events);
    const mapped = events.map(mapEvent).filter((e: DiscoveredEvent | null): e is DiscoveredEvent => e !== null);
    diag.eventsReturned = mapped.length;
    await writeEventsDiagnostic(diag);
    return mapped;
  },
};
