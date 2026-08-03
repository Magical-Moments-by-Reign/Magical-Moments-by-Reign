// Tests for the Vendor Portal domain layer: status derivation, section access,
// public visibility, attention items, dashboard cards, and messaging. Pure.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  portalStatus, allowedSections, canAccessSection, publiclyVisible,
  whatNeedsAttention, dashboardCards, statusMessage, missingDocumentsMessage,
  type VendorPortalState, type AttentionFlags,
} from "./vendor-portal";

const base: VendorPortalState = {
  marketStatus: "approved", membershipStatus: "active",
  hasPendingApplication: false, agreementAccepted: true, complianceOk: true,
};

test("portalStatus: applicant vs under review vs additional info", () => {
  assert.equal(portalStatus({ ...base, marketStatus: "pending", hasPendingApplication: false }), "applicant");
  assert.equal(portalStatus({ ...base, marketStatus: "pending", hasPendingApplication: true }), "under_review");
  assert.equal(portalStatus({ ...base, marketStatus: "pending", hasPendingApplication: true, additionalInfoRequested: true }), "additional_info");
});

test("portalStatus: active only when agreement + compliance + membership all good", () => {
  assert.equal(portalStatus(base), "active");
  assert.equal(portalStatus({ ...base, agreementAccepted: false }), "approved");
  assert.equal(portalStatus({ ...base, complianceOk: false }), "approved");
  assert.equal(portalStatus({ ...base, membershipStatus: "pending_verification" }), "approved");
});

test("portalStatus: suspended / removed / probation / inactive / reinstated", () => {
  assert.equal(portalStatus({ ...base, marketStatus: "suspended" }), "suspended");
  assert.equal(portalStatus({ ...base, marketStatus: "removed" }), "removed");
  assert.equal(portalStatus({ ...base, marketStatus: "removed", reapplicationPending: true }), "reapplication_pending");
  assert.equal(portalStatus({ ...base, onProbation: true }), "probation");
  assert.equal(portalStatus({ ...base, temporarilyInactive: true }), "temporarily_inactive");
  assert.equal(portalStatus({ ...base, reinstated: true }), "reinstated");
});

test("allowedSections: applicant is limited; active is full", () => {
  const applicant = allowedSections("applicant");
  assert.ok(applicant.includes("application_status"));
  assert.ok(applicant.includes("compliance"));
  assert.ok(!applicant.includes("bookings"));       // no bookings until active
  assert.ok(!applicant.includes("payments"));
  const active = allowedSections("active");
  assert.ok(active.includes("bookings") && active.includes("payments") && active.includes("calendar"));
});

test("canAccessSection: suspended cannot reach bookings but can reach messages", () => {
  assert.equal(canAccessSection("suspended", "bookings"), false);
  assert.equal(canAccessSection("suspended", "messages"), true);
  assert.equal(canAccessSection("active", "bookings"), true);
});

test("publiclyVisible: only when fully live", () => {
  assert.equal(publiclyVisible(base), true);
  assert.equal(publiclyVisible({ ...base, complianceOk: false }), false);
  assert.equal(publiclyVisible({ ...base, agreementAccepted: false }), false);
  assert.equal(publiclyVisible({ ...base, membershipStatus: "inactive" }), false);
  assert.equal(publiclyVisible({ ...base, temporarilyInactive: true }), false);
  assert.equal(publiclyVisible({ ...base, marketStatus: "suspended" }), false);
});

const flags: AttentionFlags = {
  agreementAccepted: true, complianceOk: true, missingDocuments: [], expiringDocuments: [],
  pendingBookingCount: 0, standbyAwaitingConfirm: 0, unreadInquiryCount: 0,
  upcomingEventsToReview: 0, annualVerificationDue: false, additionalInfoRequested: false,
};

test("whatNeedsAttention: encouraging, never says 'missing'", () => {
  const items = whatNeedsAttention({ ...flags, agreementAccepted: false, missingDocuments: ["General Liability Insurance"], pendingBookingCount: 2 });
  const text = items.map((i) => i.label).join(" ");
  assert.ok(!/missing/i.test(text));
  assert.ok(items.some((i) => i.section === "agreement"));
  assert.ok(items.some((i) => i.section === "compliance"));
  assert.ok(items.some((i) => i.section === "bookings"));
});

test("whatNeedsAttention: nothing to do when all clear", () => {
  assert.equal(whatNeedsAttention(flags).length, 0);
});

test("dashboardCards: booking/message/payout metrics are flagged gated", () => {
  const cards = dashboardCards({
    completedBookings: 12, ratingAvg: 4.8, reviewCount: 10, verifiedNegatives: 0, badge: "trusted",
    membershipRenewalDate: "2027-01-01", membershipFeeDeducted: true, docsExpiringSoon: 1, complianceAlerts: 0,
  });
  const gatedIds = cards.filter((c) => c.gated).map((c) => c.id);
  assert.ok(gatedIds.includes("pending_bookings") && gatedIds.includes("payouts") && gatedIds.includes("messages"));
  const completed = cards.find((c) => c.id === "completed")!;
  assert.equal(completed.gated, false);
  assert.equal(completed.value, 12);
});

test("messaging helpers", () => {
  assert.match(statusMessage("active").text, /live in the marketplace/i);
  assert.equal(statusMessage("active").tone, "ok");
  assert.match(missingDocumentsMessage([]), /All required documents/i);
  assert.match(missingDocumentsMessage(["W-9"]), /one step away/i);
  assert.match(missingDocumentsMessage(["W-9", "Insurance"]), /complete verification/i);
});
