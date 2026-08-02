// Unit tests for the Magical Preview Pass (trial membership) domain logic.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTrialDates, formatBillingDate, formatUSD, daysRemaining,
  consentText, billingSummary, ctaFinePrint, reminderSchedule,
  onTrialEnd, cancellationPreview, paidFeatureAvailable, buildConsentRecord,
  eligibleForTrial, DEFAULT_TRIAL_DAYS, CONSENT_TEXT_VERSION, PAST_DUE_POLICY,
  TRIAL_ACCESS, TRIAL_LIMITS, TRIAL_FAQ, TRIAL_CONVERSION_REFUND_POLICY,
  type TrialHistory,
} from "./trial-membership.ts";

const START = "2026-08-08T12:00:00.000Z";

// ── Dates ──────────────────────────────────────────────────────
test("default trial is 7 days; billing date == trial end", () => {
  const d = computeTrialDates(START);
  assert.equal(DEFAULT_TRIAL_DAYS, 7);
  assert.equal(d.endISO, "2026-08-15T12:00:00.000Z");
  assert.equal(d.firstBillingISO, d.endISO);
});
test("trial length is configurable", () => {
  const d = computeTrialDates(START, 14);
  assert.equal(d.endISO, "2026-08-22T12:00:00.000Z");
});
test("formatBillingDate is human + deterministic (UTC)", () => {
  assert.equal(formatBillingDate("2026-08-15T12:00:00.000Z"), "August 15, 2026");
});
test("formatUSD", () => {
  assert.equal(formatUSD(0), "$0");
  assert.equal(formatUSD(1900), "$19");
  assert.equal(formatUSD(2999), "$29.99");
});
test("daysRemaining never negative", () => {
  assert.equal(daysRemaining("2026-08-15T12:00:00.000Z", "2026-08-12T12:00:00.000Z"), 3);
  assert.equal(daysRemaining("2026-08-15T12:00:00.000Z", "2026-08-20T12:00:00.000Z"), 0);
});

// ── Exact disclosures ──────────────────────────────────────────
const disc = { planName: "Gold Legacy", days: 7, monthlyCents: 1900, firstBillingISO: "2026-08-15T12:00:00.000Z" };

test("consent text contains plan, amount, exact date, monthly + cancel rights", () => {
  const t = consentText(disc);
  assert.ok(t.includes("7-day"));
  assert.ok(t.includes("Gold Legacy"));
  assert.ok(t.includes("$19"));
  assert.ok(t.includes("August 15, 2026"));
  assert.ok(t.includes("every month until canceled"));
  assert.ok(t.includes("does not qualify for a refund"));
  assert.ok(t.includes("cancel through my account"));
});
test("billing summary shows $0 today and the exact figures", () => {
  const s = billingSummary(disc);
  assert.equal(s.amountDueToday, "$0");
  assert.equal(s.amountAfterTrial, "$19");
  assert.equal(s.firstBillingDate, "August 15, 2026");
  assert.equal(s.billingFrequency, "Monthly");
  assert.equal(s.selectedMembership, "Gold Legacy");
});
test("CTA fine print states $0 today + exact charge/date", () => {
  const f = ctaFinePrint(disc);
  assert.ok(f.startsWith("$0 due today."));
  assert.ok(f.includes("$19"));
  assert.ok(f.includes("August 15, 2026"));
  assert.ok(f.includes("unless canceled"));
});

// ── Reminders ──────────────────────────────────────────────────
test("reminder schedule: signup + 3-day + 1-day, ordered before end", () => {
  const dates = computeTrialDates(START);
  const r = reminderSchedule(dates);
  assert.deepEqual(r.map((x) => x.type), ["signup", "three_days_before", "one_day_before"]);
  assert.equal(r[1].atISO, "2026-08-12T12:00:00.000Z");
  assert.equal(r[2].atISO, "2026-08-14T12:00:00.000Z");
});
test("very short trial drops pre-start reminders", () => {
  const dates = computeTrialDates(START, 1); // end +1d; 3-days-before is before start
  const types = reminderSchedule(dates).map((x) => x.type);
  assert.ok(types.includes("signup"));
  assert.ok(!types.includes("three_days_before"));
});

// ── Status / conversion / failed payment ───────────────────────
test("trial end converts on success, past_due on failure", () => {
  assert.equal(onTrialEnd(true), "active");
  assert.equal(onTrialEnd(false), "past_due");
});
test("paid features only when active (past_due blocks publishing)", () => {
  assert.equal(paidFeatureAvailable("active"), true);
  assert.equal(paidFeatureAvailable("past_due"), false);
  assert.equal(paidFeatureAvailable("trialing"), false);
});
test("past-due policy is bounded (limited retries, grace, preserve content)", () => {
  assert.ok(PAST_DUE_POLICY.maxRetries >= 1 && PAST_DUE_POLICY.maxRetries <= 5);
  assert.ok(PAST_DUE_POLICY.graceDays >= 1);
  assert.equal(PAST_DUE_POLICY.publishBlocked, true);
});

// ── Cancellation ───────────────────────────────────────────────
test("cancel during trial → no charge, access to trial end, draft saved", () => {
  const c = cancellationPreview("trialing", { trialEndISO: "2026-08-15T12:00:00.000Z" });
  assert.equal(c.chargeWillOccur, false);
  assert.equal(c.accessEndsISO, "2026-08-15T12:00:00.000Z");
  assert.equal(c.contentRetained, true);
  assert.equal(c.canReactivate, true);
});
test("cancel paid membership → access through paid period", () => {
  const c = cancellationPreview("active", { trialEndISO: "2026-08-15T12:00:00.000Z", periodEndISO: "2026-09-15T12:00:00.000Z" });
  assert.equal(c.chargeWillOccur, false);
  assert.equal(c.accessEndsISO, "2026-09-15T12:00:00.000Z");
});

// ── Consent record ─────────────────────────────────────────────
test("consent record snapshots versions + figures", () => {
  const rec = buildConsentRecord({ ...disc, planId: "gold", acceptedAtISO: START, ipHash: "abc" });
  assert.equal(rec.consentTextVersion, CONSENT_TEXT_VERSION);
  assert.equal(rec.firstChargeCents, 1900);
  assert.equal(rec.recurringCents, 1900);
  assert.equal(rec.billingFrequency, "monthly");
  assert.ok(rec.consentText.includes("Gold Legacy"));
});

// ── Abuse prevention ───────────────────────────────────────────
const clean: TrialHistory = { priorTrialsForAccount: 0, priorTrialsForEmail: 0, priorTrialsForSquareCustomer: 0, priorTrialsForCardFingerprint: 0 };
test("one introductory trial per customer; admin can override", () => {
  assert.equal(eligibleForTrial(clean), true);
  assert.equal(eligibleForTrial({ ...clean, priorTrialsForEmail: 1 }), false);
  assert.equal(eligibleForTrial({ ...clean, priorTrialsForCardFingerprint: 1 }), false);
  assert.equal(eligibleForTrial({ ...clean, priorTrialsForEmail: 1 }, true), true); // admin exception
});

// ── Content present ────────────────────────────────────────────
test("access, limits, FAQ, refund policy present", () => {
  assert.ok(TRIAL_ACCESS.length >= 10);
  assert.ok(TRIAL_LIMITS.length >= 8);
  assert.ok(TRIAL_FAQ.length >= 10);
  assert.equal(TRIAL_CONVERSION_REFUND_POLICY.body.length, 5);
  assert.ok(TRIAL_CONVERSION_REFUND_POLICY.legalNote.includes("legal counsel"));
});
