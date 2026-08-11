import { test } from "node:test";
import assert from "node:assert/strict";
import { mapEvent, inferCategory, buildLocationParams } from "./events";

test("mapEvent maps a Ticketmaster event, picking the widest image", () => {
  const e = mapEvent({
    id: "evt1",
    name: "Example Concert",
    url: "https://ticketmaster.com/evt1",
    dates: { start: { dateTime: "2026-09-01T23:00:00Z" } },
    images: [{ url: "https://tm/small.jpg", width: 200 }, { url: "https://tm/large.jpg", width: 1024 }],
    _embedded: { venues: [{ name: "The Venue", city: { name: "Atlanta" } }] },
    classifications: [{ segment: { name: "Music" } }],
  });
  assert.ok(e);
  assert.equal(e!.name, "Example Concert");
  assert.equal(e!.imageUrl, "https://tm/large.jpg");
  assert.equal(e!.venueName, "The Venue");
  assert.equal(e!.city, "Atlanta");
  assert.equal(e!.category, "concerts");
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
