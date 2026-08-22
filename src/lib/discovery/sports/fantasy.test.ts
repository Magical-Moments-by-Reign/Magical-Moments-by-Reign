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
  type RosterPlayer,
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
