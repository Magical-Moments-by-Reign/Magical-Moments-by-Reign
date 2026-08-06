import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JOURNEY_SECTIONS, sectionForType, groupIntoJourneys, publicJourneys,
  occasionAccess, journeyListedPublicly, occasionListedPublicly,
  parseJourneySettings, normalizeVisibility, familySlugFrom, getJourneySection,
  type OccasionCard, type Visibility,
} from "./family-website.ts";

function occ(over: Partial<OccasionCard>): OccasionCard {
  return {
    id: "id", slug: "slug", type: "wedding", title: "T", subtitle: null,
    status: "PUBLISHED", visibility: "PUBLIC", eventDate: null,
    updatedAt: "2026-01-01T00:00:00Z", mediaCount: 0, coverImage: null,
    ...over,
  };
}
const V = (v: string): Visibility => normalizeVisibility(v);

// ── taxonomy ─────────────────────────────────────────────────────
test("12 permanent sections; custom last; each has an icon", () => {
  assert.equal(JOURNEY_SECTIONS.length, 12);
  assert.equal(JOURNEY_SECTIONS[0].id, "wedding");
  assert.equal(JOURNEY_SECTIONS.at(-1)!.id, "custom");
  for (const s of JOURNEY_SECTIONS) assert.ok(s.icon, `${s.id} has an icon`);
});

test("type→section mapping + custom fallback", () => {
  assert.equal(sectionForType("proposal"), "wedding");
  assert.equal(sectionForType("genderreveal"), "baby");
  assert.equal(sectionForType("memorial"), "celebration-of-life");
  assert.equal(sectionForType("mystery-type"), "custom");
  assert.equal(sectionForType(null), "custom");
});

// ── three-level privacy: the security boundary ───────────────────
test("owner always sees their occasion regardless of visibility/status", () => {
  assert.equal(occasionAccess({ familyVisibility: "PRIVATE", journeyVisibility: "PRIVATE", occasionVisibility: "PRIVATE", occasionStatus: "DRAFT", viewerIsOwner: true }), "allow");
});

test("private family hides everything from the public", () => {
  assert.equal(occasionAccess({ familyVisibility: "PRIVATE", journeyVisibility: "PUBLIC", occasionVisibility: "PUBLIC", occasionStatus: "PUBLISHED", viewerIsOwner: false }), "hidden");
});

test("private journey hides its occasions from the public", () => {
  assert.equal(occasionAccess({ familyVisibility: "PUBLIC", journeyVisibility: "PRIVATE", occasionVisibility: "PUBLIC", occasionStatus: "PUBLISHED", viewerIsOwner: false }), "hidden");
});

test("draft occasions never leak publicly", () => {
  assert.equal(occasionAccess({ familyVisibility: "PUBLIC", journeyVisibility: "PUBLIC", occasionVisibility: "PUBLIC", occasionStatus: "DRAFT", viewerIsOwner: false }), "hidden");
});

test("a PUBLIC occasion inside an UNLISTED (hidden) journey is still reachable by direct link", () => {
  // The owner's scenario: Baby Journey hidden from listing, one page public.
  assert.equal(occasionAccess({ familyVisibility: "PUBLIC", journeyVisibility: "UNLISTED", occasionVisibility: "PUBLIC", occasionStatus: "PUBLISHED", viewerIsOwner: false }), "allow");
  // ...but that journey is NOT listed on the public site.
  assert.equal(journeyListedPublicly(V("PUBLIC"), V("UNLISTED")), false);
});

test("private occasion is hidden even in a public journey", () => {
  assert.equal(occasionAccess({ familyVisibility: "PUBLIC", journeyVisibility: "PUBLIC", occasionVisibility: "PRIVATE", occasionStatus: "PUBLISHED", viewerIsOwner: false }), "hidden");
});

test("journey listing: only PUBLIC journeys under a non-private family are listed", () => {
  assert.equal(journeyListedPublicly(V("PUBLIC"), V("PUBLIC")), true);
  assert.equal(journeyListedPublicly(V("UNLISTED"), V("PUBLIC")), true); // family reachable by link
  assert.equal(journeyListedPublicly(V("PRIVATE"), V("PUBLIC")), false);
  assert.equal(journeyListedPublicly(V("PUBLIC"), V("PRIVATE")), false);
});

test("occasionListedPublicly requires PUBLIC + PUBLISHED", () => {
  assert.ok(occasionListedPublicly({ visibility: "PUBLIC", status: "PUBLISHED" }));
  assert.ok(!occasionListedPublicly({ visibility: "UNLISTED", status: "PUBLISHED" }));
  assert.ok(!occasionListedPublicly({ visibility: "PUBLIC", status: "ARCHIVED" }));
});

// ── rich grouping (#4) ───────────────────────────────────────────
test("grouping returns all 12 journeys with rich counts", () => {
  const occasions = [
    occ({ id: "1", type: "wedding", status: "PUBLISHED", updatedAt: "2026-05-01T00:00:00Z", coverImage: "/a.jpg" }),
    occ({ id: "2", type: "wedding", status: "DRAFT", updatedAt: "2026-06-01T00:00:00Z" }),
    occ({ id: "3", type: "baby", status: "PUBLISHED" }),
  ];
  const cards = groupIntoJourneys(occasions, { viewerIsOwner: true, familyVisibility: "PUBLIC" });
  assert.equal(cards.length, 12);
  const wedding = cards.find((c) => c.id === "wedding")!;
  assert.equal(wedding.occasionCount, 2);
  assert.equal(wedding.publishedCount, 1);
  assert.equal(wedding.draftCount, 1);
  assert.equal(wedding.mostRecentActivity, "2026-06-01T00:00:00Z");
  assert.equal(wedding.coverImage, "/a.jpg");
});

test("public grouping hides draft counts and private occasions", () => {
  const occasions = [
    occ({ id: "1", type: "wedding", status: "PUBLISHED", visibility: "PUBLIC" }),
    occ({ id: "2", type: "wedding", status: "DRAFT", visibility: "PUBLIC" }),
    occ({ id: "3", type: "wedding", status: "PUBLISHED", visibility: "PRIVATE" }),
  ];
  const cards = groupIntoJourneys(occasions, { viewerIsOwner: false, familyVisibility: "PUBLIC" });
  const wedding = cards.find((c) => c.id === "wedding")!;
  assert.equal(wedding.occasionCount, 1, "only the public+published occasion");
  assert.equal(wedding.draftCount, 0, "public never sees draft counts");
});

test("journey-level visibility from settings controls public listing", () => {
  const occasions = [occ({ id: "1", type: "baby", status: "PUBLISHED", visibility: "PUBLIC" })];
  const settings = parseJourneySettings(JSON.stringify({ baby: { visibility: "UNLISTED" } }));
  const cards = groupIntoJourneys(occasions, { viewerIsOwner: false, familyVisibility: "PUBLIC", journeySettings: settings });
  const baby = cards.find((c) => c.id === "baby")!;
  assert.equal(baby.journeyVisibility, "UNLISTED");
  assert.equal(baby.listedPublicly, false, "unlisted journey is not on the public site");
  assert.equal(publicJourneys(cards).find((c) => c.id === "baby"), undefined);
});

test("publicJourneys returns only listed + non-empty", () => {
  const occasions = [occ({ id: "1", type: "wedding", status: "PUBLISHED", visibility: "PUBLIC" })];
  const cards = groupIntoJourneys(occasions, { viewerIsOwner: false, familyVisibility: "PUBLIC" });
  const pub = publicJourneys(cards);
  assert.equal(pub.length, 1);
  assert.equal(pub[0].id, "wedding");
});

test("nothing expires: a 1999 occasion still groups and lists", () => {
  const cards = groupIntoJourneys([occ({ type: "wedding", eventDate: "1999-06-14T00:00:00Z" })], { viewerIsOwner: false, familyVisibility: "PUBLIC" });
  assert.equal(cards.find((c) => c.id === "wedding")!.occasionCount, 1);
});

test("owner journey order override sorts cards", () => {
  const settings = parseJourneySettings(JSON.stringify({ baby: { order: 1 }, wedding: { order: 2 } }));
  const cards = groupIntoJourneys([], { viewerIsOwner: true, familyVisibility: "PUBLIC", journeySettings: settings });
  assert.equal(cards[0].id, "baby");
  assert.equal(cards[1].id, "wedding");
});

// ── misc ─────────────────────────────────────────────────────────
test("parseJourneySettings tolerates junk", () => {
  assert.deepEqual(parseJourneySettings(null), {});
  assert.deepEqual(parseJourneySettings("not json"), {});
  assert.deepEqual(parseJourneySettings(JSON.stringify({ baby: "nope" })), {});
});

test("normalizeVisibility defaults unknown to PUBLIC", () => {
  assert.equal(normalizeVisibility("weird"), "PUBLIC");
  assert.equal(normalizeVisibility("PRIVATE"), "PRIVATE");
});

test("familySlugFrom + getJourneySection", () => {
  assert.equal(familySlugFrom("The Johnson Family"), "the-johnson-family");
  assert.equal(familySlugFrom(""), "our-family");
  assert.equal(getJourneySection("baby")?.label, "Baby Journey");
  assert.equal(getJourneySection("nope"), undefined);
});
