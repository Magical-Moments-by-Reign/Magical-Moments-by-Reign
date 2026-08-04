import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTier, isPaidMember, canCreateOccasions, canUnlockPlanningTools,
  FREE_FOREVER_INCLUDES, FREE_FOREVER_EXCLUDES, UPGRADE_COPY,
} from "./membership-access.ts";

test("normalizeTier canonicalizes known tiers and aliases", () => {
  assert.equal(normalizeTier("free"), "free");
  assert.equal(normalizeTier("monthly"), "monthly");
  assert.equal(normalizeTier("MAGICAL"), "magical");
  assert.equal(normalizeTier("1yr"), "annual");
  assert.equal(normalizeTier("lifetime"), "magical");
});

test("normalizeTier defaults unknown/empty to free (least privilege)", () => {
  assert.equal(normalizeTier(""), "free");
  assert.equal(normalizeTier(null), "free");
  assert.equal(normalizeTier(undefined), "free");
  assert.equal(normalizeTier("enterprise"), "free");
  assert.equal(normalizeTier("silver"), "free"); // legacy media plan, not a membership tier
});

test("Free Forever is NOT a paying member and cannot create occasions", () => {
  assert.equal(isPaidMember("free"), false);
  assert.equal(canCreateOccasions("free"), false);
  assert.equal(canUnlockPlanningTools("free"), false);
  // Unknown values are treated as Free — they must not unlock paid access.
  assert.equal(canCreateOccasions("mystery"), false);
  assert.equal(canCreateOccasions(null), false);
});

test("every paid tier can create occasions and unlock tools", () => {
  for (const t of ["monthly", "annual", "5yr", "10yr", "legacy", "reign", "magical"]) {
    assert.equal(isPaidMember(t), true, `${t} should be paid`);
    assert.equal(canCreateOccasions(t), true, `${t} should create occasions`);
    assert.equal(canUnlockPlanningTools(t), true, `${t} should unlock tools`);
  }
  // Aliases resolve to paid too.
  assert.equal(canCreateOccasions("1yr"), true);
  assert.equal(canCreateOccasions("lifetime"), true);
});

test("entitlement copy is present and coherent", () => {
  assert.ok(FREE_FOREVER_INCLUDES.length >= 6);
  assert.ok(FREE_FOREVER_EXCLUDES.length >= 3);
  assert.match(UPGRADE_COPY.title, /Membership/i);
  assert.equal(UPGRADE_COPY.href, "/membership");
});
