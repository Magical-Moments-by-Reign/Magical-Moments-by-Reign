import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JOURNEY_SECTIONS, sectionForType, groupIntoSections, nonEmptySections,
  isPubliclyVisible, familySlugFrom, getJourneySection, type OccasionCard,
} from "./family-website.ts";

function occ(over: Partial<OccasionCard>): OccasionCard {
  return {
    id: "id", slug: "slug", type: "wedding", title: "T", subtitle: null,
    status: "PUBLISHED", visibility: "PUBLIC", eventDate: null, mediaCount: 0,
    ...over,
  };
}

test("there are exactly 12 permanent sections, custom last", () => {
  assert.equal(JOURNEY_SECTIONS.length, 12);
  assert.equal(JOURNEY_SECTIONS[0].id, "wedding");
  assert.equal(JOURNEY_SECTIONS[JOURNEY_SECTIONS.length - 1].id, "custom");
});

test("type→section mapping covers the journey families", () => {
  assert.equal(sectionForType("wedding"), "wedding");
  assert.equal(sectionForType("proposal"), "wedding");
  assert.equal(sectionForType("bridalshower"), "wedding");
  assert.equal(sectionForType("babyshower"), "baby");
  assert.equal(sectionForType("genderreveal"), "baby");
  assert.equal(sectionForType("newhome"), "housing");
  assert.equal(sectionForType("vacation"), "travel");
  assert.equal(sectionForType("memorial"), "celebration-of-life");
  assert.equal(sectionForType("retirement"), "career");
});

test("unknown or missing types fall back to custom — nothing is dropped", () => {
  assert.equal(sectionForType("something-new"), "custom");
  assert.equal(sectionForType(null), "custom");
  assert.equal(sectionForType(undefined), "custom");
});

test("grouping always returns all 12 permanent sections, even when empty", () => {
  const sections = groupIntoSections([], { viewerIsOwner: true });
  assert.equal(sections.length, 12);
  for (const s of sections) assert.equal(s.occasions.length, 0);
});

test("public viewer sees only PUBLIC + PUBLISHED occasions (privacy honored)", () => {
  const occasions = [
    occ({ id: "1", type: "wedding", visibility: "PUBLIC", status: "PUBLISHED" }),
    occ({ id: "2", type: "wedding", visibility: "PRIVATE", status: "PUBLISHED" }),
    occ({ id: "3", type: "wedding", visibility: "PUBLIC", status: "DRAFT" }),
  ];
  const pub = groupIntoSections(occasions, { viewerIsOwner: false });
  const wedding = pub.find((s) => s.id === "wedding")!;
  assert.equal(wedding.occasions.length, 1, "only the public+published one");
  assert.equal(wedding.occasions[0].id, "1");

  const owner = groupIntoSections(occasions, { viewerIsOwner: true });
  assert.equal(owner.find((s) => s.id === "wedding")!.occasions.length, 3, "owner sees all");
});

test("isPubliclyVisible requires PUBLIC and PUBLISHED", () => {
  assert.ok(isPubliclyVisible({ visibility: "PUBLIC", status: "PUBLISHED" }));
  assert.ok(!isPubliclyVisible({ visibility: "UNLISTED", status: "PUBLISHED" }));
  assert.ok(!isPubliclyVisible({ visibility: "PUBLIC", status: "ARCHIVED" }));
});

test("occasions within a section sort newest event date first", () => {
  const occasions = [
    occ({ id: "old", eventDate: "2020-01-01T00:00:00Z" }),
    occ({ id: "new", eventDate: "2026-01-01T00:00:00Z" }),
    occ({ id: "undated", eventDate: null }),
  ];
  const wedding = groupIntoSections(occasions, { viewerIsOwner: true }).find((s) => s.id === "wedding")!;
  assert.deepEqual(wedding.occasions.map((o) => o.id), ["new", "old", "undated"]);
});

test("nonEmptySections filters to sections that have occasions", () => {
  const sections = groupIntoSections([occ({ type: "baby" })], { viewerIsOwner: true });
  const ne = nonEmptySections(sections);
  assert.equal(ne.length, 1);
  assert.equal(ne[0].id, "baby");
});

test("nothing expires: a long-past dated occasion still groups and shows", () => {
  const past = occ({ id: "p", type: "wedding", eventDate: "1999-06-14T00:00:00Z", status: "PUBLISHED", visibility: "PUBLIC" });
  const pub = groupIntoSections([past], { viewerIsOwner: false });
  assert.equal(pub.find((s) => s.id === "wedding")!.occasions.length, 1);
});

test("familySlugFrom derives a clean slug and getJourneySection resolves ids", () => {
  assert.equal(familySlugFrom("The Johnson Family"), "the-johnson-family");
  assert.equal(familySlugFrom(""), "our-family");
  assert.equal(getJourneySection("baby")?.label, "Baby Journey");
  assert.equal(getJourneySection("nope"), undefined);
});
