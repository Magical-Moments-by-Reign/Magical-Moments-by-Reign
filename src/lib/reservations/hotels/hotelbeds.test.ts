import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "crypto";
import { hotelbedsSignature, hotelbedsBase, parseStars, mapAvailability, mapAvailabilityHotel, mapContentDetail, HotelbedsProvider } from "./hotelbeds";
import { searchHotels } from "./index";
import type { HotelProvider, HotelSearchResult } from "./types";

test("X-Signature is sha256(apiKey + secret + unixSeconds)", () => {
  const sig = hotelbedsSignature("KEY123", "SECRET456", 1600000000);
  const expected = createHash("sha256").update("KEY123SECRET4561600000000").digest("hex");
  assert.equal(sig, expected);
  assert.equal(sig.length, 64, "hex sha256");
});

test("environment selects the test vs production host", () => {
  const had = process.env.HOTELBEDS_ENVIRONMENT;
  process.env.HOTELBEDS_ENVIRONMENT = "test";
  assert.equal(hotelbedsBase(), "https://api.test.hotelbeds.com");
  process.env.HOTELBEDS_ENVIRONMENT = "production";
  assert.equal(hotelbedsBase(), "https://api.hotelbeds.com");
  if (had === undefined) delete process.env.HOTELBEDS_ENVIRONMENT; else process.env.HOTELBEDS_ENVIRONMENT = had;
});

test("parseStars pulls the leading number from a category name", () => {
  assert.equal(parseStars("4 STARS"), 4);
  assert.equal(parseStars("5 ESTRELLAS"), 5);
  assert.equal(parseStars(undefined), undefined);
});

test("mapAvailability maps Hotelbeds hotels; total price only, never a fake per-night", () => {
  const payload = {
    hotels: {
      total: 1, currency: "EUR",
      hotels: [{ code: 12345, name: "Hotel Marina", categoryName: "4 STARS", destinationName: "Barcelona", zoneName: "Port", minRate: "412.50", currency: "EUR", latitude: 41.38, longitude: 2.19 }],
    },
  };
  const [h] = mapAvailability(payload);
  assert.equal(h.provider, "hotelbeds");
  assert.equal(h.id, "12345");
  assert.equal(h.name, "Hotel Marina");
  assert.equal(h.starRating, 4);
  assert.deepEqual(h.totalPrice, { amount: 412.5, currency: "EUR" });
  assert.equal(h.pricePerNight, undefined, "minRate is a stay total — never presented as per-night");
  assert.equal(h.city, "Barcelona");
});

test("mapAvailabilityHotel never fabricates when required fields are missing", () => {
  assert.equal(mapAvailabilityHotel({ code: 1 }, "EUR"), null, "no name → dropped, never invented");
});

test("mapContentDetail builds image CDN urls, facilities, description", () => {
  const content = {
    code: 12345, name: { content: "Hotel Marina" }, description: { content: "On the marina." },
    category: { description: { content: "4 STARS" } },
    address: { content: "1 Port Way" }, city: { content: "Barcelona" },
    coordinates: { latitude: 41.38, longitude: 2.19 },
    images: [{ path: "12345/abc.jpg" }, { path: "12345/def.jpg" }],
    facilities: [{ description: { content: "Pool" } }, { description: { content: "Spa" } }],
  };
  const d = mapContentDetail(content);
  assert.ok(d.images[0].startsWith("https://photos.hotelbeds.com/giata/"));
  assert.equal(d.images.length, 2);
  assert.ok(d.amenitiesFull.includes("Pool"));
  assert.equal(d.description, "On the marina.");
  assert.equal(d.starRating, 4);
});

test("Hotelbeds gates on credentials (no creds → not configured, no network)", () => {
  const k = process.env.HOTELBEDS_API_KEY, s = process.env.HOTELBEDS_SECRET;
  delete process.env.HOTELBEDS_API_KEY; delete process.env.HOTELBEDS_SECRET;
  try {
    assert.equal(HotelbedsProvider.isConfigured(), false);
  } finally {
    if (k !== undefined) process.env.HOTELBEDS_API_KEY = k;
    if (s !== undefined) process.env.HOTELBEDS_SECRET = s;
  }
});

test("LIVE is authoritative: a live empty result never falls back to sample", async () => {
  const liveEmpty: HotelProvider = { slug: "hotelbeds", name: "Hotelbeds", attribution: "a", isConfigured: () => true, async search() { return { provider: "Hotelbeds", attribution: "a", sample: false, hotels: [], total: 0 }; }, async details() { return null; } };
  const sampleFull: HotelProvider = { slug: "expedia", name: "Expedia", attribution: "b", isConfigured: () => false, async search() { return { provider: "Expedia", attribution: "b", sample: true, hotels: [{ provider: "expedia", id: "1", name: "Sample", amenities: [] }], total: 1 } as HotelSearchResult; }, async details() { return null; } };
  const r = await searchHotels({ location: "x" }, [liveEmpty, sampleFull]);
  assert.equal(r?.sample, false, "live authoritative");
  assert.equal(r?.hotels.length, 0, "honest 'no hotels found', not sample data");
});

test("sample is used only when no live provider answered", async () => {
  const liveErr: HotelProvider = { slug: "hotelbeds", name: "Hotelbeds", attribution: "a", isConfigured: () => true, async search() { return null; }, async details() { return null; } };
  const sampleFull: HotelProvider = { slug: "expedia", name: "Expedia", attribution: "b", isConfigured: () => false, async search() { return { provider: "Expedia", attribution: "b", sample: true, hotels: [{ provider: "expedia", id: "1", name: "Sample", amenities: [] }], total: 1 } as HotelSearchResult; }, async details() { return null; } };
  const r = await searchHotels({ location: "x" }, [liveErr, sampleFull]);
  assert.equal(r?.sample, true, "live errored → sample fallback keeps the UI working");
});
