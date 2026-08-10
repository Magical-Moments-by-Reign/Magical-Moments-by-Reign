import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateEarnedBadges, type GradedPick } from "./badges";

test("evaluateEarnedBadges awards first_pick as soon as any pick exists", () => {
  const earned = evaluateEarnedBadges({
    picks: [{ gameId: "g1", sport: "nfl", isCorrect: null, gameStartsAt: new Date() }],
    followedTeamCount: 0,
    followedSportsCount: 0,
  });
  assert.ok(earned.includes("first_pick"));
});

test("evaluateEarnedBadges awards on_fire at a 5-correct current streak", () => {
  const picks: GradedPick[] = Array.from({ length: 5 }, (_, i) => ({
    gameId: `g${i}`, sport: "nba", isCorrect: true, gameStartsAt: new Date(2026, 0, i + 1),
  }));
  const earned = evaluateEarnedBadges({ picks, followedTeamCount: 0, followedSportsCount: 0 });
  assert.ok(earned.includes("on_fire"));
});

test("evaluateEarnedBadges does not award on_fire on a broken streak", () => {
  const picks: GradedPick[] = [
    { gameId: "g1", sport: "nba", isCorrect: true, gameStartsAt: new Date(2026, 0, 1) },
    { gameId: "g2", sport: "nba", isCorrect: true, gameStartsAt: new Date(2026, 0, 2) },
    { gameId: "g3", sport: "nba", isCorrect: false, gameStartsAt: new Date(2026, 0, 3) },
    { gameId: "g4", sport: "nba", isCorrect: true, gameStartsAt: new Date(2026, 0, 4) },
  ];
  const earned = evaluateEarnedBadges({ picks, followedTeamCount: 0, followedSportsCount: 0 });
  assert.equal(earned.includes("on_fire"), false);
});

test("evaluateEarnedBadges awards sports_oracle at 10 correct total (not necessarily consecutive)", () => {
  const picks: GradedPick[] = [
    ...Array.from({ length: 5 }, (_, i) => ({ gameId: `a${i}`, sport: "nfl", isCorrect: true, gameStartsAt: new Date(2026, 0, i + 1) })),
    { gameId: "x", sport: "nfl", isCorrect: false, gameStartsAt: new Date(2026, 0, 6) },
    ...Array.from({ length: 5 }, (_, i) => ({ gameId: `b${i}`, sport: "nfl", isCorrect: true, gameStartsAt: new Date(2026, 0, 7 + i) })),
  ];
  const earned = evaluateEarnedBadges({ picks, followedTeamCount: 0, followedSportsCount: 0 });
  assert.ok(earned.includes("sports_oracle"));
  assert.equal(earned.includes("on_fire"), true); // trailing run of 5 still current
});

test("evaluateEarnedBadges awards perfect_weekend only when a Sat/Sun group is fully correct with 2+ picks", () => {
  const saturday = new Date(Date.UTC(2026, 0, 3)); // a Saturday
  const sunday = new Date(Date.UTC(2026, 0, 4));
  const picks: GradedPick[] = [
    { gameId: "g1", sport: "nfl", isCorrect: true, gameStartsAt: saturday },
    { gameId: "g2", sport: "nfl", isCorrect: true, gameStartsAt: sunday },
  ];
  const earned = evaluateEarnedBadges({ picks, followedTeamCount: 0, followedSportsCount: 0 });
  assert.ok(earned.includes("perfect_weekend"));
});

test("evaluateEarnedBadges withholds perfect_weekend when only one weekend pick exists", () => {
  const saturday = new Date(Date.UTC(2026, 0, 3));
  const picks: GradedPick[] = [{ gameId: "g1", sport: "nfl", isCorrect: true, gameStartsAt: saturday }];
  const earned = evaluateEarnedBadges({ picks, followedTeamCount: 0, followedSportsCount: 0 });
  assert.equal(earned.includes("perfect_weekend"), false);
});

test("evaluateEarnedBadges awards team_loyalty and multi_sport_fan from explicit follows", () => {
  const earned = evaluateEarnedBadges({ picks: [], followedTeamCount: 1, followedSportsCount: 3 });
  assert.ok(earned.includes("team_loyalty"));
  assert.ok(earned.includes("multi_sport_fan"));
});

test("evaluateEarnedBadges awards nothing beyond eligible criteria with no activity", () => {
  const earned = evaluateEarnedBadges({ picks: [], followedTeamCount: 0, followedSportsCount: 0 });
  assert.deepEqual(earned, []);
});
