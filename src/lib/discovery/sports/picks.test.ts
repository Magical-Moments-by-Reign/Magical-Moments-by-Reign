import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeGamePicks, summarizePicks, tallyVotes, isPickLocked, startOfWeek, gradeRacePicks, tallyRaceVotes, startOfMonth, startOfDay, leaderboardPeriodStart, recordInRange } from "./picks";

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

test("startOfWeek returns midnight on the most recent Sunday", () => {
  // Wed Aug 20 2025 -> Sunday Aug 17 2025
  assert.deepEqual(startOfWeek(new Date(2025, 7, 20, 15, 30)), new Date(2025, 7, 17, 0, 0, 0, 0));
  // A Sunday itself returns that same day at midnight.
  assert.deepEqual(startOfWeek(new Date(2025, 7, 17, 23, 59)), new Date(2025, 7, 17, 0, 0, 0, 0));
});

test("startOfMonth returns midnight on the 1st of the month", () => {
  assert.deepEqual(startOfMonth(new Date(2025, 7, 20, 15, 30)), new Date(2025, 7, 1, 0, 0, 0, 0));
});

test("startOfDay returns midnight on the given day", () => {
  assert.deepEqual(startOfDay(new Date(2025, 7, 20, 15, 30)), new Date(2025, 7, 20, 0, 0, 0, 0));
});

test("leaderboardPeriodStart resolves today/week/month, and undefined for season/all_time", () => {
  const now = new Date(2025, 7, 20, 15, 30);
  assert.deepEqual(leaderboardPeriodStart("today", now), new Date(2025, 7, 20, 0, 0, 0, 0));
  assert.deepEqual(leaderboardPeriodStart("week", now), new Date(2025, 7, 17, 0, 0, 0, 0));
  assert.deepEqual(leaderboardPeriodStart("month", now), new Date(2025, 7, 1, 0, 0, 0, 0));
  assert.equal(leaderboardPeriodStart("season", now), undefined);
  assert.equal(leaderboardPeriodStart("all_time", now), undefined);
});

test("gradeRacePicks returns null until a real winning participant is known", () => {
  assert.equal(gradeRacePicks(null, [{ id: "p1", selectionId: "driver-1" }]), null);
});

test("gradeRacePicks grades correctly against the real winning participant", () => {
  const result = gradeRacePicks("driver-1", [
    { id: "p1", selectionId: "driver-1" },
    { id: "p2", selectionId: "driver-2" },
  ]);
  assert.deepEqual(result, [{ id: "p1", isCorrect: true }, { id: "p2", isCorrect: false }]);
});

test("tallyRaceVotes counts votes per participant from stored picks", () => {
  const tally = tallyRaceVotes([{ selectionId: "d1" }, { selectionId: "d1" }, { selectionId: "d2" }]);
  assert.deepEqual(tally, { total: 3, byParticipant: { d1: { count: 2, pct: 67 }, d2: { count: 1, pct: 33 } } });
});

test("tallyRaceVotes handles zero votes without dividing by zero", () => {
  assert.deepEqual(tallyRaceVotes([]), { total: 0, byParticipant: {} });
});

test("recordInRange counts only graded picks whose game falls within [start, end)", () => {
  const start = new Date("2026-08-17T00:00:00");
  const end = new Date("2026-08-24T00:00:00");
  const picks = [
    { gameId: "1", sport: "nfl", isCorrect: true, gameStartsAt: new Date("2026-08-18T18:00:00") },
    { gameId: "2", sport: "nfl", isCorrect: false, gameStartsAt: new Date("2026-08-20T18:00:00") },
    { gameId: "3", sport: "nba", isCorrect: true, gameStartsAt: new Date("2026-08-25T18:00:00") }, // out of range
    { gameId: "4", sport: "nba", isCorrect: null, gameStartsAt: new Date("2026-08-19T18:00:00") }, // pending, never counts
  ];
  assert.deepEqual(recordInRange(picks, start, end), { correct: 1, incorrect: 1 });
});

test("recordInRange returns zeros for an empty or fully-out-of-range pick list", () => {
  const start = new Date("2026-08-17T00:00:00");
  const end = new Date("2026-08-24T00:00:00");
  assert.deepEqual(recordInRange([], start, end), { correct: 0, incorrect: 0 });
});
