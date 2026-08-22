import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeClinchStatus,
  remainingGamesForSport,
  computePostseasonPicture,
  projectNflConferenceSeeds,
} from "./postseason";

test("computeClinchStatus clinches a team with an insurmountable lead", () => {
  const standings = [
    { teamId: "a", wins: 14 },
    { teamId: "b", wins: 3 },
    { teamId: "c", wins: 2 },
    { teamId: "d", wins: 1 },
  ];
  // Everyone has 0 games left — nobody can pass "a", so it's clinched into a 1-spot field.
  const remaining = new Map([["a", 0], ["b", 0], ["c", 0], ["d", 0]]);
  const result = computeClinchStatus(standings, remaining, 1);
  assert.equal(result.find((r) => r.teamId === "a")?.clinched, true);
});

test("computeClinchStatus eliminates a team mathematically out of reach", () => {
  const standings = [
    { teamId: "a", wins: 14 },
    { teamId: "b", wins: 13 },
    { teamId: "c", wins: 2 },
  ];
  const remaining = new Map([["a", 0], ["b", 0], ["c", 3]]);
  // Even winning out (2+3=5), "c" can't catch "a" or "b" for a 2-spot field.
  const result = computeClinchStatus(standings, remaining, 2);
  assert.equal(result.find((r) => r.teamId === "c")?.eliminated, true);
});

test("computeClinchStatus never mislabels a genuinely contested race", () => {
  const standings = [
    { teamId: "a", wins: 10 },
    { teamId: "b", wins: 9 },
    { teamId: "c", wins: 8 },
  ];
  const remaining = new Map([["a", 3], ["b", 3], ["c", 3]]);
  const result = computeClinchStatus(standings, remaining, 2);
  for (const r of result) {
    assert.equal(r.clinched, false);
    assert.equal(r.eliminated, false);
  }
});

test("remainingGamesForSport uses the real fixed season length for pro leagues", () => {
  assert.equal(remainingGamesForSport("nfl", 10, 5), 2);
  assert.equal(remainingGamesForSport("nba", 40, 30), 12);
  assert.equal(remainingGamesForSport("nhl", 50, 20, 5), 7);
});

test("remainingGamesForSport never clamps below zero", () => {
  assert.equal(remainingGamesForSport("nfl", 17, 0), 0);
});

test("remainingGamesForSport returns null for college sports — no fixed real schedule length", () => {
  assert.equal(remainingGamesForSport("ncaaf", 8, 2), null);
  assert.equal(remainingGamesForSport("ncaab", 20, 5), null);
});

test("computePostseasonPicture ranks by wins and marks the top playoffSpots as in the field", () => {
  const teams = [
    { teamId: "a", wins: 12, losses: 2 },
    { teamId: "b", wins: 10, losses: 4 },
    { teamId: "c", wins: 8, losses: 6 },
    { teamId: "d", wins: 4, losses: 10 },
  ];
  const result = computePostseasonPicture("nba", teams, 3);
  assert.deepEqual(result.map((r) => r.teamId), ["a", "b", "c", "d"]);
  assert.deepEqual(result.map((r) => r.inField), [true, true, true, false]);
});

test("projectNflConferenceSeeds gives every division leader priority over wild cards, real-rule-accurate", () => {
  const teams = [
    { teamId: "east-leader", wins: 8, losses: 8, division: "AFC East" },
    { teamId: "east-non-leader", wins: 4, losses: 12, division: "AFC East" },
    { teamId: "north-leader", wins: 13, losses: 3, division: "AFC North" },
    { teamId: "south-leader", wins: 9, losses: 7, division: "AFC South" },
    { teamId: "west-leader", wins: 7, losses: 9, division: "AFC West" },
    { teamId: "wc1", wins: 12, losses: 4, division: "AFC North" }, // best record in the whole conference, but not a division leader — north-leader is better
    { teamId: "wc2", wins: 6, losses: 10, division: "AFC South" },
  ];
  const seeds = projectNflConferenceSeeds(teams);
  const winner = seeds.find((s) => s.teamId === "east-leader");
  const bestNonLeader = seeds.find((s) => s.teamId === "wc1");
  assert.equal(winner?.isDivisionWinner, true);
  assert.ok((winner?.seed ?? 99) <= 4, "every division winner gets a top-4 seed");
  assert.equal(bestNonLeader?.isDivisionWinner, false);
  assert.ok((bestNonLeader?.seed ?? 0) >= 5, "a non-division-winner never outranks a division winner, even with a better record");
});

test("projectNflConferenceSeeds returns exactly 7 seeds (4 division winners + 3 wild cards) from a full conference", () => {
  const divisions = ["AFC East", "AFC North", "AFC South", "AFC West"];
  const teams = divisions.flatMap((division, di) =>
    Array.from({ length: 4 }, (_, ti) => ({ teamId: `${division}-${ti}`, wins: 16 - di * 4 - ti, losses: ti, division }))
  );
  const seeds = projectNflConferenceSeeds(teams);
  assert.equal(seeds.length, 7);
  assert.equal(seeds.filter((s) => s.isDivisionWinner).length, 4);
  assert.equal(seeds.filter((s) => !s.isDivisionWinner).length, 3);
  assert.deepEqual(seeds.map((s) => s.seed), [1, 2, 3, 4, 5, 6, 7]);
});
