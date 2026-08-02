// Unit tests for the Primary & Standby Vendor state machine.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newBooking, acceptPrimary, declinePrimary, completePrimary,
  acceptStandby, declineStandby, activateStandby, releaseStandby,
  canActivateStandby, canReleaseStandby, isPrimaryConfirmed, isStandbyConfirmed,
  vendorMilestones, VENDOR_PROTECTION_DISCLAIMERS, VENDOR_PROTECTION_FUTURE,
  type BookingState,
} from "./vendor-protection.ts";

// ── Booking creation ───────────────────────────────────────────
test("primary-only booking has no standby seat", () => {
  const b = newBooking("primary_only");
  assert.equal(b.primaryStatus, "pending");
  assert.equal(b.standbyStatus, null);
});
test("primary+standby booking opens both as pending", () => {
  const b = newBooking("primary_plus_standby");
  assert.equal(b.primaryStatus, "pending");
  assert.equal(b.standbyStatus, "pending");
});

// ── Nobody confirmed until they accept ─────────────────────────
test("no vendor is confirmed before acceptance", () => {
  const b = newBooking("primary_plus_standby");
  assert.equal(isPrimaryConfirmed(b), false);
  assert.equal(isStandbyConfirmed(b), false);
});
test("primary accepts → confirmed, notifies customer", () => {
  const r = acceptPrimary(newBooking("primary_only"));
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.state.primaryStatus, "accepted"); assert.deepEqual(r.notify, ["customer"]); assert.equal(isPrimaryConfirmed(r.state), true); }
});
test("accepting a non-pending primary fails", () => {
  const accepted = { choice: "primary_only", primaryStatus: "accepted", standbyStatus: null } as BookingState;
  assert.equal(acceptPrimary(accepted).ok, false);
});

// ── Standby acceptance ─────────────────────────────────────────
test("standby cannot accept on a primary-only booking", () => {
  assert.equal(acceptStandby(newBooking("primary_only")).ok, false);
});
test("standby accepts → reserved (not hired)", () => {
  const r = acceptStandby(newBooking("primary_plus_standby"));
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.state.standbyStatus, "accepted");
});

// ── Activation (only after primary gone + standby accepted) ────
test("cannot activate standby while primary is pending/accepted", () => {
  const b = newBooking("primary_plus_standby");
  assert.equal(canActivateStandby(b), false);
  const bothAccepted: BookingState = { choice: "primary_plus_standby", primaryStatus: "accepted", standbyStatus: "accepted" };
  assert.equal(canActivateStandby(bothAccepted), false);
});
test("activate standby after primary declines → notifies standby, customer, admins", () => {
  let s = acceptStandby(newBooking("primary_plus_standby"));
  assert.ok(s.ok);
  const declined = declinePrimary(s.ok ? s.state : newBooking("primary_plus_standby"));
  assert.ok(declined.ok);
  const state = declined.ok ? declined.state : (null as unknown as BookingState);
  assert.equal(canActivateStandby(state), true);
  const act = activateStandby(state);
  assert.ok(act.ok);
  if (act.ok) {
    assert.equal(act.state.standbyStatus, "activated");
    assert.deepEqual([...act.notify].sort(), ["admins", "customer", "standby_vendor"]);
  }
});
test("declinePrimary notifies admins too when a standby is reserved", () => {
  const s: BookingState = { choice: "primary_plus_standby", primaryStatus: "accepted", standbyStatus: "accepted" };
  const r = declinePrimary(s);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual([...r.notify].sort(), ["admins", "customer"]);
});

// ── Release ────────────────────────────────────────────────────
test("release standby only while reserved and primary confirmed", () => {
  const reserved: BookingState = { choice: "primary_plus_standby", primaryStatus: "accepted", standbyStatus: "accepted" };
  assert.equal(canReleaseStandby(reserved), true);
  const r = releaseStandby(reserved);
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.state.standbyStatus, "released"); assert.deepEqual(r.notify, ["standby_vendor"]); }
});
test("cannot release when primary not confirmed", () => {
  const s: BookingState = { choice: "primary_plus_standby", primaryStatus: "pending", standbyStatus: "accepted" };
  assert.equal(canReleaseStandby(s), false);
  assert.equal(releaseStandby(s).ok, false);
});

// ── Completion & milestones ────────────────────────────────────
test("primary completes only from accepted", () => {
  assert.equal(completePrimary(newBooking("primary_only")).ok, false);
  const accepted: BookingState = { choice: "primary_only", primaryStatus: "accepted", standbyStatus: null };
  const r = completePrimary(accepted);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.state.primaryStatus, "completed");
});
test("milestones reflect the booking state", () => {
  const primaryOnly = vendorMilestones({ choice: "primary_only", primaryStatus: "accepted", standbyStatus: null });
  assert.deepEqual(primaryOnly.map((m) => m.key), ["primary_confirmed", "event_completed"]);
  assert.equal(primaryOnly.find((m) => m.key === "primary_confirmed")?.done, true);

  const withStandby = vendorMilestones({ choice: "primary_plus_standby", primaryStatus: "accepted", standbyStatus: "released" });
  assert.deepEqual(withStandby.map((m) => m.key), ["primary_confirmed", "standby_confirmed", "vendor_released", "event_completed"]);
  assert.equal(withStandby.find((m) => m.key === "vendor_released")?.done, true);
  assert.equal(withStandby.find((m) => m.key === "event_completed")?.done, false);
});
test("standby decline is terminal", () => {
  const declined: BookingState = { choice: "primary_plus_standby", primaryStatus: "pending", standbyStatus: "declined" };
  assert.equal(declineStandby(declined).ok, false);
});

// ── Content constants ──────────────────────────────────────────
test("three disclaimers and ten future enhancements", () => {
  assert.equal(VENDOR_PROTECTION_DISCLAIMERS.length, 3);
  assert.equal(VENDOR_PROTECTION_FUTURE.length, 10);
});
