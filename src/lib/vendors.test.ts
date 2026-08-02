// Unit tests for the Vendor Marketplace domain library.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VENDOR_CATEGORIES, vendorCategory, isPublicVendor, filterVendors,
  averageRating, recommendRate, canContactVendor, activeVendorTiers,
  VENDOR_TIERS, REVIEW_CATEGORIES, VENDOR_NOTICE,
  type VendorProfile,
} from "./vendors.ts";

const v = (over: Partial<VendorProfile>): VendorProfile => ({
  id: "v", businessName: "Biz", description: "Great service", categoryId: "photographers",
  city: "Dallas", state: "TX", status: "approved", featured: false, hidden: false, ...over,
});

// ── Categories ─────────────────────────────────────────────────
test("category catalog is slugified and lookupable", () => {
  assert.ok(VENDOR_CATEGORIES.length >= 40);
  assert.equal(vendorCategory("wedding-venues")?.label, "Wedding Venues");
  assert.equal(vendorCategory("cake-designers")?.label, "Cake Designers");
  assert.equal(vendorCategory("does-not-exist"), undefined);
});
test("ampersand categories slug to 'and'", () => {
  // "Celebration of Life Services" etc. — ensure no stray symbols in ids
  for (const c of VENDOR_CATEGORIES) assert.match(c.id, /^[a-z0-9-]+$/);
});

// ── Public visibility ──────────────────────────────────────────
test("only approved, non-hidden vendors are public", () => {
  assert.equal(isPublicVendor(v({ status: "approved", hidden: false })), true);
  assert.equal(isPublicVendor(v({ status: "pending" })), false);
  assert.equal(isPublicVendor(v({ status: "suspended" })), false);
  assert.equal(isPublicVendor(v({ status: "approved", hidden: true })), false);
});

// ── Filtering ──────────────────────────────────────────────────
test("filter excludes non-public and matches category/city/state/rating/query", () => {
  const list = [
    v({ id: "a", categoryId: "photographers", city: "Dallas", state: "TX", ratingAvg: 4.8, businessName: "Ace Photo" }),
    v({ id: "b", categoryId: "florists", city: "Austin", state: "TX", ratingAvg: 3.0 }),
    v({ id: "c", status: "pending", categoryId: "photographers", city: "Dallas", state: "TX" }),
  ];
  assert.deepEqual(filterVendors(list, { category: "photographers" }).map((x) => x.id), ["a"]);
  assert.deepEqual(filterVendors(list, { city: "austin" }).map((x) => x.id), ["b"]);
  assert.deepEqual(filterVendors(list, { state: "TX", minRating: 4 }).map((x) => x.id), ["a"]);
  assert.deepEqual(filterVendors(list, { query: "ace" }).map((x) => x.id), ["a"]);
  // pending vendor "c" never appears
  assert.equal(filterVendors(list, {}).some((x) => x.id === "c"), false);
});
test("featured vendors sort first, then by rating", () => {
  const list = [
    v({ id: "low", ratingAvg: 3 }),
    v({ id: "feat", ratingAvg: 2, featured: true }),
    v({ id: "high", ratingAvg: 5 }),
  ];
  assert.deepEqual(filterVendors(list, {}).map((x) => x.id), ["feat", "high", "low"]);
});
test("empty marketplace returns nothing (no invented vendors)", () => {
  assert.deepEqual(filterVendors([], { category: "photographers" }), []);
});

// ── Reviews ────────────────────────────────────────────────────
test("six review categories defined", () => {
  assert.equal(REVIEW_CATEGORIES.length, 6);
});
test("averageRating and recommendRate", () => {
  const reviews = [
    { overallRating: 5, recommend: true },
    { overallRating: 4, recommend: true },
    { overallRating: 3, recommend: false },
  ];
  assert.equal(averageRating(reviews), 4);
  assert.equal(recommendRate(reviews), 67);
  assert.equal(averageRating([]), 0);
  assert.equal(recommendRate([]), 0);
});
test("ratings are clamped to 1..5", () => {
  assert.equal(averageRating([{ overallRating: 9 }, { overallRating: 0 }]), 3); // (5+1)/2
});

// ── Vendor Notice gate ─────────────────────────────────────────
test("contact requires accepting the Vendor Notice", () => {
  assert.equal(canContactVendor(false), false);
  assert.equal(canContactVendor(true), true);
  assert.ok(VENDOR_NOTICE.text.includes("independent vendors"));
  assert.ok(VENDOR_NOTICE.text.includes("not financially responsible"));
});

// ── Future monetization disabled ───────────────────────────────
test("all monetization tiers are disabled today", () => {
  assert.equal(VENDOR_TIERS.length, 5);
  assert.equal(activeVendorTiers().length, 0);
  assert.ok(VENDOR_TIERS.every((t) => t.enabled === false));
});
