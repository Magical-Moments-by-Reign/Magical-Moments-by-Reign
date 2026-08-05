// ── Duffel flights (server only) ────────────────────────────────
// Thin server-side client for the Duffel Flights API. The token is read from
// DUFFEL_ACCESS_TOKEN and NEVER exposed to the browser. A `duffel_test_...` token
// returns Duffel's TEST inventory — sample data, no real money, no real tickets.
// We surface that clearly in the UI and never claim a real booking.
//
// Env:
//   DUFFEL_ACCESS_TOKEN   Duffel access token (test token starts with duffel_test_)
//   DUFFEL_VERSION     API version header (default "v2")
//
// SERVER ONLY — do not import from a client component.

const BASE = "https://api.duffel.com";

export function duffelConfigured(): boolean {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN);
}

/** True when the configured token is a TEST token (sample data, no real money). */
export function duffelTestMode(): boolean {
  return (process.env.DUFFEL_ACCESS_TOKEN || "").includes("test");
}

export class DuffelError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function duffel<T>(path: string, init: { method: string; body?: unknown; query?: Record<string, string> }): Promise<T> {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) throw new DuffelError("Flights are not connected yet.", 503);
  const version = process.env.DUFFEL_VERSION || "v2";
  const qs = init.query ? "?" + new URLSearchParams(init.query).toString() : "";
  const res = await fetch(`${BASE}${path}${qs}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": version,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify({ data: init.body }) : undefined,
    // Duffel searches can be slow; cap so a hung request can't stall the route.
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.errors?.[0]?.title || `Duffel request failed (${res.status}).`;
    throw new DuffelError(msg, res.status);
  }
  return json.data as T;
}

// ── Types (only the fields we use) ──────────────────────────────
export interface DuffelSegment {
  origin: { iata_code: string; name?: string };
  destination: { iata_code: string; name?: string };
  departing_at: string;
  arriving_at: string;
  marketing_carrier: { name: string; iata_code: string };
  marketing_carrier_flight_number?: string;
}
export interface DuffelSlice { duration?: string; segments: DuffelSegment[] }
export interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  owner: { name: string; iata_code: string; logo_symbol_url?: string };
  slices: DuffelSlice[];
  passengers?: { id: string; type?: string }[];
  expires_at?: string;
  conditions?: { refund_before_departure?: { allowed?: boolean } | null };
}

// ── Places (city / airport translation) ─────────────────────────
export interface PlaceSuggestion { name: string; iata: string; type: string; city?: string; country?: string }

/** Turn a human place ("Orlando", "Paris", "Disney World") into airport/city
 *  IATA options. Duffel resolves the codes — we never guess them. */
export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  const data = await duffel<any[]>("/places/suggestions", { method: "GET", query: { query: q } });
  return (data || [])
    .filter((p) => p?.iata_code)
    .map((p) => ({ name: p.name, iata: p.iata_code, type: p.type, city: p.city_name, country: p.iata_country_code }))
    .slice(0, 8);
}
interface OfferRequestResponse { id: string; offers: DuffelOffer[]; passengers: { id: string; type: string }[] }

export type Cabin = "economy" | "premium_economy" | "business" | "first";

export interface SearchInput {
  origin: string;        // IATA, e.g. "JFK"
  destination: string;   // IATA, e.g. "LHR"
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;   // YYYY-MM-DD (round trip)
  adults: number;        // 1–9
  cabin: Cabin;
}

/** A trimmed, UI-friendly offer summary (pure mapping — unit tested). */
export interface OfferSummary {
  id: string;
  airline: string;
  airlineCode: string;
  airlineLogo: string | null;
  price: string;         // formatted, e.g. "$482.30"
  amount: number;
  currency: string;
  expiresAt: string | null;
  refundable: boolean | null; // null = unknown (never invented)
  slices: {
    from: string; to: string; depart: string; arrive: string;
    stops: number; carriers: string[]; durationMins: number | null;
    layovers: string[];
  }[];
}

function isoDurationToMins(d?: string): number | null {
  if (!d) return null;
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(d);
  if (!m) return null;
  const [, days, hrs, mins] = m;
  return (Number(days || 0) * 1440) + (Number(hrs || 0) * 60) + Number(mins || 0);
}

function fmtMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (!isFinite(n)) return `${amount} ${currency}`;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

/** PURE: turn a Duffel offer into the summary the UI renders. */
export function summarizeOffer(o: DuffelOffer): OfferSummary {
  const refund = o.conditions?.refund_before_departure;
  return {
    id: o.id,
    airline: o.owner?.name ?? "Airline",
    airlineCode: o.owner?.iata_code ?? "",
    airlineLogo: o.owner?.logo_symbol_url ?? null,
    price: fmtMoney(o.total_amount, o.total_currency),
    amount: Number(o.total_amount),
    currency: o.total_currency,
    expiresAt: o.expires_at ?? null,
    refundable: refund == null ? null : Boolean(refund.allowed),
    slices: (o.slices || []).map((s) => {
      const segs = s.segments || [];
      const first = segs[0]; const last = segs[segs.length - 1];
      // Layover airports = every intermediate stop between segments.
      const layovers = segs.slice(0, -1).map((seg) => seg.destination?.iata_code).filter(Boolean) as string[];
      return {
        from: first?.origin?.iata_code ?? "",
        to: last?.destination?.iata_code ?? "",
        depart: first?.departing_at ?? "",
        arrive: last?.arriving_at ?? "",
        stops: Math.max(0, segs.length - 1),
        carriers: Array.from(new Set(segs.map((x) => x.marketing_carrier?.name).filter(Boolean))) as string[],
        durationMins: isoDurationToMins(s.duration),
        layovers,
      };
    }),
  };
}

/** Search flights. Returns raw offers + the offer_request id + passenger ids
 *  (needed later to create an order). Test token → test inventory. */
export async function searchOffers(input: SearchInput): Promise<{ requestId: string; passengerIds: string[]; offers: DuffelOffer[] }> {
  const slices: { origin: string; destination: string; departure_date: string }[] = [
    { origin: input.origin.toUpperCase(), destination: input.destination.toUpperCase(), departure_date: input.departureDate },
  ];
  if (input.returnDate) {
    slices.push({ origin: input.destination.toUpperCase(), destination: input.origin.toUpperCase(), departure_date: input.returnDate });
  }
  const passengers = Array.from({ length: Math.max(1, Math.min(9, input.adults)) }, () => ({ type: "adult" }));
  const data = await duffel<OfferRequestResponse>("/air/offer_requests", {
    method: "POST",
    query: { return_offers: "true", supplier_timeout: "20000" },
    body: { slices, passengers, cabin_class: input.cabin },
  });
  // Cheapest first.
  const offers = (data.offers || []).slice().sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
  return { requestId: data.id, passengerIds: (data.passengers || []).map((p) => p.id), offers };
}

/** Fetch a single offer (fresh price) before booking. */
export async function getOffer(offerId: string): Promise<DuffelOffer> {
  return duffel<DuffelOffer>(`/air/offers/${encodeURIComponent(offerId)}`, { method: "GET" });
}

export interface OrderPassenger {
  id: string;            // must match a passenger id from the offer request
  title: string;         // mr | ms | mrs | miss | dr
  given_name: string;
  family_name: string;
  born_on: string;       // YYYY-MM-DD
  gender: string;        // m | f
  email: string;
  phone_number: string;  // E.164, e.g. +14155550123
}

/** Create a TEST order (Duffel test mode — no real money, no real ticket).
 *  Pays with the Duffel test balance. Returns the booking reference. */
export async function createTestOrder(offer: DuffelOffer, passengers: OrderPassenger[]): Promise<{ id: string; bookingReference: string }> {
  const order = await duffel<{ id: string; booking_reference: string }>("/air/orders", {
    method: "POST",
    body: {
      type: "instant",
      selected_offers: [offer.id],
      passengers,
      payments: [{ type: "balance", amount: offer.total_amount, currency: offer.total_currency }],
    },
  });
  return { id: order.id, bookingReference: order.booking_reference };
}
