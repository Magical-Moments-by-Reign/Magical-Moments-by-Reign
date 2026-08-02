// ── The Magical Moments Ecosystem — integrations registry ───────
// Magical Moments is a complete Life Celebration Ecosystem: customers should
// never feel they must leave to finish planning a meaningful moment. This is the
// provider-agnostic architecture that lets trusted third-party services plug in
// later (secure APIs, embeds, affiliate/guided connections) WITHOUT redesign —
// and the "What do I need next?" suggestion logic that anticipates each
// occasion's needs.
//
// Guardrails (same discipline as the Magical+ Financing Gateway): no provider
// is hardcoded; a category shows as a "guided connection / coming soon" until a
// real provider is registered; we never fabricate a booking, price, or
// availability. The goal is to be the trusted place every moment begins, grows,
// and is preserved — not to replace every company.

// How a category connects once a provider exists.
export type ConnectionType =
  | "native"    // built into Magical Moments (e.g. invitations, payments seam)
  | "api"       // secure server-side API integration
  | "embed"     // embedded widget (maps, music, live stream)
  | "affiliate" // deep link / affiliate handoff (registries, gift cards)
  | "guided";   // a guided, educational connection (no transaction we control)

export type IntegrationGroup =
  | "gifts_registries"
  | "travel_stay"
  | "food_flowers"
  | "invitations_media"
  | "live_music_maps"
  | "logistics_home"
  | "life_resources"
  | "payments_comms";

export interface IntegrationCategory {
  id: string;
  label: string;
  group: IntegrationGroup;
  connection: ConnectionType;
  /** True when an external third-party provider must be registered to activate. */
  needsProvider: boolean;
}

export const INTEGRATION_GROUPS: { id: IntegrationGroup; label: string }[] = [
  { id: "gifts_registries", label: "Gifts & Registries" },
  { id: "travel_stay", label: "Travel & Stay" },
  { id: "food_flowers", label: "Food & Flowers" },
  { id: "invitations_media", label: "Invitations & Media" },
  { id: "live_music_maps", label: "Live, Music & Maps" },
  { id: "logistics_home", label: "Logistics & Home" },
  { id: "life_resources", label: "Life Resources" },
  { id: "payments_comms", label: "Payments & Communication" },
];

const c = (id: string, label: string, group: IntegrationGroup, connection: ConnectionType, needsProvider = true): IntegrationCategory =>
  ({ id, label, group, connection, needsProvider });

// The launch catalog — expandable over time (the list is "including but not
// limited to"). `native` categories are powered by Magical Moments itself
// (still gated on their own seams: e.g. payments via Square).
export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  c("amazon_registry", "Amazon gift registries", "gifts_registries", "affiliate"),
  c("baby_registry", "Baby registries", "gifts_registries", "affiliate"),
  c("gift_cards", "Gift cards", "gifts_registries", "affiliate"),
  c("charity_donations", "Charity donations", "gifts_registries", "affiliate"),

  c("travel_booking", "Travel booking", "travel_stay", "api"),
  c("hotels", "Hotel reservations", "travel_stay", "api"),
  c("flights", "Flight information", "travel_stay", "api"),
  c("car_rentals", "Car rentals", "travel_stay", "affiliate"),

  c("restaurant_reservations", "Restaurant reservations", "food_flowers", "api"),
  c("flower_delivery", "Flower delivery", "food_flowers", "affiliate"),
  c("cake_ordering", "Cake ordering", "food_flowers", "guided"),

  c("invitation_printing", "Invitation printing", "invitations_media", "api"),
  c("photography", "Photography services", "invitations_media", "native", false),
  c("videography", "Video services", "invitations_media", "native", false),

  c("live_streaming", "Live streaming", "live_music_maps", "embed"),
  c("music_playlists", "Music playlists", "live_music_maps", "embed"),
  c("maps_directions", "Maps & directions", "live_music_maps", "embed"),
  c("weather", "Weather", "live_music_maps", "api"),

  c("rentals", "Rental companies", "logistics_home", "native", false),
  c("transportation", "Transportation", "logistics_home", "native", false),
  c("home_services", "Home services", "logistics_home", "native", false),
  c("pet_services", "Pet services", "logistics_home", "native", false),
  c("shipping", "Shipping", "logistics_home", "api"),

  c("mortgage_resources", "Mortgage resources", "life_resources", "guided"),
  c("college_resources", "College resources", "life_resources", "guided"),
  c("funeral_resources", "Funeral resources", "life_resources", "guided"),

  c("payments", "Payment processing", "payments_comms", "native", false),
  c("calendar", "Calendar integration", "payments_comms", "api"),
  c("email", "Email integration", "payments_comms", "native", false),
  c("sms", "SMS notifications", "payments_comms", "api"),
];

export function integrationCategory(id: string): IntegrationCategory | undefined {
  return INTEGRATION_CATEGORIES.find((x) => x.id === id);
}
export function categoriesInGroup(group: IntegrationGroup): IntegrationCategory[] {
  return INTEGRATION_CATEGORIES.filter((x) => x.group === group);
}

// ── Provider registry (provider-agnostic; nothing hardcoded) ────
export interface IntegrationProvider {
  id: string;
  categoryId: string;
  name: string;
  /** True when configured/enabled (keys/partnership present). */
  isAvailable(): boolean;
}

const registry: IntegrationProvider[] = [];

/** Register an approved provider for a category. Called during app setup. */
export function registerIntegrationProvider(p: IntegrationProvider): void {
  if (!registry.some((x) => x.id === p.id)) registry.push(p);
}

/** Available providers for a category (empty when none configured). */
export function providersFor(categoryId: string): IntegrationProvider[] {
  return registry.filter((p) => p.categoryId === categoryId && p.isAvailable());
}

export type IntegrationState = "connected" | "guided" | "coming_soon";

/**
 * How a category presents right now. `connected` when a real provider exists;
 * `guided` for guided/educational categories (no provider needed to help);
 * otherwise `coming_soon` — never a fabricated live integration.
 */
export function integrationState(categoryId: string): IntegrationState {
  if (providersFor(categoryId).length > 0) return "connected";
  const cat = integrationCategory(categoryId);
  if (cat && (cat.connection === "guided" || !cat.needsProvider)) return "guided";
  return "coming_soon";
}

// ── "What do I need next?" — anticipation per occasion ──────────
// Ordered category ids most relevant to each occasion. Powers the design
// philosophy: every page should answer "What do I need next?" before it's asked.
const OCCASION_NEEDS: Record<string, string[]> = {
  wedding: ["invitation_printing", "amazon_registry", "hotels", "travel_booking", "flower_delivery", "cake_ordering", "photography", "music_playlists", "transportation", "live_streaming", "maps_directions", "weather"],
  proposal: ["photography", "flower_delivery", "restaurant_reservations", "maps_directions", "videography"],
  baby: ["baby_registry", "photography", "gift_cards", "calendar", "shipping"],
  babyshower: ["baby_registry", "invitation_printing", "cake_ordering", "flower_delivery", "photography"],
  genderreveal: ["invitation_printing", "cake_ordering", "photography", "music_playlists"],
  birthday: ["invitation_printing", "cake_ordering", "gift_cards", "music_playlists", "photography"],
  sweet16: ["invitation_printing", "cake_ordering", "photography", "music_playlists", "transportation"],
  quinceanera: ["invitation_printing", "cake_ordering", "flower_delivery", "photography", "transportation", "music_playlists"],
  graduation: ["invitation_printing", "college_resources", "photography", "gift_cards", "cake_ordering"],
  vacation: ["travel_booking", "hotels", "flights", "car_rentals", "restaurant_reservations", "maps_directions", "weather"],
  newhome: ["mortgage_resources", "home_services", "shipping", "transportation", "pet_services"],
  anniversary: ["restaurant_reservations", "flower_delivery", "travel_booking", "hotels", "photography"],
  memorial: ["funeral_resources", "flower_delivery", "charity_donations", "live_streaming", "photography"],
  retirement: ["invitation_printing", "restaurant_reservations", "travel_booking", "photography", "cake_ordering"],
  reunion: ["invitation_printing", "hotels", "restaurant_reservations", "transportation", "photography", "maps_directions"],
  military: ["invitation_printing", "photography", "live_streaming", "transportation", "charity_donations"],
  sports: ["college_resources", "photography", "videography", "travel_booking", "hotels"],
};

const DEFAULT_NEEDS = ["invitation_printing", "photography", "gift_cards", "calendar", "maps_directions"];

/** Categories relevant to an occasion, in a sensible order. */
export function suggestionsForOccasion(occasionId: string): IntegrationCategory[] {
  const ids = OCCASION_NEEDS[occasionId] ?? DEFAULT_NEEDS;
  return ids.map(integrationCategory).filter((x): x is IntegrationCategory => !!x);
}

/**
 * "What do I need next?" — the next relevant categories the customer hasn't
 * handled yet. `completed` is the set of category ids already taken care of.
 */
export function whatDoINeedNext(occasionId: string, completed: string[] = [], limit = 3): IntegrationCategory[] {
  const done = new Set(completed);
  return suggestionsForOccasion(occasionId).filter((cat) => !done.has(cat.id)).slice(0, Math.max(0, limit));
}

// ── The Magical Moments feeling (brand copy) ────────────────────
export const CUSTOMER_PROMISE = "We've got you.";
export const ECOSYSTEM_FEELING = "Everything I needed was right here.";
export const ECOSYSTEM_VALUES = ["Safe", "Simple", "Beautiful", "Trusted"] as const;
