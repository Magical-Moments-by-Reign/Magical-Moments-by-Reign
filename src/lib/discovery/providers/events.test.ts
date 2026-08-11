import { test } from "node:test";
import assert from "node:assert/strict";
import { mapEvent, inferCategory } from "./events";

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
