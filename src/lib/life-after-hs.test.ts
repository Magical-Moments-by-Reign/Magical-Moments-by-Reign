// Unit tests for the Life After High School Ecosystem.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLLEGE_SEARCH_FACETS, filterColleges, compareColleges,
  scholarshipSummary, upcomingDeadlines, costOfAttendance, remainingCollegeCost,
  loanEstimate, savingsGoalProgress, PATHWAYS, pathway, CAREER_FIELDS,
  APPLICATION_CHECKLIST, ENROLLMENT_CHECKLIST, ASK_MAGICAL_EXAMPLES,
  type College, type Scholarship,
} from "./life-after-hs.ts";

const colleges: College[] = [
  { id: "a", name: "State U", state: "TX", type: "public", majors: ["Biology", "Veterinary Science"], annualTuitionCents: 1200000, distanceMiles: 40, veterinary: true, athletics: true },
  { id: "b", name: "Private College", state: "TX", type: "private", majors: ["Business"], annualTuitionCents: 3500000, distanceMiles: 300 },
  { id: "c", name: "Community College", state: "CA", type: "community", majors: ["Nursing"], annualTuitionCents: 300000, distanceMiles: 10 },
];

test("search facets include the key filters", () => {
  for (const f of ["State", "Major", "Tuition", "HBCUs", "Veterinary schools"]) {
    assert.ok(COLLEGE_SEARCH_FACETS.includes(f as never));
  }
});
test("filterColleges: empty in → empty out (no invented colleges)", () => {
  assert.deepEqual(filterColleges([], { state: "TX" }), []);
});
test("filterColleges matches facets", () => {
  assert.deepEqual(filterColleges(colleges, { state: "TX" }).map((c) => c.id), ["a", "b"]);
  assert.deepEqual(filterColleges(colleges, { veterinary: true }).map((c) => c.id), ["a"]);
  assert.deepEqual(filterColleges(colleges, { maxTuitionCents: 1500000 }).map((c) => c.id), ["a", "c"]);
  assert.deepEqual(filterColleges(colleges, { maxDistanceMiles: 50 }).map((c) => c.id), ["a", "c"]);
  assert.deepEqual(filterColleges(colleges, { major: "vet" }).map((c) => c.id), ["a"]);
});
test("compareColleges selects the requested ids", () => {
  assert.deepEqual(compareColleges(colleges, ["a", "c"]).map((c) => c.id), ["a", "c"]);
});

// ── Scholarships ───────────────────────────────────────────────
const scholarships: Scholarship[] = [
  { id: "1", name: "A", status: "awarded", amountCents: 200000 },
  { id: "2", name: "B", status: "awarded", amountCents: 150000 },
  { id: "3", name: "C", status: "pending", amountCents: 500000, deadline: "2026-08-20T00:00:00.000Z" },
  { id: "4", name: "D", status: "declined", amountCents: 100000 },
];
test("scholarship summary tallies applied/awarded/pending + total earned", () => {
  const s = scholarshipSummary(scholarships);
  assert.equal(s.appliedFor, 3);      // declined excluded
  assert.equal(s.awarded, 2);
  assert.equal(s.pending, 1);
  assert.equal(s.totalEarnedCents, 350000);
});
test("upcoming deadlines within window, soonest first", () => {
  const up = upcomingDeadlines(scholarships, "2026-08-01T00:00:00.000Z", 30);
  assert.deepEqual(up.map((s) => s.id), ["3"]);
  assert.equal(upcomingDeadlines(scholarships, "2026-10-01T00:00:00.000Z", 30).length, 0);
});

// ── Financial calculators ──────────────────────────────────────
test("cost of attendance sums components", () => {
  assert.equal(costOfAttendance({ tuitionCents: 1000000, housingCents: 500000, mealsCents: 300000, booksCents: 100000, transportationCents: 100000 }), 2000000);
});
test("remaining cost never below zero", () => {
  assert.equal(remainingCollegeCost(2000000, 500000, 400000), 1100000);
  assert.equal(remainingCollegeCost(500000, 400000, 400000), 0);
});
test("loan estimate: amortized monthly + interest; 0% divides evenly", () => {
  const zero = loanEstimate(1200000, 0, 1);
  assert.equal(zero.monthlyPaymentCents, 100000);
  assert.equal(zero.totalInterestCents, 0);
  const l = loanEstimate(1000000, 6, 10);
  assert.ok(l.monthlyPaymentCents > 0);
  assert.ok(l.totalPaidCents > 1000000);      // interest accrues
  assert.ok(l.totalInterestCents > 0);
});

// ── Savings goal ───────────────────────────────────────────────
test("savings goal aggregates sources; pct capped; reached flag", () => {
  const p = savingsGoalProgress({ targetCents: 1000000, savedCents: 400000, giftsCents: 100000, scholarshipsCents: 200000, contributionsCents: 100000 });
  assert.equal(p.totalCents, 800000);
  assert.equal(p.pct, 80);
  assert.equal(p.reached, false);
  const done = savingsGoalProgress({ targetCents: 1000000, savedCents: 1200000 });
  assert.equal(done.pct, 100);
  assert.equal(done.reached, true);
});

// ── Pathways (equal respect) ───────────────────────────────────
test("all seven+ pathways carry full guidance", () => {
  assert.ok(PATHWAYS.length >= 7);
  for (const id of ["college", "military", "trade_school", "apprenticeship", "entrepreneurship", "workforce", "gap_year"]) {
    const p = pathway(id);
    assert.ok(p, `missing ${id}`);
    assert.ok(p!.benefits.length && p!.considerations.length && p!.checklist.length && p!.timeline);
  }
});

// ── Careers & checklists ───────────────────────────────────────
test("career fields + checklists present", () => {
  assert.ok(CAREER_FIELDS.length >= 5);
  assert.ok(APPLICATION_CHECKLIST.includes("Track waitlists"));
  assert.ok(ENROLLMENT_CHECKLIST.includes("Move-in day"));
  assert.ok(ASK_MAGICAL_EXAMPLES.some((e) => e.includes("scholarship deadlines")));
});
