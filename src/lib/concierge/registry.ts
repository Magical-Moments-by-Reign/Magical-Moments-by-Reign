// ── Concierge Platform — service registry ───────────────────────
// The Concierge is the operating system for Magical Moments: every service is a
// registered category, and every category resolves its status at runtime. Adding
// a service = an entry here. Connecting a provider = one entry in PROVIDERS (+ an
// adapter + a page). Turning a service on/off = the CONCIERGE_DISABLED env var —
// none of it changes the application architecture.

import { duffelConfigured, duffelTestMode } from "@/lib/duffel";
import type { ConciergeService, ServiceStatus } from "./types";

export const SERVICES: ConciergeService[] = [
  // ✈️ Travel
  { id: "flights", label: "Flights", emoji: "✈️", group: "travel", capability: "search_book", provider: "Duffel", href: "/dashboard/concierge/flights", blurb: "Compare flights, build itineraries, and (test mode) reserve." },
  { id: "hotels", label: "Hotels & Resorts", emoji: "🏨", group: "travel", capability: "search_book", blurb: "Find and compare stays and resorts." },
  { id: "cars", label: "Rental Cars", emoji: "🚗", group: "travel", capability: "search_book", blurb: "Rental cars at your destination." },
  { id: "transportation", label: "Limousine & Transportation", emoji: "🚘", group: "travel", capability: "request", blurb: "Car service, limos, and airport transfers." },
  { id: "cruises", label: "Cruises", emoji: "🚢", group: "travel", capability: "request", blurb: "Plan and compare cruise sailings." },
  { id: "vacation-packages", label: "Vacation Packages", emoji: "🏖️", group: "travel", capability: "request", blurb: "Flights, stays, and extras bundled." },
  { id: "vacation-rentals", label: "Vacation Rentals", emoji: "🏠", group: "travel", capability: "search_book", blurb: "Homes and villas for a getaway." },
  { id: "travel-insurance", label: "Travel Insurance", emoji: "🛡️", group: "travel", capability: "request", blurb: "Protect your trip and travelers." },

  // 🍽️ Food
  { id: "dining", label: "Restaurant Reservations", emoji: "🍽️", group: "food", capability: "search_book", blurb: "Reserve a table for any occasion." },
  { id: "cakes-desserts", label: "Cakes & Desserts", emoji: "🎂", group: "food", capability: "request", blurb: "Custom cakes and dessert tables." },
  { id: "catering", label: "Catering", emoji: "🍽️", group: "food", capability: "request", blurb: "Full-service catering for any event." },

  // 🎉 Celebrations & events
  { id: "event-tickets", label: "Concerts & Event Tickets", emoji: "🎟️", group: "celebrations", capability: "search_book", blurb: "Concerts, sports, and shows." },
  { id: "entertainment", label: "Entertainment", emoji: "🎭", group: "celebrations", capability: "request", blurb: "Performers, hosts, and experiences." },
  { id: "dj-music", label: "DJs & Live Music", emoji: "🎵", group: "celebrations", capability: "request", blurb: "DJs, bands, and live musicians." },
  { id: "wedding-vendors", label: "Wedding Vendors", emoji: "💍", group: "celebrations", capability: "request", blurb: "Planners, venues, and more." },
  { id: "party-rentals", label: "Party Rentals", emoji: "🎈", group: "celebrations", capability: "request", blurb: "Tents, tables, chairs, and more." },
  { id: "decorations", label: "Decorations", emoji: "🎪", group: "celebrations", capability: "request", blurb: "Styling, balloons, and installations." },

  // 📸 Keepsakes & gifts
  { id: "photography", label: "Photography", emoji: "📸", group: "keepsakes", capability: "request", blurb: "Capture the moment beautifully." },
  { id: "videography", label: "Videography", emoji: "🎥", group: "keepsakes", capability: "request", blurb: "Cinematic films of your moments." },
  { id: "flowers", label: "Flowers", emoji: "💐", group: "keepsakes", capability: "request", blurb: "Bouquets and floral design." },
  { id: "gift-delivery", label: "Gift Delivery", emoji: "🎁", group: "keepsakes", capability: "request", blurb: "Send thoughtful gifts anywhere." },

  // 💄 Beauty
  { id: "hair-makeup", label: "Hair & Makeup", emoji: "💄", group: "beauty", capability: "request", blurb: "Glam for the big day." },

  // 👨‍👩‍👧 Family & milestones
  { id: "baby-services", label: "Baby Services", emoji: "🍼", group: "family", capability: "request", blurb: "Support for growing families." },
  { id: "graduation-services", label: "Graduation Services", emoji: "🎓", group: "family", capability: "request", blurb: "Celebrate the milestone." },
  { id: "pet-services", label: "Pet Services", emoji: "🐾", group: "family", capability: "request", blurb: "Care for the whole family." },

  // 🏡 Home
  { id: "home-services", label: "Home Services", emoji: "🏡", group: "home", capability: "request", blurb: "Trusted help around the home." },

  // 🛎️ Lifestyle
  { id: "personal-assistants", label: "Personal Assistants", emoji: "📋", group: "lifestyle", capability: "request", blurb: "A hand with anything on your list." },
  { id: "tax-financial", label: "Tax & Financial Appointments", emoji: "🧾", group: "lifestyle", capability: "request", blurb: "Book time with professionals." },
  { id: "wellness", label: "Wellness & Health Services", emoji: "🏥", group: "lifestyle", capability: "request", blurb: "Spa, fitness, and wellbeing." },
  { id: "luxury-shopping", label: "Luxury Shopping", emoji: "🛍️", group: "lifestyle", capability: "request", blurb: "Personal shopping and sourcing." },
  { id: "errands", label: "Concierge Errands", emoji: "📦", group: "lifestyle", capability: "request", blurb: "Everyday errands, handled." },
];

export function getService(id: string): ConciergeService | undefined {
  return SERVICES.find((s) => s.id === id);
}

// ── Provider bindings ───────────────────────────────────────────
// A service is "Available"/"Test Mode" once its provider is configured. Adding a
// new connected provider is ONE entry here (+ its adapter + page) — no other
// architecture changes. Everything without a binding stays "Coming Soon".
interface ProviderBinding { brand: string; isConfigured: () => boolean; isTestMode: () => boolean }
const PROVIDERS: Record<string, ProviderBinding> = {
  flights: { brand: "Duffel", isConfigured: duffelConfigured, isTestMode: duffelTestMode },
};

/** Services turned off by the owner/admin via env, e.g.
 *  CONCIERGE_DISABLED="cruises,pet-services". No deploy/code change needed. */
function disabledSet(): Set<string> {
  return new Set((process.env.CONCIERGE_DISABLED || "").split(",").map((s) => s.trim()).filter(Boolean));
}

/** Runtime status for a service — the Concierge always knows the true state. */
export function resolveStatus(service: ConciergeService): ServiceStatus {
  if (disabledSet().has(service.id)) return "disabled";
  const p = PROVIDERS[service.id];
  if (p && p.isConfigured()) return p.isTestMode() ? "test" : "live";
  return "coming_soon";
}

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  live: "Available",
  test: "Test Mode",
  coming_soon: "Coming Soon",
  disabled: "Disabled",
};
