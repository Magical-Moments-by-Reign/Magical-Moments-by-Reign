// Unit tests for the Family Financial Foundation.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FINANCIAL_MILESTONES, financialMilestone, FIRST_BANK_ACCOUNT,
  FINANCE_GUIDES, financeGuide, financeResource, FINANCE_OFFICIAL_RESOURCES,
  SAVINGS_PURPOSES, BANK_APPOINTMENT_ACTIONS, BANK_APPOINTMENT_GUARDRAIL,
  recommendForAge, savingsGoalProgress, FAMILY_FINANCE,
} from "./family-finance.ts";

test("age-appropriate milestones cover childhood → adulthood", () => {
  assert.ok(FINANCIAL_MILESTONES.length >= 12);
  for (const id of ["first_savings", "first_checking", "first_debit", "first_job", "building_credit", "emergency_fund", "homeownership_prep", "retirement_resources"]) {
    const m = financialMilestone(id);
    assert.ok(m, `missing ${id}`);
    assert.ok(m!.checklist.length > 0);
  }
});

test("First Bank Account milestone has steps, docs, and a badge", () => {
  assert.equal(FIRST_BANK_ACCOUNT.badge, "My First Bank Account");
  assert.ok(FIRST_BANK_ACCOUNT.steps.length >= 6);
  assert.ok(FIRST_BANK_ACCOUNT.commonDocuments.some((d) => d.includes("Social Security")));
});

test("finance guides answer key topics with official links", () => {
  for (const slug of ["budgeting-basics", "checking-vs-savings", "avoiding-scams", "building-credit", "identity-protection"]) {
    const g = financeGuide(slug);
    assert.ok(g, `missing ${slug}`);
    assert.ok(g!.answer.length > 40);
  }
  // official resources are real https links
  assert.ok(FINANCE_OFFICIAL_RESOURCES.cfpb.url.includes("consumerfinance.gov"));
  assert.ok(financeResource("identitytheft")?.url.includes("identitytheft.gov"));
});

test("savings purposes cover the common goals; shared math works", () => {
  const ids = SAVINGS_PURPOSES.map((p) => p.id);
  for (const p of ["college", "car", "wedding", "home", "emergency"]) assert.ok(ids.includes(p as never));
  const prog = savingsGoalProgress({ targetCents: 500000, savedCents: 250000 });
  assert.equal(prog.pct, 50);
});

test("bank appointments are link-out only (never booked on behalf)", () => {
  assert.ok(BANK_APPOINTMENT_ACTIONS.includes("Schedule appointments through official links"));
  assert.ok(BANK_APPOINTMENT_GUARDRAIL.includes("does not book appointments on behalf"));
});

test("Ask Magical recommends by age and context", () => {
  assert.equal(recommendForAge(16).milestoneId, "first_checking");
  assert.ok(recommendForAge(16).message.includes("first checking"));
  assert.equal(recommendForAge(19).milestoneId, "building_credit");
  assert.equal(recommendForAge(20, "college_offer").milestoneId, "student_banking");
  assert.equal(recommendForAge(8).milestoneId, "first_savings");
});

test("mission present", () => {
  assert.equal(FAMILY_FINANCE.name, "Family Financial Foundation");
  assert.ok(FAMILY_FINANCE.mission.includes("one step ahead"));
});
