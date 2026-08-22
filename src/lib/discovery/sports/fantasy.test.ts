import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STANDARD_LINEUP_SLOTS,
  isEligibleForSlot,
  snakeDraftOrder,
  teamOnTheClock,
  isDraftComplete,
  draftPickLabel,
  applyLineupChange,
  hasCompleteStartingLineup,
  generateLeagueInviteCode,
  computeFantasyPoints,
  computeDefensePoints,
  generateRoundRobinSchedule,
  computeFantasyStandings,
  initialWaiverOrder,
  resolveWaiverClaims,
  isValidTradeProposal,
  type RosterPlayer,
  type PlayerWeekStats,
  type DefenseWeekStats,
} from "./fantasy";

test("isEligibleForSlot: exact-position slots only accept their own position", () => {
  assert.equal(isEligibleForSlot("QB", "QB"), true);
  assert.equal(isEligibleForSlot("RB", "QB"), false);
  assert.equal(isEligibleForSlot("K", "K"), true);
});

test("isEligibleForSlot: FLEX accepts RB/WR/TE but not QB/K/DST", () => {
  assert.equal(isEligibleForSlot("RB", "FLEX"), true);
  assert.equal(isEligibleForSlot("WR", "FLEX"), true);
  assert.equal(isEligibleForSlot("TE", "FLEX"), true);
  assert.equal(isEligibleForSlot("QB", "FLEX"), false);
  assert.equal(isEligibleForSlot("K", "FLEX"), false);
});

test("isEligibleForSlot: DST slot accepts both real provider labels DST and DEF", () => {
  assert.equal(isEligibleForSlot("DST", "DST"), true);
  assert.equal(isEligibleForSlot("DEF", "DST"), true);
});

test("isEligibleForSlot: BENCH accepts any position", () => {
  assert.equal(isEligibleForSlot("QB", "BENCH"), true);
  assert.equal(isEligibleForSlot("K", "BENCH"), true);
});

test("snakeDraftOrder: round 1 forward, round 2 reversed, round 3 forward again", () => {
  const order = snakeDraftOrder(["a", "b", "c"], 3);
  assert.deepEqual(order, ["a", "b", "c", "c", "b", "a", "a", "b", "c"]);
});

test("teamOnTheClock / isDraftComplete: tracks whose turn it is and when the draft ends", () => {
  const order = snakeDraftOrder(["a", "b"], 2); // [a,b,b,a]
  assert.equal(teamOnTheClock(order, 0), "a");
  assert.equal(teamOnTheClock(order, 2), "b");
  assert.equal(isDraftComplete(order, 3), false);
  assert.equal(teamOnTheClock(order, 4), null);
  assert.equal(isDraftComplete(order, 4), true);
});

test("draftPickLabel: converts a flat pick index into Round/Pick-in-round for a 4-team league", () => {
  assert.deepEqual(draftPickLabel(0, 4), { round: 1, pickInRound: 1 });
  assert.deepEqual(draftPickLabel(3, 4), { round: 1, pickInRound: 4 });
  assert.deepEqual(draftPickLabel(4, 4), { round: 2, pickInRound: 1 });
});

function roster(): RosterPlayer[] {
  return [
    { playerId: "qb1", position: "QB", lineupSlot: "QB" },
    { playerId: "rb1", position: "RB", lineupSlot: "BENCH" },
    { playerId: "rb2", position: "RB", lineupSlot: "RB" },
  ];
}

test("applyLineupChange: moving a bench player into an empty slot just fills it", () => {
  const next = applyLineupChange(roster(), "rb1", "FLEX");
  assert.ok(next);
  assert.equal(next!.find((p) => p.playerId === "rb1")!.lineupSlot, "FLEX");
});

test("applyLineupChange: moving a player into an occupied slot swaps the two players' slots", () => {
  const next = applyLineupChange(roster(), "rb1", "RB");
  assert.ok(next);
  assert.equal(next!.find((p) => p.playerId === "rb1")!.lineupSlot, "RB");
  assert.equal(next!.find((p) => p.playerId === "rb2")!.lineupSlot, "BENCH");
});

test("applyLineupChange: refuses an ineligible position/slot combination", () => {
  const next = applyLineupChange(roster(), "qb1", "RB");
  assert.equal(next, null);
});

test("applyLineupChange: a player id not on the roster returns null", () => {
  const next = applyLineupChange(roster(), "nobody", "BENCH");
  assert.equal(next, null);
});

test("hasCompleteStartingLineup: false until every starting slot (including duplicates like RB/RB) is filled", () => {
  const partial: RosterPlayer[] = [
    { playerId: "qb1", position: "QB", lineupSlot: "QB" },
    { playerId: "rb1", position: "RB", lineupSlot: "RB" },
  ];
  assert.equal(hasCompleteStartingLineup(partial, STANDARD_LINEUP_SLOTS), false);

  const full: RosterPlayer[] = [
    { playerId: "qb1", position: "QB", lineupSlot: "QB" },
    { playerId: "rb1", position: "RB", lineupSlot: "RB" },
    { playerId: "rb2", position: "RB", lineupSlot: "RB" },
    { playerId: "wr1", position: "WR", lineupSlot: "WR" },
    { playerId: "wr2", position: "WR", lineupSlot: "WR" },
    { playerId: "te1", position: "TE", lineupSlot: "TE" },
    { playerId: "rb3", position: "RB", lineupSlot: "FLEX" },
    { playerId: "dst1", position: "DST", lineupSlot: "DST" },
    { playerId: "k1", position: "K", lineupSlot: "K" },
  ];
  assert.equal(hasCompleteStartingLineup(full, STANDARD_LINEUP_SLOTS), true);
});

test("generateLeagueInviteCode: 6 unambiguous characters, deterministic with an injected random source", () => {
  const code = generateLeagueInviteCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(generateLeagueInviteCode(() => 0), "AAAAAA");
});

function zeroStats(): PlayerWeekStats {
  return { passingYards: 0, passingTouchdowns: 0, passingInterceptions: 0, rushingYards: 0, rushingTouchdowns: 0, receptions: 0, receivingYards: 0, receivingTouchdowns: 0, fumblesLost: 0, fieldGoalsMade: 0, extraPointsMade: 0 };
}

test("computeFantasyPoints: a real, verified statline scores correctly under standard (non-PPR) rules", () => {
  // 300 passing yards, 3 passing TDs, 1 INT, 20 rushing yards -> 12 + 12 - 2 + 2 = 24
  const s: PlayerWeekStats = { ...zeroStats(), passingYards: 300, passingTouchdowns: 3, passingInterceptions: 1, rushingYards: 20 };
  assert.equal(computeFantasyPoints(s), 24);
});

test("computeFantasyPoints: receptions alone score nothing under standard (non-PPR) rules", () => {
  const s: PlayerWeekStats = { ...zeroStats(), receptions: 10, receivingYards: 0 };
  assert.equal(computeFantasyPoints(s), 0);
});

test("computeFantasyPoints: a receiving TD plus yardage plus a lost fumble", () => {
  // 50 receiving yards (5) + 1 receiving TD (6) - 1 fumble lost (-2) = 9
  const s: PlayerWeekStats = { ...zeroStats(), receivingYards: 50, receivingTouchdowns: 1, fumblesLost: 1 };
  assert.equal(computeFantasyPoints(s), 9);
});

test("computeFantasyPoints: kicking — field goals and extra points made", () => {
  const s: PlayerWeekStats = { ...zeroStats(), fieldGoalsMade: 2, extraPointsMade: 3 };
  assert.equal(computeFantasyPoints(s), 9); // 2*3 + 3*1
});

test("computeDefensePoints: sacks/INT/fumble recoveries/TD/safety plus a shutout points-allowed tier", () => {
  const s: DefenseWeekStats = { sacks: 3, interceptions: 2, fumblesRecovered: 1, touchdownsScored: 1, pointsAllowed: 0, safeties: 1 };
  // 3*1 + 2*2 + 1*2 + 1*6 + 1*2 + 10 (shutout) = 27
  assert.equal(computeDefensePoints(s), 27);
});

test("computeDefensePoints: points-allowed tiers score progressively worse as the defense allows more", () => {
  const base: DefenseWeekStats = { sacks: 0, interceptions: 0, fumblesRecovered: 0, touchdownsScored: 0, safeties: 0, pointsAllowed: 0 };
  assert.equal(computeDefensePoints({ ...base, pointsAllowed: 0 }), 10);
  assert.equal(computeDefensePoints({ ...base, pointsAllowed: 6 }), 7);
  assert.equal(computeDefensePoints({ ...base, pointsAllowed: 20 }), 1);
  assert.equal(computeDefensePoints({ ...base, pointsAllowed: 35 }), -4);
});

test("generateRoundRobinSchedule: every team plays every other team exactly once across a full cycle (4 teams, 3 weeks)", () => {
  const teams = ["a", "b", "c", "d"];
  const schedule = generateRoundRobinSchedule(teams, 3);
  assert.equal(schedule.length, 6); // 3 weeks * 2 games/week
  const seenPairs = new Set(schedule.map((g) => [g.homeTeamId, g.awayTeamId].sort().join("-")));
  assert.equal(seenPairs.size, 6); // C(4,2) = 6 unique pairings, no repeats within one cycle
  for (const team of teams) {
    const gamesPlayed = schedule.filter((g) => g.homeTeamId === team || g.awayTeamId === team);
    assert.equal(gamesPlayed.length, 3); // each team plays all 3 others exactly once
  }
});

test("generateRoundRobinSchedule: an odd team count gives everyone a real bye each round rather than a fabricated opponent", () => {
  const teams = ["a", "b", "c"];
  const schedule = generateRoundRobinSchedule(teams, 3);
  // 3 teams -> 1 game per week (one team byes) -> 3 games across 3 weeks
  assert.equal(schedule.length, 3);
  for (let week = 1; week <= 3; week++) {
    assert.equal(schedule.filter((g) => g.week === week).length, 1);
  }
});

test("generateRoundRobinSchedule: fewer than 2 teams or fewer than 1 week produces no schedule", () => {
  assert.deepEqual(generateRoundRobinSchedule(["a"], 5), []);
  assert.deepEqual(generateRoundRobinSchedule(["a", "b"], 0), []);
});

test("computeFantasyStandings: ranks by wins, then by total points scored on a tie", () => {
  const results = [
    { week: 1, homeTeamId: "a", awayTeamId: "b", homeScore: 100, awayScore: 90, final: true },
    { week: 1, homeTeamId: "c", awayTeamId: "d", homeScore: 80, awayScore: 120, final: true },
    { week: 2, homeTeamId: "a", awayTeamId: "c", homeScore: 95, awayScore: 60, final: true },
    { week: 2, homeTeamId: "b", awayTeamId: "d", homeScore: 70, awayScore: 130, final: true },
  ];
  // a: 2-0, 195 pts. d: 2-0, 250 pts. b: 0-2, 160 pts. c: 0-2, 140 pts.
  // a and d are both 2-0, but d outscores a, so d ranks first on the tiebreaker.
  const standings = computeFantasyStandings(["a", "b", "c", "d"], results);
  assert.equal(standings[0].teamId, "d");
  assert.equal(standings[0].wins, 2);
  assert.equal(standings[1].teamId, "a");
  assert.equal(standings[1].wins, 2);
  assert.equal(standings[2].teamId, "b"); // 0-2, but outscores c
  assert.equal(standings[3].teamId, "c");
});

test("computeFantasyStandings: a live (non-final) matchup's score still accrues into points for/against, but not into W/L", () => {
  const results = [{ week: 3, homeTeamId: "a", awayTeamId: "b", homeScore: 40, awayScore: 35, final: false }];
  const standings = computeFantasyStandings(["a", "b"], results);
  const a = standings.find((s) => s.teamId === "a")!;
  assert.equal(a.wins, 0);
  assert.equal(a.pointsFor, 40);
});

test("computeFantasyStandings: an equal final score is a real tie, not a fabricated winner", () => {
  const results = [{ week: 1, homeTeamId: "a", awayTeamId: "b", homeScore: 100, awayScore: 100, final: true }];
  const standings = computeFantasyStandings(["a", "b"], results);
  assert.equal(standings.find((s) => s.teamId === "a")!.ties, 1);
  assert.equal(standings.find((s) => s.teamId === "a")!.wins, 0);
});

test("initialWaiverOrder: worst record picks first, ties broken by fewer points scored", () => {
  const standings = [
    { teamId: "a", wins: 3, losses: 1, ties: 0, pointsFor: 400, pointsAgainst: 300, rank: 1 },
    { teamId: "b", wins: 1, losses: 3, ties: 0, pointsFor: 350, pointsAgainst: 400, rank: 2 },
    { teamId: "c", wins: 1, losses: 3, ties: 0, pointsFor: 300, pointsAgainst: 420, rank: 3 },
  ];
  assert.deepEqual(initialWaiverOrder(standings), ["c", "b", "a"]);
});

test("resolveWaiverClaims: the top-priority claimant on a contested player wins; everyone else loses that claim", () => {
  const order = ["team1", "team2", "team3"];
  const claims = [
    { id: "claim-a", teamId: "team2", playerId: "playerX" },
    { id: "claim-b", teamId: "team1", playerId: "playerX" },
    { id: "claim-c", teamId: "team3", playerId: "playerX" },
  ];
  const result = resolveWaiverClaims(order, claims);
  assert.deepEqual(result.wonClaimIds, ["claim-b"]);
  assert.deepEqual(result.lostClaimIds.sort(), ["claim-a", "claim-c"]);
  // team1 won, so it drops to the back of the order.
  assert.deepEqual(result.newPriorityOrder, ["team2", "team3", "team1"]);
});

test("resolveWaiverClaims: uncontested claims on different players can each win, processed in priority order", () => {
  const order = ["team1", "team2", "team3"];
  const claims = [
    { id: "claim-a", teamId: "team2", playerId: "playerY" },
    { id: "claim-b", teamId: "team1", playerId: "playerX" },
  ];
  const result = resolveWaiverClaims(order, claims);
  assert.deepEqual(result.wonClaimIds.sort(), ["claim-a", "claim-b"]);
  assert.deepEqual(result.lostClaimIds, []);
  // team1 (highest priority) processes first and drops to the back; team2 then wins uncontested and also drops back.
  assert.deepEqual(result.newPriorityOrder, ["team3", "team1", "team2"]);
});

test("resolveWaiverClaims: no claims leaves the priority order untouched", () => {
  const order = ["a", "b"];
  const result = resolveWaiverClaims(order, []);
  assert.deepEqual(result, { wonClaimIds: [], lostClaimIds: [], newPriorityOrder: ["a", "b"] });
});

test("isValidTradeProposal: a real, legal trade where each side actually rosters what they're offering", () => {
  const ok = isValidTradeProposal(["p1", "p2"], ["p3", "p4"], ["p1"], ["p3"]);
  assert.equal(ok, true);
});

test("isValidTradeProposal: rejects a side offering a player they don't actually roster", () => {
  const bad = isValidTradeProposal(["p1", "p2"], ["p3", "p4"], ["p9"], ["p3"]);
  assert.equal(bad, false);
});

test("isValidTradeProposal: rejects an empty offer on either side", () => {
  assert.equal(isValidTradeProposal(["p1"], ["p3"], [], ["p3"]), false);
  assert.equal(isValidTradeProposal(["p1"], ["p3"], ["p1"], []), false);
});

test("isValidTradeProposal: rejects the same player listed twice on one side", () => {
  assert.equal(isValidTradeProposal(["p1", "p2"], ["p3"], ["p1", "p1"], ["p3"]), false);
});
