// ── Luxury Services — catalog + status core (PURE) ──────────────
//
// The honest vocabulary of the Magical Moments Luxury Services marketplace.
// No prisma, no network — plain data + pure helpers, fully unit-testable.
//
// HONESTY BY CONSTRUCTION:
//   • A service is only "connected" (searchable/bookable now) when a REAL
//     provider is wired. With none connected today, every service is
//     "concierge" — the client submits a real request a human/Journey
//     fulfills. Nothing here claims availability, prices, ratings, times, or
//     confirmations.
//   • Reservation status never reads "Confirmed" until a real provider or an
//     authorized concierge records it (see the transitions below).

/** How a service can be engaged right now — always the truth. */
export type ServiceConnection =
  | "connected" // a real provider is wired: searchable/bookable now
  | "concierge" // no direct provider, but the concierge can source it for you
  | "coming_soon" // planned, not yet available in any form
  | "not_connected"; // explicitly unavailable

export interface ServiceCategory {
  id: string;
  /** Plain label, e.g. "Flights". */
  label: string;
  /** Branded label shown to members, e.g. "Magical Moments Flights". */
  brandedLabel: string;
  description: string;
  icon: string;
  connection: ServiceConnection;
  /** Whether a self-serve SEARCH surface exists for this service. When the
   *  service isn't connected, the search path stays honest (no fake results). */
  searchable: boolean;
}

const MM = (name: string) => `Magical Moments ${name}`;

// The 15 branded services. Every one is "concierge" today — honestly sourced
// by a human/Journey via a real request — because no provider is wired. Flip a
// `connection` to "connected" only when its provider actually goes live.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "flights", label: "Flights", brandedLabel: MM("Flights"), description: "Getting there, thoughtfully arranged.", icon: "✈️", connection: "concierge", searchable: true },
  { id: "hotels", label: "Hotels", brandedLabel: MM("Hotels"), description: "Somewhere lovely to rest your head.", icon: "🏨", connection: "concierge", searchable: true },
  { id: "restaurants", label: "Restaurant Reservations", brandedLabel: MM("Restaurant Reservations"), description: "A table for the moments worth gathering around.", icon: "🍽️", connection: "concierge", searchable: true },
  { id: "vacation-packages", label: "Vacation Packages", brandedLabel: MM("Vacation Packages"), description: "The whole journey, curated end to end.", icon: "🌅", connection: "concierge", searchable: true },
  { id: "rental-cars", label: "Rental Cars", brandedLabel: MM("Rental Cars"), description: "The keys to the open road.", icon: "🚗", connection: "concierge", searchable: true },
  { id: "cruises", label: "Cruises", brandedLabel: MM("Cruises"), description: "The sea, and everywhere it can take you.", icon: "🛳️", connection: "concierge", searchable: true },
  { id: "vacation-homes", label: "Vacation Homes", brandedLabel: MM("Vacation Homes"), description: "A home away from home for the whole party.", icon: "🏡", connection: "concierge", searchable: true },
  { id: "entertainment", label: "Entertainment", brandedLabel: MM("Entertainment"), description: "Shows, tickets, and nights to remember.", icon: "🎭", connection: "concierge", searchable: false },
  { id: "experiences", label: "Experiences", brandedLabel: MM("Experiences"), description: "The unforgettable things you'll talk about for years.", icon: "🎟️", connection: "concierge", searchable: false },
  { id: "flowers-gifts", label: "Flowers & Gifts", brandedLabel: MM("Flowers & Gifts"), description: "The right gesture, delivered with care.", icon: "💐", connection: "concierge", searchable: false },
  { id: "transportation", label: "Transportation", brandedLabel: MM("Transportation"), description: "Arrive in comfort and on time.", icon: "🚙", connection: "concierge", searchable: false },
  { id: "photography", label: "Photography", brandedLabel: MM("Photography"), description: "Keep the moment long after it passes.", icon: "📸", connection: "concierge", searchable: false },
  { id: "event-services", label: "Event Services", brandedLabel: MM("Event Services"), description: "Everything the occasion needs, handled.", icon: "🎉", connection: "concierge", searchable: false },
  { id: "wellness", label: "Wellness", brandedLabel: MM("Wellness"), description: "Look and feel your very best.", icon: "💆", connection: "concierge", searchable: false },
  { id: "custom", label: "Custom Requests", brandedLabel: MM("Custom Requests"), description: "Anything else on your mind — just ask.", icon: "✨", connection: "concierge", searchable: false },
];

export function getServiceCategory(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((s) => s.id === id);
}

/** Member-facing label for a connection state. Always honest. */
export function connectionLabel(c: ServiceConnection): string {
  switch (c) {
    case "connected": return "Available now";
    case "concierge": return "Concierge assisted";
    case "coming_soon": return "Coming soon";
    case "not_connected": return "Not yet available";
  }
}

/** The paths a member may choose for a service — the client always chooses. */
export type ServicePath = "search" | "help" | "concierge";

/** Which paths a service offers. Everything offers help + concierge; only
 *  searchable services also offer self-serve search. */
export function pathsFor(service: ServiceCategory): ServicePath[] {
  return service.searchable ? ["search", "help", "concierge"] : ["help", "concierge"];
}

// ── Reservation status ──────────────────────────────────────────

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
  description: string;
  tone: "draft" | "pending" | "active" | "success" | "warn" | "muted";
  showsConfirmation: boolean;
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

const CLIENT_TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  DRAFT: ["REQUEST_SUBMITTED", "CANCELLED"],
  REQUEST_SUBMITTED: ["CANCELLED"],
  CONCIERGE_REVIEWING: ["CANCELLED"],
  AWAITING_PROVIDER: ["CANCELLED"],
  AWAITING_CLIENT_APPROVAL: ["CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CHANGED: ["CANCELLED"],
};

export function clientCanTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return (CLIENT_TRANSITIONS[from] ?? []).includes(to);
}
export function clientCanCancel(from: ReservationStatus): boolean {
  return clientCanTransition(from, "CANCELLED");
}

// ── Intake schemas ──────────────────────────────────────────────

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

/** Quick self-serve restaurant search (destination/date/time/guests). */
export const RESTAURANT_SEARCH: IntakeField[] = [
  { key: "city", label: "Where are you dining?", type: "text", required: true, placeholder: "City or neighborhood" },
  { key: "date", label: "Date", type: "date" },
  { key: "time", label: "Time", type: "time" },
  { key: "guests", label: "Number of guests", type: "number", placeholder: "2" },
];

/** "Help Me Find the Perfect Restaurant" — the guided, concierge-style intake. */
export const RESTAURANT_HELP: IntakeField[] = [
  { key: "city", label: "City or location", type: "text", required: true, placeholder: "e.g. Savannah, GA" },
  { key: "occasion", label: "What's the occasion?", type: "select", options: ["Date Night", "Birthday", "Anniversary", "Family Dinner", "Business Meeting", "Vacation", "Proposal", "Celebration", "Just Because"] },
  { key: "atmosphere", label: "Preferred atmosphere", type: "select", options: ["Elegant", "Romantic", "Relaxed", "Fun", "Quiet", "Modern", "Historic", "Family Friendly"] },
  { key: "cuisine", label: "Cuisine preference", type: "text", placeholder: "e.g. Italian, steakhouse, seafood" },
  { key: "guests", label: "Number of guests", type: "number", placeholder: "2" },
  { key: "date", label: "Preferred date", type: "date" },
  { key: "time", label: "Preferred time", type: "time" },
  { key: "budget", label: "Budget", type: "select", options: ["$", "$$", "$$$", "$$$$", "No preference"] },
  { key: "seating", label: "Indoor or outdoor", type: "select", options: ["Indoor", "Outdoor", "Rooftop", "Private room", "No preference"] },
  { key: "dietary", label: "Food allergies or dietary needs", type: "textarea", placeholder: "Anything we should tell the kitchen" },
  { key: "accessibility", label: "Accessibility needs", type: "textarea", placeholder: "Step-free access, seating needs, etc." },
  { key: "notes", label: "Special requests", type: "textarea", placeholder: "Anything else that would help us find the perfect table" },
];

/** Flights search intake. */
export const FLIGHTS_SEARCH: IntakeField[] = [
  { key: "from", label: "Departure airport", type: "text", required: true, placeholder: "e.g. ATL" },
  { key: "to", label: "Destination", type: "text", required: true, placeholder: "e.g. CDG" },
  { key: "departDate", label: "Departure date", type: "date" },
  { key: "returnDate", label: "Return date", type: "date" },
  { key: "passengers", label: "Passengers", type: "number", placeholder: "1" },
  { key: "cabin", label: "Cabin class", type: "select", options: ["Economy", "Premium Economy", "Business", "First"] },
  { key: "flexible", label: "Flexible dates", type: "select", options: ["Yes, flexible", "Somewhat flexible", "Not flexible"] },
  { key: "stops", label: "Stops preference", type: "select", options: ["Nonstop preferred", "1 stop OK", "Any"] },
  { key: "budget", label: "Budget", type: "text", placeholder: "e.g. up to $900 per person" },
];

/** Vacation package intake. */
export const VACATION_PACKAGE: IntakeField[] = [
  { key: "destination", label: "Destination", type: "text", required: true, placeholder: "Where would you like to go?" },
  { key: "dates", label: "Travel dates", type: "text", placeholder: "e.g. June 10–17" },
  { key: "travelers", label: "Number of travelers", type: "number", placeholder: "2" },
  { key: "hotelRating", label: "Preferred hotel rating", type: "select", options: ["3-star", "4-star", "5-star", "No preference"] },
  { key: "budget", label: "Budget", type: "text", placeholder: "e.g. up to $5,000 total" },
  { key: "airfare", label: "Include airfare?", type: "select", options: ["Yes, include airfare", "No, lodging only"] },
  { key: "notes", label: "Anything else?", type: "textarea", placeholder: "Occasion, must-haves, preferences" },
];

/** Generic custom concierge request. */
export const CUSTOM_INTAKE: IntakeField[] = [
  { key: "title", label: "What can we help with?", type: "text", required: true, placeholder: "e.g. A private chef for an anniversary dinner" },
  { key: "city", label: "City or location", type: "text", placeholder: "Where should this happen?" },
  { key: "date", label: "Preferred date", type: "date" },
  { key: "budget", label: "Budget (optional)", type: "text", placeholder: "e.g. up to $500" },
  { key: "notes", label: "Details", type: "textarea", placeholder: "Tell us everything that would help" },
];

/**
 * Intake schema for a service + path. "search" gives the quick self-serve
 * form where one exists; "help" gives the guided, concierge-style questions.
 */
export function intakeFor(serviceId: string, path: ServicePath = "help"): IntakeField[] {
  if (serviceId === "restaurants") return path === "search" ? RESTAURANT_SEARCH : RESTAURANT_HELP;
  if (serviceId === "flights") return FLIGHTS_SEARCH;
  if (serviceId === "vacation-packages") return VACATION_PACKAGE;
  return CUSTOM_INTAKE;
}

// ── Restaurant filters (browse-yourself) ────────────────────────

export interface FilterGroup { id: string; label: string; options: string[] }

export const RESTAURANT_FILTERS: FilterGroup[] = [
  { id: "cuisine", label: "Cuisine", options: ["Italian", "Steakhouse", "Seafood", "Mexican", "Japanese", "Chinese", "Thai", "Indian", "Southern", "American", "French", "Mediterranean", "Barbecue", "Breakfast", "Brunch", "Desserts", "Coffee", "Pizza", "Vegan", "Vegetarian", "Gluten Free"] },
  { id: "price", label: "Price", options: ["$", "$$", "$$$", "$$$$"] },
  { id: "style", label: "Dining Style", options: ["Casual", "Family Friendly", "Romantic", "Luxury Dining", "Business Dining", "Private Dining", "Outdoor Patio", "Rooftop", "Waterfront", "Wine Bar", "Live Music", "Chef's Table"] },
  { id: "features", label: "Features", options: ["Reservations Available", "Walk-ins Welcome", "Wheelchair Accessible", "Pet Friendly", "Kid Friendly", "Free Parking", "Valet Parking", "Hotel Restaurant", "Open Late"] },
  { id: "distance", label: "Distance", options: ["Nearby", "Within 5 Miles", "Within 10 Miles", "Entire City"] },
];
