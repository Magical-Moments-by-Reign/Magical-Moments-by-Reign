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

export interface RacePickForGrading {
  id: string;
  selectionId: string;
}

/**
 * Grades every pick for one final RACE_WINNER event (F1) — the
 * RACE_WINNER counterpart to gradeGamePicks. Returns null until a real
 * winning participant is known (a finishPosition of 1 recorded on a real
 * SportsGameParticipant) — never guesses a winner from an incomplete
 * field.
 */
export function gradeRacePicks(winnerParticipantId: string | null, picks: RacePickForGrading[]): GradedResult[] | null {
  if (!winnerParticipantId) return null;
  return picks.map((p) => ({ id: p.id, isCorrect: p.selectionId === winnerParticipantId }));
}

export interface RaceVoteTally {
  total: number;
  byParticipant: Record<string, { count: number; pct: number }>;
}

/** Community vote tally for one RACE_WINNER event — the N-way counterpart
 *  to tallyVotes' two-way home/away tally. Never derived from or presented
 *  as betting odds. */
export function tallyRaceVotes(picks: { selectionId: string }[]): RaceVoteTally {
  const total = picks.length;
  const byParticipant: Record<string, { count: number; pct: number }> = {};
  for (const p of picks) {
    const row = byParticipant[p.selectionId] ?? { count: 0, pct: 0 };
    row.count += 1;
    byParticipant[p.selectionId] = row;
  }
  for (const key of Object.keys(byParticipant)) {
    byParticipant[key].pct = total ? Math.round((byParticipant[key].count / total) * 100) : 0;
  }
  return { total, byParticipant };
}

/** A pick can only be entered or changed before the game locks. */
export function isPickLocked(game: { status: string; locksAt: Date | null; startsAt: Date }): boolean {
  if (game.status !== "scheduled") return true;
  const lockTime = game.locksAt ?? game.startsAt;
  return Date.now() >= lockTime.getTime();
}

/** Midnight, the most recent Sunday on/before `date`, in local time — the
 *  start of the "This Week" window for the Family Leaderboard. Pure, no
 *  Date.now() call of its own so it's deterministic in tests. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Midnight on the 1st of `date`'s month, local time — the start of the
 *  "This Month" leaderboard window. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Midnight on `date`'s own day, local time — the start of the "Today"
 *  leaderboard window. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type LeaderboardPeriod = "today" | "week" | "month" | "season" | "all_time";

/** Resolves a leaderboard period to its real start boundary — undefined
 *  for "all_time" (no lower bound) and "season" (a sport-specific concept
 *  this pure helper doesn't own; callers filter season picks by the same
 *  real season-year convention the rest of Sports already uses). Pure, so
 *  every period is deterministic in tests against a passed-in `now`. */
export function leaderboardPeriodStart(period: LeaderboardPeriod, now: Date): Date | undefined {
  switch (period) {
    case "today": return startOfDay(now);
    case "week": return startOfWeek(now);
    case "month": return startOfMonth(now);
    default: return undefined;
  }
}
