// Unit tests for the Magical Moments Ecosystem integrations registry.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTEGRATION_GROUPS, INTEGRATION_CATEGORIES, integrationCategory, categoriesInGroup,
  registerIntegrationProvider, providersFor, integrationState,
  suggestionsForOccasion, whatDoINeedNext,
  CUSTOMER_PROMISE, ECOSYSTEM_FEELING, ECOSYSTEM_VALUES,
} from "./integrations.ts";

test("catalog covers the ecosystem groups and many categories", () => {
  assert.equal(INTEGRATION_GROUPS.length, 8);
  assert.ok(INTEGRATION_CATEGORIES.length >= 25);
  for (const id of ["amazon_registry", "travel_booking", "cake_ordering", "live_streaming", "mortgage_resources", "payments", "sms"]) {
    assert.ok(integrationCategory(id), `missing ${id}`);
  }
});
test("categories map to a known group", () => {
  const groupIds = new Set(INTEGRATION_GROUPS.map((g) => g.id));
  for (const cat of INTEGRATION_CATEGORIES) assert.ok(groupIds.has(cat.group));
  assert.ok(categoriesInGroup("travel_stay").some((x) => x.id === "hotels"));
});

test("no provider registered → external categories are coming_soon, guided ones are guided", () => {
  assert.equal(integrationState("travel_booking"), "coming_soon"); // needs a provider, none yet
  assert.equal(integrationState("mortgage_resources"), "guided");  // guided/educational, no provider needed
  assert.equal(integrationState("payments"), "guided");            // native seam, needsProvider false
  assert.equal(providersFor("travel_booking").length, 0);          // never invents a provider
});

test("registering an available provider flips a category to connected", () => {
  registerIntegrationProvider({ id: "test_hotels", categoryId: "hotels", name: "Test Hotels", isAvailable: () => true });
  assert.equal(integrationState("hotels"), "connected");
  assert.equal(providersFor("hotels")[0].name, "Test Hotels");
});
test("an unavailable provider does not count as connected", () => {
  registerIntegrationProvider({ id: "off_flights", categoryId: "flights", name: "Off", isAvailable: () => false });
  assert.equal(integrationState("flights"), "coming_soon");
  assert.equal(providersFor("flights").length, 0);
});

test("occasion suggestions are relevant and ordered", () => {
  const wedding = suggestionsForOccasion("wedding").map((c) => c.id);
  assert.ok(wedding.includes("amazon_registry"));
  assert.ok(wedding.includes("hotels"));
  assert.equal(wedding[0], "invitation_printing");
  const vacation = suggestionsForOccasion("vacation").map((c) => c.id);
  assert.ok(vacation.includes("flights") && vacation.includes("car_rentals"));
});
test("unknown occasion falls back to sensible defaults", () => {
  const d = suggestionsForOccasion("totally_unknown").map((c) => c.id);
  assert.ok(d.length > 0);
  assert.ok(d.includes("photography"));
});
test("what-do-I-need-next skips completed items and respects the limit", () => {
  const next = whatDoINeedNext("wedding", ["invitation_printing", "amazon_registry"], 3);
  assert.equal(next.length, 3);
  assert.ok(!next.some((c) => c.id === "invitation_printing"));
  assert.ok(!next.some((c) => c.id === "amazon_registry"));
});

test("brand feeling copy present", () => {
  assert.equal(CUSTOMER_PROMISE, "We've got you.");
  assert.ok(ECOSYSTEM_FEELING.includes("right here"));
  assert.deepEqual([...ECOSYSTEM_VALUES], ["Safe", "Simple", "Beautiful", "Trusted"]);
});
