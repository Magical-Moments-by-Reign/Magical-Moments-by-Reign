import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSummary, mapDetails, applyHotelFilters, sortHotels, ExpediaRapidProvider } from "./expedia";
import { MOCK_AVAILABILITY, MOCK_CONTENT } from "./expedia-mock";
import { searchHotels, hotelProviderForId, hotelDiscoveryConfigured } from "./index";
import { formatPartnerTransactionId } from "./partner-tx";
import type { HotelSummary } from "./types";

test("mapSummary parses Rapid content + availability into our shape", () => {
  const s = mapSummary("19425", MOCK_CONTENT["19425"], MOCK_AVAILABILITY[0])!;
  assert.equal(s.provider, "expedia");
  assert.equal(s.id, "19425");
  assert.equal(s.name, "The Bayfront Grand");
  assert.equal(s.starRating, 4.5);
  assert.equal(s.guestRating, 9.2);
  assert.equal(s.reviewCount, 1287);
  assert.deepEqual(s.pricePerNight, { amount: 204, currency: "USD" });
  assert.deepEqual(s.totalPrice, { amount: 672.32, currency: "USD" });
  assert.ok(s.amenities.includes("Pool"));
  assert.equal(s.city, "Savannah");
});

test("mapSummary never fabricates pricing when availability is absent", () => {
  const s = mapSummary("19425", MOCK_CONTENT["19425"], undefined)!;
  assert.equal(s.pricePerNight, undefined, "no availability → no invented price");
  assert.equal(s.totalPrice, undefined);
  assert.equal(s.name, "The Bayfront Grand", "content still maps");
});

test("mapDetails carries images, description, rooms", () => {
  const d = mapDetails("31007", MOCK_CONTENT["31007"], MOCK_AVAILABILITY[2])!;
  assert.ok(d.images.length >= 2);
  assert.ok(d.amenitiesFull.includes("Spa"));
  assert.equal(d.rooms[0].name, "Oceanfront Suite");
  assert.deepEqual(d.rooms[0].price, { amount: 1284, currency: "USD" });
  assert.equal(d.checkInTime, "3:00 PM");
});

test("filters narrow by stars, price, amenities", () => {
  const all = MOCK_AVAILABILITY.map((a) => mapSummary(a.property_id, MOCK_CONTENT[a.property_id], a)!) as HotelSummary[];
  assert.equal(applyHotelFilters(all, { location: "x", starRatings: [5] }).length, 1);
  assert.equal(applyHotelFilters(all, { location: "x", maxPrice: 150 }).length, 1); // only Magnolia @129
  assert.ok(applyHotelFilters(all, { location: "x", amenities: ["Spa"] }).every((h) => h.amenities.includes("Spa")));
});

test("sort orders by price and rating", () => {
  const all = MOCK_AVAILABILITY.map((a) => mapSummary(a.property_id, MOCK_CONTENT[a.property_id], a)!) as HotelSummary[];
  const low = sortHotels(all, "price_low");
  assert.equal(low[0].pricePerNight?.amount, 129);
  const byStars = sortHotels(all, "stars");
  assert.equal(byStars[0].starRating, 5);
});

test("provider returns SAMPLE results (sample:true) before credentials arrive", async () => {
  const g = process.env.EXPEDIA_RAPID_API_KEY;
  delete process.env.EXPEDIA_RAPID_API_KEY;
  try {
    assert.equal(ExpediaRapidProvider.isConfigured(), false);
    const r = await searchHotels({ location: "Savannah" });
    assert.ok(r);
    assert.equal(r!.sample, true, "unconfigured → sample data, clearly flagged");
    assert.ok(r!.hotels.length > 0);
    assert.equal(hotelDiscoveryConfigured(), false);
  } finally {
    if (g !== undefined) process.env.EXPEDIA_RAPID_API_KEY = g;
  }
});

test("hotel id stays bound to its provider (Expedia)", () => {
  assert.equal(hotelProviderForId("expedia")?.slug, "expedia");
  assert.equal(hotelProviderForId(undefined)?.slug, "expedia", "no hint → primary");
});

test("Partner-Transaction-ID matches MM-{USER}-{SERVICE}-{YYYYMMDD}-{RANDOM}", () => {
  const id = formatPartnerTransactionId("48392", "HOTEL", new Date(Date.UTC(2026, 7, 7)), "7Q9X2");
  assert.equal(id, "MM-48392-HOTEL-20260807-7Q9X2");
  // non-alphanumeric user ids are sanitized so the id stays well-formed
  const id2 = formatPartnerTransactionId("acct_ab-12", "PACKAGE", new Date(Date.UTC(2026, 0, 1)), "K91BD");
  assert.equal(id2, "MM-acctab12-PACKAGE-20260101-K91BD");
});
