import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_CATEGORIES,
  getServiceCategory,
  connectionLabel,
  pathsFor,
  RESERVATION_STATUS,
  clientCanTransition,
  clientCanCancel,
  intakeFor,
  RESTAURANT_HELP,
  RESTAURANT_SEARCH,
  RESTAURANT_FILTERS,
  type ReservationStatus,
} from "./catalog";

test("all 15 branded services are present and honestly labeled", () => {
  assert.equal(SERVICE_CATEGORIES.length, 15, "15 branded services");
  for (const s of SERVICE_CATEGORIES) {
    assert.notEqual(s.connection, "connected", `${s.id} must not falsely claim it's connected`);
    assert.ok(s.brandedLabel.startsWith("Magical Moments "), `${s.id} carries the Magical Moments brand`);
  }
  assert.equal(getServiceCategory("restaurants")?.brandedLabel, "Magical Moments Restaurant Reservations");
});

test("connection labels never overstate availability", () => {
  assert.equal(connectionLabel("concierge"), "Concierge assisted");
  assert.equal(connectionLabel("coming_soon"), "Coming soon");
  assert.equal(connectionLabel("not_connected"), "Not yet available");
});

test("the client always chooses: every service offers help + concierge; searchable ones add search", () => {
  const restaurants = getServiceCategory("restaurants")!;
  assert.deepEqual(pathsFor(restaurants), ["search", "help", "concierge"]);
  const photography = getServiceCategory("photography")!;
  assert.deepEqual(pathsFor(photography), ["help", "concierge"], "non-searchable services never fake a search path");
});

test("submitted status carries the exact honest wording", () => {
  assert.equal(
    RESERVATION_STATUS.REQUEST_SUBMITTED.description,
    "Concierge request submitted — reservation not yet confirmed.",
  );
});

test("a member can NEVER move a reservation to Confirmed themselves", () => {
  const all: ReservationStatus[] = Object.keys(RESERVATION_STATUS) as ReservationStatus[];
  for (const from of all) {
    assert.ok(!clientCanTransition(from, "CONFIRMED"), `client must not self-confirm from ${from}`);
  }
});

test("clients can cancel while pending; cancelled/completed are terminal", () => {
  assert.ok(clientCanCancel("REQUEST_SUBMITTED"));
  assert.ok(clientCanCancel("CONFIRMED"));
  assert.ok(!clientCanCancel("CANCELLED"));
  assert.ok(!clientCanCancel("COMPLETED"));
});

test("restaurant intakes differ by path: quick search vs guided help", () => {
  assert.equal(intakeFor("restaurants", "search"), RESTAURANT_SEARCH);
  assert.equal(intakeFor("restaurants", "help"), RESTAURANT_HELP);
  const searchKeys = RESTAURANT_SEARCH.map((f) => f.key);
  assert.deepEqual(searchKeys, ["city", "date", "time", "guests"], "quick search asks the four basics");
  for (const k of ["occasion", "atmosphere", "cuisine", "budget", "dietary", "accessibility", "notes"]) {
    assert.ok(RESTAURANT_HELP.some((f) => f.key === k), `guided help asks ${k}`);
  }
  assert.equal(intakeFor("flights").length > 0, true);
  assert.equal(intakeFor("photography")[0].key, "title", "non-search services fall back to the custom intake");
});

test("restaurant filters cover cuisine, price, style, features, distance", () => {
  const ids = RESTAURANT_FILTERS.map((g) => g.id);
  assert.deepEqual(ids, ["cuisine", "price", "style", "features", "distance"]);
  assert.deepEqual(RESTAURANT_FILTERS.find((g) => g.id === "price")!.options, ["$", "$$", "$$$", "$$$$"]);
});
