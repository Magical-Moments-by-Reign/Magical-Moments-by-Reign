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

function tmKey(): string | undefined {
  return process.env.TICKETMASTER_API_KEY || undefined;
}

/** Pure: Ticketmaster classification → our category. Exported for tests. */
export function inferCategory(classifications: unknown): EventCategory {
  const seg = Array.isArray(classifications) ? (classifications[0] as any)?.segment?.name : undefined;
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
    if (!key || !params.location?.trim()) return null;

    const q = new URLSearchParams();
    q.set("apikey", key);
    // Ticketmaster wants either `city`/`postalCode` or `latlong` — pass
    // whatever the caller resolved as a plain keyword search too, so a
    // free-text location still returns something reasonable.
    q.set("keyword", params.location.trim());
    q.set("size", String(Math.min(Math.max(params.limit ?? 12, 1), 50)));
    q.set("radius", String(params.radiusMiles ?? 25));
    q.set("unit", "miles");
    q.set("sort", "date,asc");
    const segment = params.category ? SEGMENT_MAP[params.category] : undefined;
    if (segment) q.set("segmentName", segment);

    try {
      const res = await fetch(`${TICKETMASTER_BASE}/events.json?${q.toString()}`, { next: { revalidate: 3600 } });
      if (!res.ok) return null;
      const data = await res.json();
      const events: any[] = data?._embedded?.events ?? [];
      return events.map(mapEvent).filter((e: DiscoveredEvent | null): e is DiscoveredEvent => e !== null);
    } catch {
      return null;
    }
  },
};
