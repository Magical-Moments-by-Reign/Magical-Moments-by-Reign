// ── Expedia Rapid — sample fixtures (SCHEMA-ACCURATE) ───────────
//
// These objects match the shape of Expedia Rapid v3 responses so the mapper
// (expedia.ts) parses them exactly the way it will parse live data. When
// credentials arrive, only the fetch layer changes — these fixtures are
// dropped and real `/v3/properties/*` JSON flows through the SAME mapper.
//
// This is SAMPLE data. The provider marks results built from it as
// `sample: true`, and the UI shows them as examples — never as bookable
// inventory or real pricing.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Rapid `/v3/properties/content` — keyed by property_id. */
export const MOCK_CONTENT: Record<string, any> = {
  "19425": {
    property_id: "19425",
    name: "The Bayfront Grand",
    address: { line_1: "100 Bay Street", city: "Savannah", state_province_name: "Georgia", postal_code: "31401", country_code: "US" },
    ratings: { property: { rating: "4.5", type: "Star" }, guest: { count: 1287, overall: "9.2", cleanliness: "9.4" } },
    location: { coordinates: { latitude: 32.081, longitude: -81.091 } },
    images: [
      { caption: "Exterior", hero_image: true, links: { "1000px": { href: "https://images.example.com/19425/hero-1000.jpg" } } },
      { caption: "Lobby", hero_image: false, links: { "1000px": { href: "https://images.example.com/19425/lobby-1000.jpg" } } },
      { caption: "Suite", hero_image: false, links: { "1000px": { href: "https://images.example.com/19425/suite-1000.jpg" } } },
    ],
    amenities: { "9": { id: "9", name: "Pool" }, "2820": { id: "2820", name: "Free WiFi" }, "1073744646": { id: "1073744646", name: "Spa" }, "6": { id: "6", name: "Restaurant" } },
    descriptions: { location: "On the historic riverfront, steps from City Market.", amenities: "Rooftop pool, full-service spa, and a farm-to-table restaurant." },
    checkin: { begin_time: "3:00 PM" },
    checkout: { time: "11:00 AM" },
  },
  "20882": {
    property_id: "20882",
    name: "Magnolia Court Inn",
    address: { line_1: "44 Magnolia Ave", city: "Savannah", state_province_name: "Georgia", postal_code: "31405", country_code: "US" },
    ratings: { property: { rating: "3.5", type: "Star" }, guest: { count: 642, overall: "8.6" } },
    location: { coordinates: { latitude: 32.05, longitude: -81.1 } },
    images: [
      { caption: "Courtyard", hero_image: true, links: { "1000px": { href: "https://images.example.com/20882/hero-1000.jpg" } } },
      { caption: "Room", hero_image: false, links: { "1000px": { href: "https://images.example.com/20882/room-1000.jpg" } } },
    ],
    amenities: { "2820": { id: "2820", name: "Free WiFi" }, "51": { id: "51", name: "Free parking" }, "1919": { id: "1919", name: "Breakfast included" } },
    descriptions: { location: "A quiet garden inn in the Victorian District.", amenities: "Complimentary breakfast and free parking." },
    checkin: { begin_time: "4:00 PM" },
    checkout: { time: "11:00 AM" },
  },
  "31007": {
    property_id: "31007",
    name: "Harbor Lights Resort & Spa",
    address: { line_1: "1 Marina Way", city: "Tybee Island", state_province_name: "Georgia", postal_code: "31328", country_code: "US" },
    ratings: { property: { rating: "5.0", type: "Star" }, guest: { count: 2104, overall: "9.5" } },
    location: { coordinates: { latitude: 32.0, longitude: -80.84 } },
    images: [
      { caption: "Oceanfront", hero_image: true, links: { "1000px": { href: "https://images.example.com/31007/hero-1000.jpg" } } },
      { caption: "Pool", hero_image: false, links: { "1000px": { href: "https://images.example.com/31007/pool-1000.jpg" } } },
      { caption: "Spa", hero_image: false, links: { "1000px": { href: "https://images.example.com/31007/spa-1000.jpg" } } },
    ],
    amenities: { "9": { id: "9", name: "Pool" }, "1073744646": { id: "1073744646", name: "Spa" }, "6": { id: "6", name: "Restaurant" }, "3": { id: "3", name: "Beach access" }, "2820": { id: "2820", name: "Free WiFi" } },
    descriptions: { location: "Oceanfront on Tybee Island, 20 minutes from downtown.", amenities: "Private beach, oceanview spa, and three dining venues." },
    checkin: { begin_time: "3:00 PM" },
    checkout: { time: "12:00 PM" },
  },
};

/** Rapid `/v3/properties/availability` — an array of priced properties. */
export const MOCK_AVAILABILITY: any[] = [
  {
    property_id: "19425",
    rooms: [
      { id: "224757", room_name: "Deluxe King", rates: [{ id: "339435", refundable: true, occupancy_pricing: { "2": {
        nightly: [[{ value: "204.00", currency: "USD", type: "base" }]],
        totals: { inclusive: { billable_currency: { value: "672.32", currency: "USD" } } },
      } } }] },
    ],
  },
  {
    property_id: "20882",
    rooms: [
      { id: "118820", room_name: "Garden Queen", rates: [{ id: "551002", refundable: false, occupancy_pricing: { "2": {
        nightly: [[{ value: "129.00", currency: "USD", type: "base" }]],
        totals: { inclusive: { billable_currency: { value: "421.90", currency: "USD" } } },
      } } }] },
    ],
  },
  {
    property_id: "31007",
    rooms: [
      { id: "990125", room_name: "Oceanfront Suite", rates: [{ id: "778451", refundable: true, occupancy_pricing: { "2": {
        nightly: [[{ value: "389.00", currency: "USD", type: "base" }]],
        totals: { inclusive: { billable_currency: { value: "1284.00", currency: "USD" } } },
      } } }] },
    ],
  },
];
