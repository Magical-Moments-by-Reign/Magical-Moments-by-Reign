// ── Concierge Platform — core types ─────────────────────────────
// The Concierge is a PLATFORM, not a flight tool. Every luxury service is a
// registered category with an optional provider adapter. Flights (Duffel) is the
// first connected provider; the rest are "coming_soon" until their provider is
// wired — added by dropping in a registry entry + a provider module, never by
// rebuilding the architecture.

export type ServiceStatus =
  | "live"         // real provider, real bookings
  | "test"         // real provider in TEST mode (sample data, no real money)
  | "coming_soon"; // no provider connected yet

export type ServiceGroup = "travel" | "celebrations" | "food" | "beauty" | "keepsakes" | "home";

export interface ConciergeService {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  group: ServiceGroup;
  /** Provider brand once connected (e.g. "Duffel"). Undefined = not connected. */
  provider?: string;
  /** Working destination when built; omitted while coming_soon (never a dead link). */
  href?: string;
  /** What the service supports once live. */
  capability: "search_book" | "request";
}

// ── Generic provider contract ───────────────────────────────────
// A provider adapter implements search (and optionally book) for one service.
// Result/param shapes are provider-specific (a flight ≠ a cake), so they're
// generic here; each service page renders its own provider's shape. The value
// of the contract is a consistent lifecycle + status model across services.
export interface ServiceProvider<Params = unknown, Result = unknown, BookInput = unknown, Booking = unknown> {
  id: string;
  serviceId: string;
  brand: string;
  isConfigured(): boolean;
  isTestMode(): boolean;
  search(params: Params): Promise<Result>;
  book?(input: BookInput): Promise<Booking>;
}
