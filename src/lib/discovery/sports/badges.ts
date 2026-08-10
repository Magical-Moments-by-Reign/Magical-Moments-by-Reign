// ── Magical Picks — badge catalog (pure) ──────────────────────────
// Static definitions, like NOTIFICATION_TYPES/SERVICE_CATALOG elsewhere —
// earned badges are persisted per-account in SportsBadgeEarned, but the
// catalog itself is code, not data. No monetary prizes are attached to any
// badge, per the entertainment-only scope of Magical Picks.

export type BadgeId = "first_pick" | "on_fire" | "sports_oracle" | "perfect_weekend" | "team_loyalty" | "multi_sport_fan";

export interface BadgeDef {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
}

export const SPORTS_BADGES: BadgeDef[] = [
  { id: "first_pick", label: "First Pick", description: "Made your first prediction.", icon: "🎯" },
  { id: "on_fire", label: "On Fire", description: "5 correct picks in a row.", icon: "🔥" },
  { id: "sports_oracle", label: "Sports Oracle", description: "10 correct picks.", icon: "🏆" },
  { id: "perfect_weekend", label: "Perfect Weekend", description: "Every pick correct during a qualifying weekend.", icon: "✨" },
  { id: "team_loyalty", label: "Team Loyalty", description: "Consistently supports a favorite team.", icon: "❤️" },
  { id: "multi_sport_fan", label: "Multi-Sport Fan", description: "Active across multiple sports.", icon: "🌐" },
];

export function badgeDef(id: BadgeId): BadgeDef | undefined {
  return SPORTS_BADGES.find((b) => b.id === id);
}

export interface GradedPick {
  gameId: string;
  sport: string;
  isCorrect: boolean | null;
  gameStartsAt: Date;
}

function weekendKey(d: Date): string {
  // The Saturday that starts this game's calendar weekend (Sat/Sun), as a
  // stable grouping key — Friday-night games don't count toward a weekend.
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  if (day !== 0 && day !== 6) return "";
  const sat = new Date(d);
  sat.setUTCDate(d.getUTCDate() - (day === 0 ? 1 : 0));
  return sat.toISOString().slice(0, 10);
}

/**
 * Which badges an account has newly qualified for, given all their graded
 * picks and current explicit follows. Pure — the service layer persists any
 * id returned here that isn't already in SportsBadgeEarned. Only considers
 * graded picks (isCorrect !== null); an in-flight pick can't earn anything
 * yet.
 */
export function evaluateEarnedBadges(input: {
  picks: GradedPick[];
  followedTeamCount: number;
  followedSportsCount: number;
}): BadgeId[] {
  const graded = input.picks.filter((p) => p.isCorrect !== null);
  const earned: BadgeId[] = [];

  if (input.picks.length >= 1) earned.push("first_pick");

  const correctTotal = graded.filter((p) => p.isCorrect).length;
  if (correctTotal >= 10) earned.push("sports_oracle");

  const { currentStreak } = streaksFromGraded(graded);
  if (currentStreak >= 5) earned.push("on_fire");

  const byWeekend = new Map<string, GradedPick[]>();
  for (const p of graded) {
    const key = weekendKey(p.gameStartsAt);
    if (!key) continue;
    const list = byWeekend.get(key) ?? [];
    list.push(p);
    byWeekend.set(key, list);
  }
  for (const list of byWeekend.values()) {
    if (list.length >= 2 && list.every((p) => p.isCorrect)) {
      earned.push("perfect_weekend");
      break;
    }
  }

  if (input.followedTeamCount >= 1) earned.push("team_loyalty");
  if (input.followedSportsCount >= 3) earned.push("multi_sport_fan");

  return earned;
}

function streaksFromGraded(graded: GradedPick[]): { currentStreak: number; longestStreak: number } {
  const ordered = [...graded].sort((a, b) => a.gameStartsAt.getTime() - b.gameStartsAt.getTime());
  let longest = 0;
  let running = 0;
  for (const p of ordered) {
    if (p.isCorrect) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }
  // current streak: run of corrects ending at the most recent graded pick
  let current = 0;
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].isCorrect) current += 1;
    else break;
  }
  return { currentStreak: current, longestStreak: longest };
}

export { streaksFromGraded };
