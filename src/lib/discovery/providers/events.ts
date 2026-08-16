// ── Near You — events provider (SERVER ONLY) ─────────────────────
// Generic EventsProvider interface so a second provider (e.g. a local venue
// feed) can slot in later without touching the UI. Ticketmaster Discovery is
// the initial adapter. Location is only ever used with the member's consent
// (collected client-side; a city/zip/lat-lng reaches this function, nothing
// tracked or stored beyond the request).

export type EventCategory = "concerts" | "festivals" | "comedy" | "theater" | "sports" | "family" | "arts_culture" | "other";

export interface EventSearchParams {
  /** City name, postal code, or "lat,lng" — whatever the member's location
   *  resolved to. Required; we never guess a location. */
  location: string;
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
  state?: string;
  localDate?: string;
  localTime?: string;
  distanceMiles?: number;
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

// Ticketmaster's `classificationName` segment values we map our categories to.
const SEGMENT_MAP: Partial<Record<EventCategory, string>> = {
  concerts: "Music",
  sports: "Sports",
  theater: "Arts & Theatre",
  arts_culture: "Arts & Theatre",
  family: "Family",
};

export type TicketmasterLocation =
  | { kind: "postalCode"; postalCode: string }
  | { kind: "city"; city: string; stateCode?: string }
  | { kind: "coordinates"; latlong: string }
  | { kind: "invalid" };

/** Converts member-friendly location text into parameters explicitly
 * supported by Ticketmaster Discovery. Street addresses with a city/state
 * suffix use that locality; no address or coordinate is retained. */
export function normalizeTicketmasterLocation(input: string): TicketmasterLocation {
  const value = input.trim().replace(/\s+/g, " ");
  if (!value || value.length > 160) return { kind: "invalid" };
  if (/^\d{5}(?:-\d{4})?$/.test(value)) return { kind: "postalCode", postalCode: value };
  const coordinates = value.match(/^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coordinates) {
    const latitude = Number(coordinates[1]);
    const longitude = Number(coordinates[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) return { kind: "coordinates", latlong: `${latitude},${longitude}` };
  }
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const stateMatch = parts.at(-1)?.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
    const city = parts.at(-2);
    if (city && stateMatch) return { kind: "city", city, stateCode: stateMatch[1].toUpperCase() };
    if (parts.length === 2 && parts[0]) return { kind: "city", city: parts[0] };
  }
  if (/^[\p{L} .'-]+$/u.test(value)) return { kind: "city", city: value };
  return { kind: "invalid" };
}

export function buildTicketmasterQuery(params: EventSearchParams): URLSearchParams | null {
  const location = normalizeTicketmasterLocation(params.location);
  if (location.kind === "invalid") return null;
  const q = new URLSearchParams();
  if (location.kind === "postalCode") q.set("postalCode", location.postalCode);
  if (location.kind === "coordinates") q.set("latlong", location.latlong);
  if (location.kind === "city") {
    q.set("city", location.city);
    if (location.stateCode) q.set("stateCode", location.stateCode);
  }
  q.set("size", String(Math.min(Math.max(params.limit ?? 24, 1), 50)));
  // Establish the postal/city lookup without an additional geographic
  // restriction. Ticketmaster's radius is meaningful with `latlong`; adding
  // it to an exact postalCode request can unintentionally narrow the result.
  if (location.kind === "coordinates") {
    q.set("radius", String(params.radiusMiles ?? 25));
    q.set("unit", "miles");
  }
  q.set("sort", "date,asc");
  const segment = params.category ? SEGMENT_MAP[params.category] : undefined;
  if (segment) q.set("segmentName", segment);
  const classificationName = params.category ? CLASSIFICATION_NAME_MAP[params.category] : undefined;
  if (classificationName) q.set("classificationName", classificationName);
  if (params.category === "festivals") q.set("keyword", "festival");
  return q;
}

function tmKey(): string | undefined {
  return process.env.TICKETMASTER_API_KEY || undefined;
}

export const CLASSIFICATION_NAME_MAP: Partial<Record<EventCategory, string>> = {
  comedy: "Comedy",
};

/** Pure: Ticketmaster classification → our category. Exported for tests. */
export function inferCategory(classifications: unknown): EventCategory {
  const first = Array.isArray(classifications) ? (classifications[0] as any) : undefined;
  const seg = first?.segment?.name;
  const detail = `${first?.genre?.name ?? ""} ${first?.subGenre?.name ?? ""}`.toLowerCase();
  if (detail.includes("comedy")) return "comedy";
  if (detail.includes("festival")) return "festivals";
  if (seg === "Music") return "concerts";
  if (seg === "Sports") return "sports";
  if (seg === "Arts & Theatre") return "theater";
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
    localDate: typeof e?.dates?.start?.localDate === "string" ? e.dates.start.localDate : undefined,
    localTime: typeof e?.dates?.start?.localTime === "string" ? e.dates.start.localTime : undefined,
    distanceMiles: typeof e?.distance === "number" ? e.distance : undefined,
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
    if (!params.location?.trim()) {
      console.error("[ticketmaster] request_attempted=NO api_key_present=REDACTED reason=missing_location");
      return null;
    }
    if (!key) {
      console.error("[ticketmaster] request_attempted=NO api_key_present=NO reason=missing_api_key");
      return null;
    }

    const q = buildTicketmasterQuery(params);
    if (!q) {
      console.error("[ticketmaster] request_attempted=NO api_key_present=YES reason=invalid_location");
      return [];
    }
    const safeEndpoint = `${TICKETMASTER_BASE}/events.json?${q.toString()}`;
    q.set("apikey", key);
    const requestUrl = `${TICKETMASTER_BASE}/events.json?${q.toString()}`;
    const location = normalizeTicketmasterLocation(params.location);
    const safeLocation = location.kind === "postalCode" ? `postalCode:${location.postalCode}`
      : location.kind === "city" ? `city:${location.city}${location.stateCode ? `,${location.stateCode}` : ""}`
        : location.kind === "coordinates" ? "coordinates:provided" : "invalid";
    console.info(`[ticketmaster] request_attempted=YES api_key_present=YES location=${safeLocation} endpoint=${safeEndpoint}`);

    try {
      const res = await fetch(requestUrl, { next: { revalidate: 3600 } });
      const contentType = res.headers.get("content-type") ?? "none";
      const data = await res.json().catch(() => null);
      const jsonParse = data === null ? "FAIL" : "PASS";
      const embeddedEvents = Array.isArray(data?._embedded?.events);
      const resultCount = embeddedEvents ? data._embedded.events.length : 0;
      const safeErrorCode = typeof data?.errors?.[0]?.code === "string" ? data.errors[0].code.slice(0, 60) : res.ok ? "none" : String(res.status);
      const safeErrorMessage = typeof data?.errors?.[0]?.detail === "string" ? data.errors[0].detail.replace(/[\r\n]/g, " ").slice(0, 160)
        : typeof data?.fault?.faultstring === "string" ? data.fault.faultstring.replace(/[\r\n]/g, " ").slice(0, 160)
          : "none";
      console.info(`[ticketmaster] http_status=${res.status} content_type=${contentType} json_parse=${jsonParse} safe_error_code=${safeErrorCode} safe_error_message=${safeErrorMessage} embedded_events=${embeddedEvents ? "YES" : "NO"} results=${resultCount}`);
      if (!res.ok) {
        return null;
      }
      if (!data) {
        return null;
      }
      const events: any[] = data?._embedded?.events ?? [];
      return events.map(mapEvent).filter((e: DiscoveredEvent | null): e is DiscoveredEvent => e !== null);
    } catch {
      console.error("[ticketmaster] event search failed status=network detail=request_failed");
      return null;
    }
  },
};
