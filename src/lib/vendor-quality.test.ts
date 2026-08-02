// Unit tests for the Vendor Quality Standards & Review Policy engine.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isNegativeReview, reviewCountsAsStrike, strikeOutcome,
  newPerformance, recordVerifiedNegative, inProbation, canReapply,
  immediateSuspend, PROBATION_DAYS, REINSTATEMENT_CRITERIA,
  IMMEDIATE_SUSPENSION_REASONS, MARKETPLACE_RIGHTS, PERFORMANCE_REVIEW_DIMENSIONS,
  type VendorPerformance,
} from "./vendor-quality.ts";

const NOW = new Date("2026-08-02T12:00:00Z");

// ── Negative review detection ──────────────────────────────────
test("negative review is low rating or a no-recommend", () => {
  assert.equal(isNegativeReview({ overallRating: 1 }), true);
  assert.equal(isNegativeReview({ overallRating: 2 }), true);
  assert.equal(isNegativeReview({ overallRating: 5, recommend: false }), true);
  assert.equal(isNegativeReview({ overallRating: 4, recommend: true }), false);
});

// ── Only verified negatives count ──────────────────────────────
test("only a verified negative review counts as a strike", () => {
  assert.equal(reviewCountsAsStrike("verified", true), true);
  assert.equal(reviewCountsAsStrike("pending", true), false);
  assert.equal(reviewCountsAsStrike("dismissed", true), false);
  assert.equal(reviewCountsAsStrike("verified", false), false);
});

// ── Graduated actions ──────────────────────────────────────────
test("first strike: active + search penalty, no warning/removal", () => {
  const o = strikeOutcome(1);
  assert.equal(o.active, true); assert.equal(o.searchPenalty, true);
  assert.equal(o.warning, false); assert.equal(o.removed, false);
});
test("second strike: formal warning, still active", () => {
  const o = strikeOutcome(2);
  assert.equal(o.active, true); assert.equal(o.warning, true); assert.equal(o.removed, false);
});
test("third strike: removed", () => {
  const o = strikeOutcome(3);
  assert.equal(o.removed, true); assert.equal(o.active, false);
});

// ── Performance progression ────────────────────────────────────
test("three verified negatives → active → warned → removed + probation", () => {
  let perf: VendorPerformance = newPerformance();
  let u = recordVerifiedNegative(perf, NOW);
  assert.equal(u.performance.status, "active");
  assert.equal(u.performance.searchPenalty, true);
  assert.equal(u.performance.probationUntil, null);

  u = recordVerifiedNegative(u.performance, NOW);
  assert.equal(u.performance.status, "warned");

  u = recordVerifiedNegative(u.performance, NOW);
  assert.equal(u.performance.status, "removed");
  assert.equal(u.performance.verifiedNegatives, 3);
  assert.ok(u.performance.probationUntil);
  assert.deepEqual([...u.notify].sort(), ["admins", "vendor"]);
  // probation is one year out
  const until = new Date(u.performance.probationUntil!);
  assert.equal(until.getTime(), NOW.getTime() + PROBATION_DAYS * 86400000);
});

// ── Probation & reinstatement ──────────────────────────────────
test("removed vendor is in probation and cannot reapply for a year", () => {
  const removed: VendorPerformance = { verifiedNegatives: 3, status: "removed", searchPenalty: true, probationUntil: new Date(NOW.getTime() + 100 * 86400000).toISOString() };
  assert.equal(inProbation(removed, NOW), true);
  assert.equal(canReapply(removed, NOW), false);
  const later = new Date(NOW.getTime() + 200 * 86400000);
  assert.equal(inProbation(removed, later), false);
  assert.equal(canReapply(removed, later), true);
});
test("active vendor can always apply/continue", () => {
  assert.equal(canReapply(newPerformance(), NOW), true);
  assert.equal(inProbation(newPerformance(), NOW), false);
});
test("reinstatement criteria enumerated (not guaranteed)", () => {
  assert.equal(REINSTATEMENT_CRITERIA.length, 5);
});

// ── Immediate suspension ───────────────────────────────────────
test("immediate suspension bypasses the strike ladder", () => {
  const perf = newPerformance();
  const u = immediateSuspend(perf, "fraud");
  assert.equal(u.performance.status, "suspended");
  assert.equal(u.performance.verifiedNegatives, 0); // not a strike
  assert.deepEqual([...u.notify].sort(), ["admins", "vendor"]);
  assert.ok(IMMEDIATE_SUSPENSION_REASONS.includes("safety concerns"));
});

// ── Copy ───────────────────────────────────────────────────────
test("rights and review dimensions present", () => {
  assert.equal(MARKETPLACE_RIGHTS.length, 5);
  assert.equal(PERFORMANCE_REVIEW_DIMENSIONS.length, 6);
});
