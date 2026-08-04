import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPERIENCES, OCCASIONS, getExperience } from "./membership-builder.ts";

test("catalog has 15 top-level Life Experiences with unique ids, labels, icons", () => {
  assert.equal(EXPERIENCES.length, 15);
  for (const e of EXPERIENCES) {
    assert.ok(e.id.length > 0 && e.label.length > 0 && e.icon.length > 0);
    assert.ok(Array.isArray(e.milestones));
  }
  assert.equal(new Set(EXPERIENCES.map((e) => e.id)).size, EXPERIENCES.length);
});

test("the specified chapters carry their milestones", () => {
  const wedding = getExperience("wedding");
  assert.deepEqual(wedding?.milestones.map((x) => x.label),
    ["Proposal", "Engagement", "Bridal Shower", "Wedding Day", "Honeymoon", "Vow Renewal"]);

  const baby = getExperience("baby");
  assert.deepEqual(baby?.milestones.map((x) => x.label),
    ["Pregnancy", "Gender Reveal", "Baby Shower", "Birth", "First Birthday"]);

  const grad = getExperience("graduation");
  assert.deepEqual(grad?.milestones.map((x) => x.label),
    ["Senior Year", "Prom", "Graduation", "College Move-In"]);

  const birthday = getExperience("birthday");
  assert.ok((birthday?.milestones.length ?? 0) >= 6);
  assert.ok(birthday?.milestones.some((x) => x.label === "Sweet 16"));
  assert.ok(birthday?.milestones.some((x) => x.label === "Quinceañera"));
});

test("milestone ids are unique within each chapter", () => {
  for (const e of EXPERIENCES) {
    assert.equal(new Set(e.milestones.map((x) => x.id)).size, e.milestones.length, `${e.id} has duplicate milestone ids`);
  }
});

test("OCCASIONS mirrors the top-level experiences (reservable units)", () => {
  assert.equal(OCCASIONS.length, EXPERIENCES.length);
  assert.equal(new Set(OCCASIONS.map((o) => o.id)).size, OCCASIONS.length);
  assert.deepEqual(OCCASIONS.map((o) => o.id), EXPERIENCES.map((e) => e.id));
});

test("getExperience resolves and rejects unknowns", () => {
  assert.equal(getExperience("wedding")?.label, "Wedding Journey");
  assert.equal(getExperience("nope"), undefined);
});
