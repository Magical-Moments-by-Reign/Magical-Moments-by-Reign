// Unit tests for the Life Estate framework (pure config + registry).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { getEstate, isEstate, allEstates } from "./registry.ts";
import { liveModules, moduleOf } from "./types.ts";

test("home estate is registered and resolvable", () => {
  assert.equal(isEstate("home"), true);
  const home = getEstate("home");
  assert.ok(home);
  assert.equal(home?.key, "home");
  assert.equal(home?.name, "Home");
});

test("unknown estate resolves to null (not launched yet)", () => {
  assert.equal(getEstate("atlantis"), null);
  assert.equal(isEstate("atlantis"), false);
});

test("home config carries the housing journeys and stages", () => {
  const home = getEstate("home")!;
  assert.ok(home.goals.length >= 8, "expected the full set of housing goals");
  assert.ok(home.stages.length >= 3, "expected a stage ladder");
  // Goals cover the major groups.
  const groups = new Set(home.goals.map((g) => g.group));
  for (const g of ["Buying", "Building", "Renting", "Selling", "Owning", "Investing"]) {
    assert.ok(groups.has(g), `expected goal group ${g}`);
  }
});

test("module status is honest: Learn is live, others are soon (this increment)", () => {
  const home = getEstate("home")!;
  assert.equal(moduleOf(home, "learn")?.status, "live");
  const live = liveModules(home).map((m) => m.key);
  assert.deepEqual(live, ["learn"], "only Learn should be live right now");
});

test("home exposes real learning topics with neutral summaries", () => {
  const home = getEstate("home")!;
  assert.ok(home.learningTopics.length >= 6);
  for (const t of home.learningTopics) {
    assert.ok(t.title.length > 0 && t.summary.length > 0);
  }
});

test("home lobby exposes elegant destination doors with icons", () => {
  const home = getEstate("home")!;
  assert.ok(home.destinations.length >= 6, "expected a lobby of destinations");
  for (const d of home.destinations) {
    assert.ok(d.title.length > 0, "destination has a title");
    assert.ok(d.tagline.length > 0, "destination has a tagline");
    assert.ok(d.icon.length > 0, "destination names a champagne line-icon");
  }
});

test("allEstates includes home", () => {
  assert.ok(allEstates().some((e) => e.key === "home"));
});
