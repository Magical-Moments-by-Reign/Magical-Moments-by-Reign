import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonParam, detectPlanRestriction } from "./sports";

test("seasonParam: NBA/NHL use split-year seasons, keyed off an August season start", () => {
  assert.equal(seasonParam("nba", "2026-01-15"), "2025-2026");
  assert.equal(seasonParam("nhl", "2026-01-15"), "2025-2026");
  assert.equal(seasonParam("nba", "2026-11-01"), "2026-2027");
  assert.equal(seasonParam("nba", "2026-08-01"), "2026-2027");
  assert.equal(seasonParam("nba", "2026-07-31"), "2025-2026");
});

test("seasonParam: every other sport uses a plain single-year season", () => {
  assert.equal(seasonParam("nfl", "2026-01-15"), "2026");
  assert.equal(seasonParam("mlb", "2026-06-01"), "2026");
  assert.equal(seasonParam("soccer", "2026-11-01"), "2026");
});

test("detectPlanRestriction: finds a Free-plan date-restriction message under errors.plan", () => {
  const json = { get: "games", errors: { plan: "Error/Free plan, You can't access this date, try a date between 2021-08-01 and 2023-06-24." }, results: 0, response: [] };
  assert.match(detectPlanRestriction(json) ?? "", /Free plan/);
});

test("detectPlanRestriction: also finds it when errors is an array of strings", () => {
  const json = { errors: ["Error/Free plan, you don't have access to this date."], response: [] };
  assert.match(detectPlanRestriction(json) ?? "", /don't have access/);
});

test("detectPlanRestriction: returns null when errors is absent or empty (real success/empty response)", () => {
  assert.equal(detectPlanRestriction({ errors: [], response: [] }), null);
  assert.equal(detectPlanRestriction({ errors: {}, response: [] }), null);
  assert.equal(detectPlanRestriction({ response: [] }), null);
  assert.equal(detectPlanRestriction(null), null);
});

test("detectPlanRestriction: a non-plan error (bad params, rate limit) is not mistaken for a plan restriction", () => {
  const json = { errors: { requests: "Too many requests per minute" }, response: [] };
  assert.equal(detectPlanRestriction(json), null);
});
