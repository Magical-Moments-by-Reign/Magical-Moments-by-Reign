// ── Concierge & Reservations — catalog + status core (PURE) ─────
//
// The honest vocabulary of the Concierge & Reservations Hub. No prisma, no
// network — plain data + pure helpers, fully unit-testable.
//
// HONESTY BY CONSTRUCTION:
//   • A service is only "connected" (bookable now) when a REAL provider is
//     wired. With none connected today, every service is "concierge" — the
//     client submits a real request a human/Journey fulfills. Nothing here
//     claims instant availability, prices, or confirmations.
//   • Reservation status never reads "Confirmed" until a real provider or an
//     authorized concierge records it (see reservation-status transitions).

/** How a service can be engaged right now — always the truth. */
export type ServiceConnection =
  | "connected" // a real provider is wired: searchable/bookable now
  | "concierge" // no direct provider, but the concierge can source it for you
  | "coming_soon" // planned, not yet available in any form
  | "not_connected"; // explicitly unavailable

export interface ServiceCategory {
  id: string;
  label: string;
  description: string;
  /** Emoji accent for the card (line-art icons can replace later). */
  icon: string;
  connection: ServiceConnection;
  /** Whether this category has a structured intake flow (vs. a generic request). */
  hasIntake?: boolean;
}

// The 14 categories. Every one is "concierge" today — honestly sourced by a
// human/Journey via a real request — because no reservation provider is wired.
// Flip a `connection` to "connected" only when its provider actually goes live.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "restaurants", label: "Restaurant Reservations", description: "A table for the moments worth gathering around.", icon: "🍽️", connection: "concierge", hasIntake: true },
  { id: "flights", label: "Flights", description: "Getting there, thoughtfully arranged.", icon: "✈️", connection: "concierge" },
  { id: "hotels", label: "Hotels & Lodging", description: "Somewhere lovely to rest your head.", icon: "🏨", connection: "concierge" },
  { id: "vacation-packages", label: "Vacation Packages", description: "The whole journey, curated end to end.", icon: "🌅", connection: "concierge" },
  { id: "vacation-homes", label: "Vacation Homes", description: "A home away from home for the whole party.", icon: "🏡", connection: "concierge" },
  { id: "rental-cars", label: "Rental Cars", description: "The keys to the open road.", icon: "🚗", connection: "concierge" },
  { id: "private-transportation", label: "Private Transportation", description: "Arrive in comfort and on time.", icon: "🚙", connection: "concierge" },
  { id: "cruises", label: "Cruises", description: "The sea, and everywhere it can take you.", icon: "🛳️", connection: "concierge" },
  { id: "experiences", label: "Experiences & Excursions", description: "The unforgettable things you'll talk about for years.", icon: "🎟️", connection: "concierge" },
  { id: "event-venues", label: "Event Venues", description: "The perfect setting for the occasion.", icon: "🏛️", connection: "concierge" },
  { id: "beauty-wellness", label: "Beauty & Wellness", description: "Look and feel your very best.", icon: "💆", connection: "concierge" },
  { id: "gifts-deliveries", label: "Gifts & Deliveries", description: "The right gesture, delivered with care.", icon: "🎁", connection: "concierge" },
  { id: "local-recommendations", label: "Local Recommendations", description: "Insider picks for wherever you are.", icon: "📍", connection: "concierge" },
  { id: "custom", label: "Custom Concierge Request", description: "Anything else on your mind — just ask.", icon: "✨", connection: "concierge", hasIntake: true },
];

export function getServiceCategory(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((s) => s.id === id);
}

/** Member-facing label for a connection state. Always honest. */
export function connectionLabel(c: ServiceConnection): string {
  switch (c) {
    case "connected": return "Bookable now";
    case "concierge": return "Concierge assisted";
    case "coming_soon": return "Coming soon";
    case "not_connected": return "Not yet available";
  }
}

// ── Reservation status ──────────────────────────────────────────

/** The lifecycle of a reservation request. Stored as the string value. */
export type ReservationStatus =
  | "DRAFT"
  | "REQUEST_SUBMITTED"
  | "CONCIERGE_REVIEWING"
  | "AWAITING_PROVIDER"
  | "AWAITING_CLIENT_APPROVAL"
  | "CONFIRMED"
  | "CHANGED"
  | "CANCELLED"
  | "COMPLETED";

export interface ReservationStatusMeta {
  label: string;
  /** A short, honest description shown on the record. */
  description: string;
  /** Visual tone token (drives the badge color in CSS). */
  tone: "draft" | "pending" | "active" | "success" | "warn" | "muted";
  /** A confirmation number is only meaningful (and shown) in these states. */
  showsConfirmation: boolean;
  /** True when no further movement is expected. */
  terminal: boolean;
}

export const RESERVATION_STATUS: Record<ReservationStatus, ReservationStatusMeta> = {
  DRAFT: { label: "Draft", description: "Saved but not yet submitted.", tone: "draft", showsConfirmation: false, terminal: false },
  REQUEST_SUBMITTED: { label: "Request Submitted", description: "Concierge request submitted — reservation not yet confirmed.", tone: "pending", showsConfirmation: false, terminal: false },
  CONCIERGE_REVIEWING: { label: "Concierge Reviewing", description: "Our concierge is reviewing your request.", tone: "pending", showsConfirmation: false, terminal: false },
  AWAITING_PROVIDER: { label: "Awaiting Provider", description: "We've reached out to the provider and are awaiting their response.", tone: "pending", showsConfirmation: false, terminal: false },
  AWAITING_CLIENT_APPROVAL: { label: "Awaiting Your Approval", description: "Options are ready for you to review and approve.", tone: "warn", showsConfirmation: false, terminal: false },
  CONFIRMED: { label: "Confirmed", description: "Confirmed by the provider or concierge team.", tone: "success", showsConfirmation: true, terminal: false },
  CHANGED: { label: "Changed", description: "The provider changed this reservation — please review.", tone: "warn", showsConfirmation: true, terminal: false },
  CANCELLED: { label: "Cancelled", description: "This request was cancelled.", tone: "muted", showsConfirmation: false, terminal: true },
  COMPLETED: { label: "Completed", description: "This reservation is complete.", tone: "success", showsConfirmation: true, terminal: true },
};

/** Statuses a member can set themselves (the rest are concierge/provider-driven).
 *  Crucially, a member can NEVER move a record to CONFIRMED — only an
 *  authorized concierge/provider records a real confirmation. */
const CLIENT_TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  DRAFT: ["REQUEST_SUBMITTED", "CANCELLED"],
  REQUEST_SUBMITTED: ["CANCELLED"],
  CONCIERGE_REVIEWING: ["CANCELLED"],
  AWAITING_PROVIDER: ["CANCELLED"],
  AWAITING_CLIENT_APPROVAL: ["CANCELLED"], // approval of a real option is a separate, provider-recorded step
  CONFIRMED: ["CANCELLED"], // request-to-cancel; subject to the provider's policy
  CHANGED: ["CANCELLED"],
};

/** Whether the member may move a reservation from `from` to `to` themselves. */
export function clientCanTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return (CLIENT_TRANSITIONS[from] ?? []).includes(to);
}

/** Whether the member may cancel from this status. */
export function clientCanCancel(from: ReservationStatus): boolean {
  return clientCanTransition(from, "CANCELLED");
}

// ── Restaurant intake ───────────────────────────────────────────

export type IntakeFieldType = "text" | "date" | "time" | "number" | "select" | "textarea";

export interface IntakeField {
  key: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
}

/** The restaurant reservation intake — captured as a real request (never a
 *  booking) and handed to the concierge. */
export const RESTAURANT_INTAKE: IntakeField[] = [
  { key: "city", label: "City or location", type: "text", required: true, placeholder: "e.g. Savannah, GA" },
  { key: "date", label: "Preferred date", type: "date" },
  { key: "time", label: "Preferred time", type: "time" },
  { key: "guests", label: "Number of guests", type: "number", placeholder: "2" },
  { key: "cuisine", label: "Cuisine preference", type: "text", placeholder: "e.g. Italian, steakhouse, seafood" },
  { key: "priceRange", label: "Price range", type: "select", options: ["$", "$$", "$$$", "$$$$", "No preference"] },
  { key: "seating", label: "Seating", type: "select", options: ["Indoor", "Outdoor", "Rooftop", "Private room", "No preference"] },
  { key: "dietary", label: "Dietary restrictions or allergies", type: "textarea", placeholder: "Anything we should tell the kitchen" },
  { key: "accessibility", label: "Accessibility needs", type: "textarea", placeholder: "Step-free access, seating needs, etc." },
  { key: "occasion", label: "Special occasion", type: "text", placeholder: "e.g. anniversary, birthday" },
  { key: "flexible", label: "Flexibility with date or time", type: "select", options: ["Yes, flexible", "Somewhat flexible", "Not flexible"] },
  { key: "notes", label: "Additional notes", type: "textarea", placeholder: "Anything else that would help us find the perfect table" },
];

/** A short intake for the generic custom concierge request. */
export const CUSTOM_INTAKE: IntakeField[] = [
  { key: "title", label: "What can we help with?", type: "text", required: true, placeholder: "e.g. Send flowers to my mother in Atlanta" },
  { key: "city", label: "City or location", type: "text", placeholder: "Where should this happen?" },
  { key: "date", label: "Preferred date", type: "date" },
  { key: "budget", label: "Budget (optional)", type: "text", placeholder: "e.g. up to $200" },
  { key: "notes", label: "Details", type: "textarea", placeholder: "Tell us everything that would help" },
];

/** The intake schema for a service (restaurants + custom have structured ones). */
export function intakeFor(serviceId: string): IntakeField[] {
  if (serviceId === "restaurants") return RESTAURANT_INTAKE;
  return CUSTOM_INTAKE;
}
