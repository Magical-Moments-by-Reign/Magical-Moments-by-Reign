// Unit tests for Vendor Membership, Verification & Compliance.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VERIFICATION_ITEMS, isExpired, complianceStatus, resolveMarketplace,
  deductMembershipFee, computeRenewalDate, renewalDue, renewalPlan,
  expirationReminders, REMINDER_DAYS_BEFORE, INDEPENDENT_CONTRACTOR_TERMS,
  NO_INSURANCE_NOTICE, RIGHT_TO_VERIFY,
  type Credential,
} from "./vendor-membership.ts";

const NOW = "2026-08-02T00:00:00.000Z";
const cred = (over: Partial<Credential>): Credential => ({ kind: "gl_insurance", required: true, provided: true, verified: true, expiresAt: null, ...over });

// ── Verification checklist ─────────────────────────────────────
test("verification checklist covers the required annual items", () => {
  const kinds = VERIFICATION_ITEMS.map((v) => v.kind);
  for (const k of ["business_info", "business_license", "gl_insurance", "workers_comp"]) assert.ok(kinds.includes(k as never));
  assert.equal(VERIFICATION_ITEMS.find((v) => v.kind === "gl_insurance")?.conditional, false);
  assert.equal(VERIFICATION_ITEMS.find((v) => v.kind === "workers_comp")?.conditional, true);
});

// ── Expiration ─────────────────────────────────────────────────
test("isExpired compares against now; null never expires", () => {
  assert.equal(isExpired("2026-08-01T00:00:00.000Z", NOW), true);
  assert.equal(isExpired("2026-09-01T00:00:00.000Z", NOW), false);
  assert.equal(isExpired(null, NOW), false);
});

// ── Compliance ─────────────────────────────────────────────────
test("compliant only when all required creds provided, verified, unexpired", () => {
  const ok = complianceStatus([
    cred({ kind: "business_info" }), cred({ kind: "gl_insurance", expiresAt: "2027-01-01T00:00:00.000Z" }),
  ], NOW);
  assert.equal(ok.compliant, true);
});
test("missing required credential → not compliant", () => {
  const r = complianceStatus([cred({ kind: "gl_insurance", provided: false })], NOW);
  assert.equal(r.compliant, false);
  assert.ok(r.missing.includes("gl_insurance"));
});
test("expired required credential → not compliant", () => {
  const r = complianceStatus([cred({ kind: "business_license", expiresAt: "2026-07-01T00:00:00.000Z" })], NOW);
  assert.equal(r.compliant, false);
  assert.ok(r.expired.includes("business_license"));
});
test("conditional (not required) credentials are ignored", () => {
  const r = complianceStatus([cred({ kind: "workers_comp", required: false, provided: false })], NOW);
  assert.equal(r.compliant, true);
});
test("expiringSoon surfaces credentials within the window", () => {
  const r = complianceStatus([cred({ kind: "gl_insurance", expiresAt: "2026-09-15T00:00:00.000Z" })], NOW, 90);
  assert.equal(r.compliant, true);
  assert.equal(r.expiringSoon.length, 1);
  assert.ok(r.expiringSoon[0].daysOut > 0 && r.expiringSoon[0].daysOut <= 90);
});

// ── Marketplace resolution (auto in/out) ───────────────────────
test("active only when membership active AND compliant", () => {
  const compliant = complianceStatus([cred({ kind: "business_info" })], NOW);
  assert.equal(resolveMarketplace({ membershipStatus: "active", compliance: compliant }).active, true);
  assert.equal(resolveMarketplace({ membershipStatus: "inactive", compliance: compliant }).reason, "membership_inactive");
  assert.equal(resolveMarketplace({ membershipStatus: "suspended", compliance: compliant }).reason, "suspended");
});
test("noncompliant active membership is hidden and can't accept bookings", () => {
  const bad = complianceStatus([cred({ kind: "gl_insurance", expiresAt: "2020-01-01T00:00:00.000Z" })], NOW);
  const r = resolveMarketplace({ membershipStatus: "active", compliance: bad });
  assert.equal(r.active, false);
  assert.equal(r.reason, "noncompliant");
  assert.equal(r.hiddenFromSearch, true);
  assert.equal(r.canAcceptBookings, false);
});

// ── Membership fee (no upfront; from first booking) ────────────
test("fee deducted from first booking; vendor nets the remainder", () => {
  const d = deductMembershipFee(50000, 10000); // $500 booking, $100 fee
  assert.equal(d.deductedCents, 10000);
  assert.equal(d.vendorNetCents, 40000);
  assert.equal(d.shortfallCents, 0);
  assert.equal(d.fullyCollected, true);
});
test("small booking → partial deduction leaves a shortfall owed", () => {
  const d = deductMembershipFee(6000, 10000); // $60 booking, $100 fee
  assert.equal(d.deductedCents, 6000);
  assert.equal(d.vendorNetCents, 0);
  assert.equal(d.shortfallCents, 4000);
  assert.equal(d.fullyCollected, false);
});

// ── Renewal ────────────────────────────────────────────────────
test("renewal date is one year out; due only on/after that date", () => {
  assert.equal(computeRenewalDate("2026-08-02T00:00:00.000Z"), "2027-08-02T00:00:00.000Z");
  assert.equal(renewalDue("2027-08-02T00:00:00.000Z", "2027-08-01T00:00:00.000Z"), false);
  assert.equal(renewalDue("2027-08-02T00:00:00.000Z", "2027-08-02T00:00:00.000Z"), true);
});
test("renewal: from next booking, else direct payment after grace", () => {
  const notDue = renewalPlan("2027-08-02T00:00:00.000Z", "2027-07-01T00:00:00.000Z", false);
  assert.equal(notDue.due, false);
  const dueWithBooking = renewalPlan("2027-08-02T00:00:00.000Z", "2027-08-10T00:00:00.000Z", true);
  assert.equal(dueWithBooking.collectFromNextBooking, true);
  assert.equal(dueWithBooking.directPaymentRequired, false);
  const dueNoBookingPastGrace = renewalPlan("2027-08-02T00:00:00.000Z", "2027-10-20T00:00:00.000Z", false, 60);
  assert.equal(dueNoBookingPastGrace.directPaymentRequired, true);
});

// ── Reminders ──────────────────────────────────────────────────
test("expiration reminders at 90/60/30/14/7/0 days before", () => {
  const all = expirationReminders("2026-12-01T00:00:00.000Z");
  assert.deepEqual(all.map((r) => r.daysBefore), [...REMINDER_DAYS_BEFORE]);
});
test("past reminders are dropped relative to now", () => {
  const r = expirationReminders("2026-08-10T00:00:00.000Z", NOW); // 8 days out → only 7 & 0 remain
  assert.deepEqual(r.map((x) => x.daysBefore), [7, 0]);
});

// ── Copy / guardrails ──────────────────────────────────────────
test("independent-contractor terms + no-insurance + right-to-verify present", () => {
  assert.deepEqual([...INDEPENDENT_CONTRACTOR_TERMS.createsNone], ["Employment", "Partnership", "Agency", "Franchise", "Joint Venture"]);
  assert.ok(INDEPENDENT_CONTRACTOR_TERMS.vendorResponsibleFor.includes("Taxes"));
  assert.ok(NO_INSURANCE_NOTICE.includes("does not provide insurance"));
  assert.ok(RIGHT_TO_VERIFY.includes("directly with issuing agencies"));
});
