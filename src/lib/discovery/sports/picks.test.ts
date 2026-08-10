import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeGamePicks, summarizePicks, tallyVotes, isPickLocked } from "./picks";

test("gradeGamePicks returns null until the game is final with real scores", () => {
  assert.equal(gradeGamePicks({ status: "live", homeScore: 10, awayScore: 7 }, []), null);
  assert.equal(gradeGamePicks({ status: "final", homeScore: null, awayScore: 7 }, []), null);
});

test("gradeGamePicks grades correctly against the winning side", () => {
  const result = gradeGamePicks(
    { status: "final", homeScore: 24, awayScore: 17 },
    [{ id: "p1", teamPick: "home" }, { id: "p2", teamPick: "away" }]
  );
  assert.deepEqual(result, [{ id: "p1", isCorrect: true }, { id: "p2", isCorrect: false }]);
});

test("gradeGamePicks grades every pick incorrect on a tie", () => {
  const result = gradeGamePicks(
    { status: "final", homeScore: 1, awayScore: 1 },
    [{ id: "p1", teamPick: "home" }, { id: "p2", teamPick: "away" }]
  );
  assert.deepEqual(result, [{ id: "p1", isCorrect: false }, { id: "p2", isCorrect: false }]);
});

test("summarizePicks computes accuracy and current/longest streak from graded picks only", () => {
  const picks = [
    { gameId: "g1", sport: "nfl", isCorrect: true, gameStartsAt: new Date("2026-01-01") },
    { gameId: "g2", sport: "nfl", isCorrect: true, gameStartsAt: new Date("2026-01-02") },
    { gameId: "g3", sport: "nfl", isCorrect: false, gameStartsAt: new Date("2026-01-03") },
    { gameId: "g4", sport: "nba", isCorrect: true, gameStartsAt: new Date("2026-01-04") },
    { gameId: "g5", sport: "nba", isCorrect: null, gameStartsAt: new Date("2026-01-05") },
  ];
  const summary = summarizePicks(picks);
  assert.equal(summary.total, 4);
  assert.equal(summary.correct, 3);
  assert.equal(summary.incorrect, 1);
  assert.equal(summary.accuracyPct, 75);
  assert.equal(summary.currentStreak, 1);
  assert.equal(summary.longestStreak, 2);
  assert.equal(summary.bySport.nfl.total, 3);
  assert.equal(summary.bySport.nba.accuracyPct, 100);
});

test("tallyVotes counts from stored picks, never fabricated odds", () => {
  const tally = tallyVotes([{ teamPick: "home" }, { teamPick: "home" }, { teamPick: "away" }]);
  assert.deepEqual(tally, { home: 2, away: 1, total: 3, homePct: 67, awayPct: 33 });
});

test("tallyVotes handles zero votes without dividing by zero", () => {
  assert.deepEqual(tallyVotes([]), { home: 0, away: 0, total: 0, homePct: 0, awayPct: 0 });
});

test("isPickLocked locks once the game is no longer scheduled", () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);
  assert.equal(isPickLocked({ status: "scheduled", locksAt: null, startsAt: future }), false);
  assert.equal(isPickLocked({ status: "live", locksAt: null, startsAt: past }), true);
  assert.equal(isPickLocked({ status: "scheduled", locksAt: past, startsAt: future }), true);
});
