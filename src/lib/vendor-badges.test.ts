// Unit tests for the Magical Moments Verified Program (vendor badges).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VENDOR_BADGES, badgeDef, badgeRank, qualifiesFor, qualifiedTier,
  awardedBadge, inGoodStanding, badgeProgress,
  type VendorBadgeStats,
} from "./vendor-badges.ts";

const base: VendorBadgeStats = {
  status: "approved", completedEvents: 0, ratingAvg: 0, unresolvedComplaints: 0, verifiedNegatives: 0,
};

test("five tiers; verified & elite require admin approval; elite is invitation-only", () => {
  assert.equal(VENDOR_BADGES.length, 5);
  assert.equal(badgeDef("verified").adminApproval, true);
  assert.equal(badgeDef("elite").invitationOnly, true);
  assert.equal(badgeDef("trusted").adminApproval, false);
  VENDOR_BADGES.forEach((b) => { assert.ok(b.icon); assert.ok(b.meaning); });
});

test("approved new vendor is New Vendor", () => {
  assert.equal(awardedBadge(base)?.tier, "new");
  assert.equal(qualifiedTier(base), "new");
});

test("Trusted: 10 events, 4.7+, no complaints (auto)", () => {
  assert.equal(awardedBadge({ ...base, completedEvents: 10, ratingAvg: 4.7 })?.tier, "trusted");
  assert.equal(awardedBadge({ ...base, completedEvents: 9, ratingAvg: 5 })?.tier, "new"); // too few events
  assert.equal(awardedBadge({ ...base, completedEvents: 20, ratingAvg: 4.6 })?.tier, "new"); // rating too low
});

test("Family Favorite: 25 events, 4.9+ (auto)", () => {
  assert.equal(awardedBadge({ ...base, completedEvents: 25, ratingAvg: 4.9 })?.tier, "family_favorite");
  assert.equal(awardedBadge({ ...base, completedEvents: 25, ratingAvg: 4.8 })?.tier, "trusted");
});

test("Verified: data alone is NOT enough — needs admin approval", () => {
  const data = { ...base, completedEvents: 50, ratingAvg: 4.9, businessInfoVerified: true, onTimeConsistent: true };
  assert.equal(qualifiesFor("verified", data), true);
  assert.equal(awardedBadge(data)?.tier, "family_favorite"); // qualifies but not approved → capped below verified
  assert.equal(awardedBadge({ ...data, verifiedApproved: true })?.tier, "verified");
});

test("Verified requires verified business info AND on-time performance", () => {
  const d = { ...base, completedEvents: 50, ratingAvg: 4.9, verifiedApproved: true, businessInfoVerified: false, onTimeConsistent: true };
  assert.equal(awardedBadge(d)?.tier, "family_favorite"); // missing business info
  assert.equal(qualifiesFor("verified", d), false);
});

test("Elite Partner is invitation-only + admin — never auto, even for top data", () => {
  const top = { ...base, completedEvents: 500, ratingAvg: 5, businessInfoVerified: true, onTimeConsistent: true, verifiedApproved: true };
  assert.equal(qualifiesFor("elite", top), false);
  assert.equal(awardedBadge(top)?.tier, "verified"); // never auto-elite
  assert.equal(awardedBadge({ ...top, eliteInvited: true })?.tier, "elite"); // admin invite grants it
});

test("a strike or unresolved complaint downgrades to New (even Elite/override)", () => {
  const struck = { ...base, completedEvents: 100, ratingAvg: 5, businessInfoVerified: true, onTimeConsistent: true, verifiedApproved: true, eliteInvited: true, verifiedNegatives: 1 };
  assert.equal(inGoodStanding(struck), false);
  assert.equal(awardedBadge(struck)?.tier, "new");
  const complaint = { ...base, completedEvents: 30, ratingAvg: 4.9, unresolvedComplaints: 1, badgeOverride: "verified" as const };
  assert.equal(awardedBadge(complaint)?.tier, "new"); // override doesn't survive a complaint
});

test("standards lapse → auto-downgrade (recomputed each time)", () => {
  const wasFF = { ...base, completedEvents: 25, ratingAvg: 4.9 };
  assert.equal(awardedBadge(wasFF)?.tier, "family_favorite");
  // rating drops
  assert.equal(awardedBadge({ ...wasFF, ratingAvg: 4.6 })?.tier, "new");
});

test("non-approved vendors carry no badge (suspended/removed/probation/pending)", () => {
  assert.equal(awardedBadge({ ...base, status: "suspended" }), null);
  assert.equal(awardedBadge({ ...base, status: "removed" }), null);
  assert.equal(awardedBadge({ ...base, status: "pending" }), null);
});

test("admin override awards a tier manually (in good standing)", () => {
  assert.equal(awardedBadge({ ...base, badgeOverride: "verified" })?.tier, "verified");
  assert.equal(awardedBadge({ ...base, badgeOverride: "elite" })?.tier, "elite");
});

test("dashboard progress shows next tier + requirement checklist", () => {
  const p = badgeProgress(base);
  assert.equal(p.current, "new");
  assert.equal(p.next, "trusted");
  assert.equal(p.requirements.length, 3);
  assert.ok(p.requirements.some((r) => r.label.includes("10 completed events") && r.met === false));

  const towardVerified = badgeProgress({ ...base, completedEvents: 25, ratingAvg: 4.9 });
  assert.equal(towardVerified.next, "verified");
  assert.equal(towardVerified.needsAdminApproval, true);
  assert.ok(towardVerified.requirements.some((r) => r.label === "Admin approval"));
});

test("ranks ascend", () => {
  assert.ok(badgeRank("elite") > badgeRank("verified"));
  assert.ok(badgeRank("verified") > badgeRank("trusted"));
});
