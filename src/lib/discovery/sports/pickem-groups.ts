// ── Magical Picks — Family & Friend Pick'em Groups (pure core) ──────────
// A private group a member creates and invites people into by code, so a
// household or friend circle can compare real pick records side by side.
// Ranks members purely from their own real graded SportsPick rows — the
// same GradedPick shape/streak math the individual Magical Picks profile
// and the guardian/ward Family Leaderboard already use — never a separate
// scoring system. Entertainment/community predictions only: no wagering,
// spreads, or betting odds are computed anywhere in this file.

import { streaksFromGraded, type GradedPick } from "./badges";
import { startOfWeek } from "./picks";

export interface PickGroupMemberInput {
  accountId: string;
  name: string;
  picks: GradedPick[]; // every graded pick this member has made, any sport
}

export interface GroupLeaderboardEntry {
  accountId: string;
  name: string;
  weeklyCorrect: number;
  weeklyRecord: string; // "3-1" (correct-incorrect) for the current week
  seasonCorrect: number;
  winPct: number; // season accuracy across all graded picks
  currentStreak: number;
  rank: number;
  isMe: boolean;
}

/** Ranks a group's real members. `range: "season"` (default) ranks by total
 *  season correct picks, ties broken by win percentage then streak —
 *  "most correct wins," the same framing as the existing Family
 *  Leaderboard. `range: "week"` ranks by this week's correct picks instead
 *  — every entry still carries both windows' numbers regardless of which
 *  one drives the rank, so a page can show one table and just re-sort it. */
export function buildGroupLeaderboard(
  members: PickGroupMemberInput[],
  viewerAccountId: string,
  now: Date = new Date(),
  range: "week" | "season" = "season"
): GroupLeaderboardEntry[] {
  const weekStart = startOfWeek(now);
  const unranked = members.map((m) => {
    const graded = m.picks.filter((p) => p.isCorrect !== null);
    const seasonCorrect = graded.filter((p) => p.isCorrect).length;
    const winPct = graded.length ? Math.round((seasonCorrect / graded.length) * 100) : 0;
    const { currentStreak } = streaksFromGraded(graded);
    const weekly = graded.filter((p) => p.gameStartsAt.getTime() >= weekStart.getTime());
    const weeklyCorrect = weekly.filter((p) => p.isCorrect).length;
    const weeklyIncorrect = weekly.length - weeklyCorrect;
    return {
      accountId: m.accountId,
      name: m.name,
      weeklyCorrect,
      weeklyRecord: `${weeklyCorrect}-${weeklyIncorrect}`,
      seasonCorrect,
      winPct,
      currentStreak,
      isMe: m.accountId === viewerAccountId,
    };
  });
  const primary = range === "week"
    ? (a: typeof unranked[number], b: typeof unranked[number]) => b.weeklyCorrect - a.weeklyCorrect
    : (a: typeof unranked[number], b: typeof unranked[number]) => b.seasonCorrect - a.seasonCorrect;
  return unranked
    .sort((a, b) => primary(a, b) || b.winPct - a.winPct || b.currentStreak - a.currentStreak)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// No 0/O/1/I — a member reading this code aloud, or squinting at a small
// screen, can't confuse a digit for a letter.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A short invite code for one group. `random` is injectable so this stays
 *  deterministic in tests — real callers just use the default Math.random. */
export function generateInviteCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}
