import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonParam } from "./sports";

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
