import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPERIENCES, OCCASIONS, getExperience } from "./membership-builder.ts";

test("catalog has the 12 top-level Journeys with unique ids, labels, icons", () => {
  assert.equal(EXPERIENCES.length, 12);
  for (const e of EXPERIENCES) {
    assert.ok(e.id.length > 0 && e.label.length > 0 && e.icon.length > 0);
    assert.ok(Array.isArray(e.milestones));
  }
  assert.equal(new Set(EXPERIENCES.map((e) => e.id)).size, EXPERIENCES.length);
  assert.deepEqual(
    EXPERIENCES.map((e) => e.id),
    ["relationship", "baby", "birthday", "graduation", "home", "travel", "military", "sports", "family", "career", "celebration-of-life", "custom"],
  );
});

test("Journeys carry their canonical sub-occasions", () => {
  const rel = getExperience("relationship");
  assert.deepEqual(rel?.milestones.map((x) => x.label),
    ["Dating", "First Date", "Proposal", "Engagement", "Bridal Shower", "Bachelor/Bachelorette", "Wedding", "Honeymoon", "Anniversary", "Vow Renewal"]);

  const baby = getExperience("baby");
  assert.ok(baby?.milestones.some((x) => x.label === "Gender Reveal"));
  assert.ok(baby?.milestones.some((x) => x.label === "First Birthday"));

  const grad = getExperience("graduation");
  assert.ok(grad?.milestones.some((x) => x.label === "Prom"));
  assert.ok(grad?.milestones.some((x) => x.label === "Graduation"));

  const sports = getExperience("sports");
  assert.ok((sports?.milestones.length ?? 0) >= 11);
});

test("Custom Journey has no sub-occasions", () => {
  assert.deepEqual(getExperience("custom")?.milestones, []);
});

test("milestone ids are unique within each Journey", () => {
  for (const e of EXPERIENCES) {
    assert.equal(new Set(e.milestones.map((x) => x.id)).size, e.milestones.length, `${e.id} has duplicate milestone ids`);
  }
});

test("OCCASIONS mirrors the top-level Journeys (reservable units)", () => {
  assert.equal(OCCASIONS.length, EXPERIENCES.length);
  assert.equal(new Set(OCCASIONS.map((o) => o.id)).size, OCCASIONS.length);
  assert.deepEqual(OCCASIONS.map((o) => o.id), EXPERIENCES.map((e) => e.id));
});

test("getExperience resolves and rejects unknowns", () => {
  assert.equal(getExperience("relationship")?.label, "Relationship Journey");
  assert.equal(getExperience("nope"), undefined);
});
