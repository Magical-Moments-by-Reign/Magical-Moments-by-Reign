import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeClinchStatus,
  remainingGamesForSport,
  computePostseasonPicture,
  projectNflConferenceSeeds,
  projectMlbLeagueSeeds,
  projectNhlConferenceSeeds,
  projectNbaConferencePicture,
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

test("projectMlbLeagueSeeds gives every division winner priority, real 3+3 field", () => {
  const teams = [
    { teamId: "east-winner", wins: 99, losses: 63, division: "AL East" },
    { teamId: "wc-best", wins: 95, losses: 67, division: "AL East" }, // best record in the league among non-leaders, but not a division winner
    { teamId: "central-winner", wins: 85, losses: 77, division: "AL Central" },
    { teamId: "west-winner", wins: 92, losses: 70, division: "AL West" },
    { teamId: "east-third", wins: 70, losses: 92, division: "AL East" },
    { teamId: "wc2", wins: 84, losses: 78, division: "AL Central" },
    { teamId: "wc3", wins: 83, losses: 79, division: "AL West" },
  ];
  const seeds = projectMlbLeagueSeeds(teams);
  assert.equal(seeds.length, 6);
  assert.equal(seeds.filter((s) => s.isDivisionWinner).length, 3);
  const wcBest = seeds.find((s) => s.teamId === "wc-best");
  assert.equal(wcBest?.isDivisionWinner, false);
  assert.ok((wcBest?.seed ?? 0) >= 4, "the best non-division-winning record never outranks a division winner");
});

test("projectNhlConferenceSeeds guarantees the top 3 in EVERY division, not just the division leader", () => {
  const divisions = ["Metro", "Atlantic"];
  const teams = divisions.flatMap((division, di) =>
    Array.from({ length: 8 }, (_, ti) => ({ teamId: `${division}-${ti}`, wins: 50 - di * 8 - ti, losses: ti, division }))
  );
  const seeds = projectNhlConferenceSeeds(teams);
  // 3 per division x 2 divisions + 2 wild cards = 8 seeded teams
  assert.equal(seeds.length, 8);
  assert.equal(seeds.filter((s) => s.isTopThreeInDivision).length, 6);
  // Atlantic's #2 team (di=1, ti=1 -> wins 41) should make it on division
  // strength even though several Metro non-top-3 teams have better records.
  assert.ok(seeds.some((s) => s.teamId === "Atlantic-1" && s.isTopThreeInDivision));
});

test("projectNbaConferencePicture: seeds 1-6 direct, 7-10 play-in, 11+ outside", () => {
  const teams = Array.from({ length: 15 }, (_, i) => ({ teamId: `t${i}`, wins: 50 - i, losses: i }));
  const picture = projectNbaConferencePicture(teams);
  assert.equal(picture.filter((p) => p.status === "DIRECT_BERTH").length, 6);
  assert.equal(picture.filter((p) => p.status === "PLAY_IN").length, 4);
  assert.equal(picture.filter((p) => p.status === "OUTSIDE").length, 5);
  assert.equal(picture[0].status, "DIRECT_BERTH");
  assert.equal(picture[6].status, "PLAY_IN");
  assert.equal(picture[10].status, "OUTSIDE");
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
