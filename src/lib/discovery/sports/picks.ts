// ── Magical Picks — pure prediction/grading logic ─────────────────
// No DB, no fetch. gradeGamePicks() is the only place a pick's correctness
// is decided — the service layer calls it once a game's provider status
// reads "final" and never marks a pick correct/incorrect any other way.

import { streaksFromGraded, type GradedPick } from "./badges";

export interface PickForGrading {
  id: string;
  teamPick: "home" | "away";
}

export interface GradedResult {
  id: string;
  isCorrect: boolean;
}

/**
 * Grades every pick for one final game. Returns null if the game isn't
 * final yet or is missing a score — never guesses a winner. A tie (final,
 * scores equal) grades every pick incorrect, since no side was "the
 * winner" a pick could have called.
 */
export function gradeGamePicks(
  game: { status: string; homeScore: number | null | undefined; awayScore: number | null | undefined },
  picks: PickForGrading[]
): GradedResult[] | null {
  if (game.status !== "final" || game.homeScore == null || game.awayScore == null) return null;
  if (game.homeScore === game.awayScore) {
    return picks.map((p) => ({ id: p.id, isCorrect: false }));
  }
  const winner: "home" | "away" = game.homeScore > game.awayScore ? "home" : "away";
  return picks.map((p) => ({ id: p.id, isCorrect: p.teamPick === winner }));
}

export interface PicksSummary {
  total: number;
  correct: number;
  incorrect: number;
  accuracyPct: number;
  currentStreak: number;
  longestStreak: number;
  bySport: Record<string, { total: number; correct: number; accuracyPct: number }>;
}

/** Summarizes an account's Magical Picks profile from their graded picks. */
export function summarizePicks(picks: GradedPick[]): PicksSummary {
  const graded = picks.filter((p) => p.isCorrect !== null);
  const correct = graded.filter((p) => p.isCorrect).length;
  const incorrect = graded.length - correct;
  const { currentStreak, longestStreak } = streaksFromGraded(graded);

  const bySport: Record<string, { total: number; correct: number; accuracyPct: number }> = {};
  for (const p of graded) {
    const row = bySport[p.sport] ?? { total: 0, correct: 0, accuracyPct: 0 };
    row.total += 1;
    if (p.isCorrect) row.correct += 1;
    bySport[p.sport] = row;
  }
  for (const key of Object.keys(bySport)) {
    const row = bySport[key];
    row.accuracyPct = row.total ? Math.round((row.correct / row.total) * 100) : 0;
  }

  return {
    total: graded.length,
    correct,
    incorrect,
    accuracyPct: graded.length ? Math.round((correct / graded.length) * 100) : 0,
    currentStreak,
    longestStreak,
    bySport,
  };
}

export interface VoteTally {
  home: number;
  away: number;
  total: number;
  homePct: number;
  awayPct: number;
}

/** Community vote tally for one matchup — counts only, from our own stored
 *  SportsPick rows. Never derived from or presented as betting odds. */
export function tallyVotes(picks: { teamPick: "home" | "away" }[]): VoteTally {
  const home = picks.filter((p) => p.teamPick === "home").length;
  const away = picks.filter((p) => p.teamPick === "away").length;
  const total = home + away;
  return {
    home,
    away,
    total,
    homePct: total ? Math.round((home / total) * 100) : 0,
    awayPct: total ? Math.round((away / total) * 100) : 0,
  };
}

/** A pick can only be entered or changed before the game locks. */
export function isPickLocked(game: { status: string; locksAt: Date | null; startsAt: Date }): boolean {
  if (game.status !== "scheduled") return true;
  const lockTime = game.locksAt ?? game.startsAt;
  return Date.now() >= lockTime.getTime();
}
