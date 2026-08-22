// ── Fantasy Football (pure core) ────────────────────────────────────────
// A separate product from Magical Picks — private leagues, a real snake
// draft, and lineup management, all built and owned by us. SportsDataIO
// only ever supplies the real players (see fantasy-service.ts); it doesn't
// package a fantasy game of its own, so every rule in this file — starting
// lineup shape, draft order, which positions can fill which slot — is our
// own, explicit, and testable without touching a provider or a database.
//
// Scope for this phase: league creation, snake draft, rosters, and lineup
// management. Weekly scoring from real player stats, waivers, and playoffs
// are the next phases — this schema/engine is built so they're additive,
// not a rebuild (see the module comment on the Prisma models).

/** The starting lineup this codebase runs today. Not configurable per
 *  league yet — a real, single, well-known 9-starter standard format
 *  (single QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 DST, 1 K), so every league a
 *  commissioner creates behaves the same, predictable way. */
export const STANDARD_LINEUP_SLOTS: string[] = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "DST", "K"];
export const STANDARD_BENCH_SIZE = 6;

/** Which real provider positions are eligible for each of our lineup
 *  slots. FLEX is the only slot that accepts more than one position —
 *  every other slot requires an exact match. SportsDataIO's NFL Player
 *  position codes for defense/special-teams units come back as "DEF" on
 *  some endpoints and "DST" on others — both map to our DST slot rather
 *  than risk silently benching every team's defense over a labeling
 *  difference. */
const SLOT_ELIGIBLE_POSITIONS: Record<string, string[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
  DST: ["DST", "DEF"],
  K: ["K"],
};

export function isEligibleForSlot(position: string, slot: string): boolean {
  if (slot === "BENCH") return true;
  const eligible = SLOT_ELIGIBLE_POSITIONS[slot];
  return eligible ? eligible.includes(position) : false;
}

/** The flattened pick sequence for a snake draft: round 1 goes in
 *  `teamIds` order, round 2 reverses, round 3 forward again, and so on,
 *  for `rounds` rounds (one round per starting+bench roster spot). */
export function snakeDraftOrder(teamIds: string[], rounds: number): string[] {
  const sequence: string[] = [];
  for (let round = 0; round < rounds; round++) {
    const roundOrder = round % 2 === 0 ? teamIds : [...teamIds].reverse();
    sequence.push(...roundOrder);
  }
  return sequence;
}

/** Whose turn it is right now, or null once every pick has been made. */
export function teamOnTheClock(draftOrder: string[], currentPickIndex: number): string | null {
  return currentPickIndex < draftOrder.length ? draftOrder[currentPickIndex] : null;
}

export function isDraftComplete(draftOrder: string[], currentPickIndex: number): boolean {
  return currentPickIndex >= draftOrder.length;
}

/** Round/pick-in-round display, 1-indexed, for a human-readable "Round 3,
 *  Pick 7" label — pure arithmetic from the pick index and team count. */
export function draftPickLabel(pickIndex: number, teamCount: number): { round: number; pickInRound: number } {
  return { round: Math.floor(pickIndex / teamCount) + 1, pickInRound: (pickIndex % teamCount) + 1 };
}

export interface RosterPlayer {
  playerId: string;
  position: string;
  lineupSlot: string; // one of STANDARD_LINEUP_SLOTS, or "BENCH"
}

/** Moves one player into a lineup slot. If another player already
 *  occupies that exact slot, they swap — the player being moved takes
 *  the incoming player's previous slot (BENCH, most commonly) rather than
 *  the roster silently ending up with two players in the same slot or one
 *  slot empty. Returns null (no change) if the player isn't on this
 *  roster, or isn't eligible for the requested slot. */
export function applyLineupChange(roster: RosterPlayer[], playerId: string, targetSlot: string): RosterPlayer[] | null {
  const moving = roster.find((p) => p.playerId === playerId);
  if (!moving) return null;
  if (!isEligibleForSlot(moving.position, targetSlot)) return null;
  const occupant = targetSlot !== "BENCH" ? roster.find((p) => p.playerId !== playerId && p.lineupSlot === targetSlot) : undefined;
  const previousSlot = moving.lineupSlot;
  return roster.map((p) => {
    if (p.playerId === playerId) return { ...p, lineupSlot: targetSlot };
    if (occupant && p.playerId === occupant.playerId) return { ...p, lineupSlot: previousSlot };
    return p;
  });
}

/** True once every standard starting slot has a player in it — the
 *  minimum bar for "this team has a legal starting lineup," independent
 *  of whether every bench spot is filled. */
export function hasCompleteStartingLineup(roster: RosterPlayer[], lineupSlots: string[] = STANDARD_LINEUP_SLOTS): boolean {
  // Two RB/WR slots share a label, so this counts occurrences, not just presence.
  const needed = new Map<string, number>();
  for (const slot of lineupSlots) needed.set(slot, (needed.get(slot) ?? 0) + 1);
  const have = new Map<string, number>();
  for (const p of roster) {
    if (p.lineupSlot === "BENCH") continue;
    have.set(p.lineupSlot, (have.get(p.lineupSlot) ?? 0) + 1);
  }
  for (const [slot, count] of needed) {
    if ((have.get(slot) ?? 0) < count) return false;
  }
  return true;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateLeagueInviteCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}
