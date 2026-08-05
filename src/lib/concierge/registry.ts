// ── Concierge Platform — service registry ───────────────────────
// The single catalog of every concierge service. Adding a service = adding an
// entry here (+ a provider module + a page when it's connected). Status is
// resolved at runtime so a service flips from "coming_soon" to "test"/"live"
// the moment its provider env is configured — no code change to the catalog.

import { duffelConfigured, duffelTestMode } from "@/lib/duffel";
import type { ConciergeService, ServiceStatus } from "./types";

export const SERVICES: ConciergeService[] = [
  // Travel
  { id: "flights", label: "Flights", emoji: "✈️", group: "travel", capability: "search_book", provider: "Duffel", href: "/dashboard/concierge/flights", blurb: "Compare flights, build itineraries, and (test mode) reserve." },
  { id: "hotels", label: "Hotels", emoji: "🏨", group: "travel", capability: "search_book", blurb: "Find and compare stays for every trip." },
  { id: "cars", label: "Rental Cars", emoji: "🚗", group: "travel", capability: "search_book", blurb: "Rental cars at your destination." },
  { id: "cruises", label: "Cruises", emoji: "🚢", group: "travel", capability: "request", blurb: "Plan and compare cruise sailings." },
  { id: "vacation-rentals", label: "Vacation Rentals", emoji: "🏠", group: "travel", capability: "search_book", blurb: "Homes and villas for a getaway." },
  { id: "transportation", label: "Limos & Transport", emoji: "🚘", group: "travel", capability: "request", blurb: "Car service, limos, and airport transfers." },
  // Celebrations / events
  { id: "event-tickets", label: "Event Tickets", emoji: "🎟️", group: "celebrations", capability: "search_book", blurb: "Concerts, sports, and shows." },
  { id: "entertainment", label: "Entertainment & Excursions", emoji: "🎭", group: "celebrations", capability: "request", blurb: "Experiences, tours, and excursions." },
  { id: "photographers", label: "Photographers", emoji: "📸", group: "keepsakes", capability: "request", blurb: "Capture the moment beautifully." },
  { id: "wedding-vendors", label: "Wedding Vendors", emoji: "💍", group: "celebrations", capability: "request", blurb: "Planners, florists, venues, and more." },
  // Food
  { id: "dining", label: "Restaurant Reservations", emoji: "🍽️", group: "food", capability: "search_book", blurb: "Reserve a table for any occasion." },
  { id: "cakes-catering", label: "Cakes & Catering", emoji: "🎂", group: "food", capability: "request", blurb: "Cakes, catering, and dessert tables." },
  // Beauty / gifts
  { id: "hair-makeup", label: "Hair & Makeup", emoji: "💄", group: "beauty", capability: "request", blurb: "Glam for the big day." },
  { id: "flowers-gifts", label: "Flowers & Gifts", emoji: "💐", group: "keepsakes", capability: "request", blurb: "Send flowers and thoughtful gifts." },
];

export function getService(id: string): ConciergeService | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** Runtime status: flips a service to test/live once its provider is configured. */
export function resolveStatus(service: ConciergeService): ServiceStatus {
  if (service.id === "flights") {
    if (!duffelConfigured()) return "coming_soon";
    return duffelTestMode() ? "test" : "live";
  }
  // Future providers register their own checks here as they're connected.
  return "coming_soon";
}

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  live: "Live",
  test: "Test mode",
  coming_soon: "Coming Soon",
};
