import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTicketmasterQuery, mapEvent, inferCategory, normalizeTicketmasterLocation, TicketmasterProvider } from "./events";
import { mapEvent, inferCategory, buildLocationParams } from "./events";

test("mapEvent maps a Ticketmaster event, picking the widest image", () => {
  const e = mapEvent({
    id: "evt1",
    name: "Example Concert",
    url: "https://ticketmaster.com/evt1",
    dates: { start: { dateTime: "2026-09-01T23:00:00Z", localDate: "2026-09-01", localTime: "19:00:00" } },
    distance: 8.4,
    images: [{ url: "https://tm/small.jpg", width: 200 }, { url: "https://tm/large.jpg", width: 1024 }],
    _embedded: { venues: [{ name: "The Venue", city: { name: "Atlanta" }, state: { stateCode: "GA" } }] },
    classifications: [{ segment: { name: "Music" } }],
  });
  assert.ok(e);
  assert.equal(e!.name, "Example Concert");
  assert.equal(e!.imageUrl, "https://tm/large.jpg");
  assert.equal(e!.venueName, "The Venue");
  assert.equal(e!.city, "Atlanta");
  assert.equal(e!.state, "GA");
  assert.equal(e!.localDate, "2026-09-01");
  assert.equal(e!.localTime, "19:00:00");
  assert.equal(e!.distanceMiles, 8.4);
  assert.equal(e!.category, "concerts");
});

test("location normalization supports ZIP, city/state, address, and coordinates", () => {
  assert.deepEqual(normalizeTicketmasterLocation("30032"), { kind: "postalCode", postalCode: "30032" });
  assert.deepEqual(normalizeTicketmasterLocation("Atlanta, GA"), { kind: "city", city: "Atlanta", stateCode: "GA" });
  assert.deepEqual(normalizeTicketmasterLocation("123 Main St, Atlanta, GA"), { kind: "city", city: "Atlanta", stateCode: "GA" });
  assert.deepEqual(normalizeTicketmasterLocation("Atlanta"), { kind: "city", city: "Atlanta" });
  assert.deepEqual(normalizeTicketmasterLocation("33.749,-84.388"), { kind: "coordinates", latlong: "33.749,-84.388" });
  assert.deepEqual(normalizeTicketmasterLocation("???"), { kind: "invalid" });
});

test("30032 uses Ticketmaster postalCode rather than an event keyword", () => {
  const query = buildTicketmasterQuery({ location: "30032", radiusMiles: 25 });
  assert.ok(query);
  assert.equal(query.get("postalCode"), "30032");
  assert.equal(query.get("keyword"), null);
  assert.equal(query.get("radius"), null);
});

test("category filters use legitimate Ticketmaster classifications", () => {
  assert.equal(buildTicketmasterQuery({ location: "Atlanta, GA", category: "concerts" })?.get("segmentName"), "Music");
  assert.equal(buildTicketmasterQuery({ location: "Atlanta, GA", category: "comedy" })?.get("classificationName"), "Comedy");
  assert.equal(buildTicketmasterQuery({ location: "Atlanta, GA", category: "festivals" })?.get("keyword"), "festival");
});

test("provider calls the Discovery events endpoint with apikey and maps returned events", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.TICKETMASTER_API_KEY;
  let calledUrl = "";
  process.env.TICKETMASTER_API_KEY = "test-consumer-key";
  global.fetch = async (input) => {
    calledUrl = String(input);
    return new Response(JSON.stringify({ _embedded: { events: [{ id: "real-shape-1", name: "Mapped Event", url: "https://ticketmaster.com/event/real-shape-1" }] } }), {
      status: 200,
      headers: { "content-type": "application/json;charset=utf-8" },
    });
  };
  try {
    const events = await TicketmasterProvider.search({ location: "30032" });
    const url = new URL(calledUrl);
    assert.equal(`${url.origin}${url.pathname}`, "https://app.ticketmaster.com/discovery/v2/events.json");
    assert.equal(url.searchParams.get("postalCode"), "30032");
    assert.equal(url.searchParams.get("apikey"), "test-consumer-key");
    assert.equal(events?.[0]?.id, "real-shape-1");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TICKETMASTER_API_KEY;
    else process.env.TICKETMASTER_API_KEY = originalKey;
  }
});

test("mapEvent rejects an event with no id, name, or url", () => {
  assert.equal(mapEvent({ name: "No id or url" }), null);
});

test("inferCategory falls back to other for an unmapped segment", () => {
  assert.equal(inferCategory([{ segment: { name: "Miscellaneous" } }]), "other");
  assert.equal(inferCategory(undefined), "other");
});

test("inferCategory maps the Family segment and Arts & Theatre/Comedy genre", () => {
  assert.equal(inferCategory([{ segment: { name: "Family" } }]), "family");
  assert.equal(inferCategory([{ segment: { name: "Arts & Theatre" }, genre: { name: "Comedy" } }]), "comedy");
  assert.equal(inferCategory([{ segment: { name: "Arts & Theatre" }, genre: { name: "Theatre" } }]), "theater");
});

test("mapEvent captures the venue's state code when present", () => {
  const e = mapEvent({
    id: "evt2",
    name: "Example Show",
    url: "https://ticketmaster.com/evt2",
    _embedded: { venues: [{ name: "The Venue", city: { name: "Atlanta" }, state: { stateCode: "GA" } }] },
  });
  assert.equal(e!.state, "GA");
});

test("buildLocationParams: a 5-digit ZIP becomes postalCode + countryCode=US", () => {
  assert.deepEqual(buildLocationParams("30032"), { postalCode: "30032", city: null, stateCode: null, countryCode: "US" });
});

test("buildLocationParams: 'City, ST' becomes city + a recognized stateCode", () => {
  assert.deepEqual(buildLocationParams("Atlanta, GA"), { postalCode: null, city: "Atlanta", stateCode: "GA", countryCode: "US" });
  assert.deepEqual(buildLocationParams("Birmingham AL"), { postalCode: null, city: "Birmingham", stateCode: "AL", countryCode: "US" });
});

test("buildLocationParams: a plain city with no recognizable state falls back to a city search", () => {
  assert.deepEqual(buildLocationParams("Atlanta"), { postalCode: null, city: "Atlanta", stateCode: null, countryCode: null });
  // "St. Louis" ends in a word that isn't a real state code, so it stays a plain city search.
  assert.deepEqual(buildLocationParams("St. Louis"), { postalCode: null, city: "St. Louis", stateCode: null, countryCode: null });
});
