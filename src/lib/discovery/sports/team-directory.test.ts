import { test } from "node:test";
import assert from "node:assert/strict";
import { getVerifiedStandingsFallback, hasVerifiedReference } from "./team-directory";
import type { SportsStanding } from "../providers/sports";

test("hasVerifiedReference: true only for sports with a real, hardcoded conference/division reference", () => {
  assert.equal(hasVerifiedReference("nba"), true);
  assert.equal(hasVerifiedReference("nfl"), true);
  assert.equal(hasVerifiedReference("mlb"), false);
  assert.equal(hasVerifiedReference("soccer"), false);
});

test("getVerifiedStandingsFallback: a sport with no verified reference returns the live rows unchanged", async () => {
  const live: SportsStanding[] = [{ team: { id: "1", name: "Some Team" }, wins: 3, losses: 1 }];
  assert.equal(await getVerifiedStandingsFallback("mlb", live, true), live);
});

test("getVerifiedStandingsFallback: live data already covering the full real league is returned unchanged (no need to fall back)", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    // 32 real NFL teams already present — same length as NFL_DIVISIONS.
    const live: SportsStanding[] = Array.from({ length: 32 }, (_, i) => ({ team: { id: String(i), name: `Team ${i}` }, wins: 1, losses: 0 }));
    const result = await getVerifiedStandingsFallback("nfl", live, false);
    assert.equal(result, live);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getVerifiedStandingsFallback: NFL empty provider response — every real team appears, corroborated 0-0 when the season is confirmed not started", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await getVerifiedStandingsFallback("nfl", [], true);
    assert.equal(result.length, 32);
    const patriots = result.find((r) => r.team.name === "New England Patriots");
    assert.equal(patriots?.wins, 0);
    assert.equal(patriots?.losses, 0);
    assert.equal(patriots?.group, "AFC");
    assert.equal(patriots?.division, "AFC East");
    const cowboys = result.find((r) => r.team.name === "Dallas Cowboys");
    assert.equal(cowboys?.group, "NFC");
    assert.equal(cowboys?.division, "NFC East");
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getVerifiedStandingsFallback: NFL empty provider response mid-season (not corroborated as pre-start) leaves records as an honest gap, never a fabricated 0-0", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await getVerifiedStandingsFallback("nfl", [], false);
    assert.equal(result.length, 32);
    for (const row of result) {
      assert.equal(row.wins, undefined);
      assert.equal(row.losses, undefined);
    }
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getVerifiedStandingsFallback: a real live record for one team is preserved verbatim; unresolved teammates still get the corroborated 0-0", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const live: SportsStanding[] = [{ team: { id: "21", name: "New England Patriots", logoUrl: "https://x/ne.png" }, wins: 4, losses: 2 }];
    const result = await getVerifiedStandingsFallback("nfl", live, true);
    assert.equal(result.length, 32);
    const patriots = result.find((r) => r.team.name === "New England Patriots");
    assert.equal(patriots?.wins, 4);
    assert.equal(patriots?.losses, 2);
    assert.equal(patriots?.team.logoUrl, "https://x/ne.png");
    const jets = result.find((r) => r.team.name === "New York Jets");
    assert.equal(jets?.wins, 0);
    assert.equal(jets?.losses, 0);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});
