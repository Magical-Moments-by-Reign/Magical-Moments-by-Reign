import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_CATEGORIES,
  getServiceCategory,
  connectionLabel,
  RESERVATION_STATUS,
  clientCanTransition,
  clientCanCancel,
  intakeFor,
  RESTAURANT_INTAKE,
  type ReservationStatus,
} from "./catalog";

test("all 14 service categories are present and honestly labeled", () => {
  assert.equal(SERVICE_CATEGORIES.length, 14, "14 categories");
  // None may claim to be bookable now — no provider is connected.
  for (const s of SERVICE_CATEGORIES) {
    assert.notEqual(s.connection, "connected", `${s.id} must not falsely claim instant booking`);
  }
  assert.ok(getServiceCategory("restaurants")?.hasIntake, "restaurants has a structured intake");
});

test("connection labels never overstate availability", () => {
  assert.equal(connectionLabel("concierge"), "Concierge assisted");
  assert.equal(connectionLabel("coming_soon"), "Coming soon");
  assert.equal(connectionLabel("not_connected"), "Not yet available");
});

test("submitted status carries the exact honest wording", () => {
  assert.equal(
    RESERVATION_STATUS.REQUEST_SUBMITTED.description,
    "Concierge request submitted — reservation not yet confirmed.",
  );
  assert.equal(RESERVATION_STATUS.REQUEST_SUBMITTED.showsConfirmation, false, "no confirmation number before it's real");
});

test("a member can NEVER move a reservation to Confirmed themselves", () => {
  const all: ReservationStatus[] = Object.keys(RESERVATION_STATUS) as ReservationStatus[];
  for (const from of all) {
    assert.ok(!clientCanTransition(from, "CONFIRMED"), `client must not self-confirm from ${from}`);
  }
});

test("confirmation number only shows in real/settled states", () => {
  assert.ok(RESERVATION_STATUS.CONFIRMED.showsConfirmation);
  assert.ok(RESERVATION_STATUS.COMPLETED.showsConfirmation);
  assert.ok(!RESERVATION_STATUS.CONCIERGE_REVIEWING.showsConfirmation);
  assert.ok(!RESERVATION_STATUS.AWAITING_PROVIDER.showsConfirmation);
});

test("clients can cancel while pending but a cancelled/completed request is terminal", () => {
  assert.ok(clientCanCancel("REQUEST_SUBMITTED"));
  assert.ok(clientCanCancel("CONFIRMED"), "cancel-request is allowed (subject to provider policy)");
  assert.ok(!clientCanCancel("CANCELLED"));
  assert.ok(!clientCanCancel("COMPLETED"));
  assert.ok(RESERVATION_STATUS.CANCELLED.terminal && RESERVATION_STATUS.COMPLETED.terminal);
});

test("restaurant intake captures every field the concierge needs", () => {
  const keys = RESTAURANT_INTAKE.map((f) => f.key);
  for (const k of ["city", "date", "time", "guests", "cuisine", "priceRange", "seating", "dietary", "accessibility", "occasion", "flexible", "notes"]) {
    assert.ok(keys.includes(k), `intake includes ${k}`);
  }
  assert.equal(RESTAURANT_INTAKE.find((f) => f.key === "city")?.required, true, "city is required");
  assert.equal(intakeFor("restaurants"), RESTAURANT_INTAKE, "restaurants → restaurant intake");
  assert.ok(intakeFor("flights").length > 0, "other services fall back to the custom intake");
});
