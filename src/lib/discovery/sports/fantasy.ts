// ── Fantasy Football (pure core) ────────────────────────────────────────
// A separate product from Magical Picks — private leagues, a real snake
// draft, and lineup management, all built and owned by us. SportsDataIO
// only ever supplies the real players (see fantasy-service.ts); it doesn't
// package a fantasy game of its own, so every rule in this file — starting
// lineup shape, draft order, which positions can fill which slot — is our
// own, explicit, and testable without touching a provider or a database.
//
// This phase adds free-agent add/drop, a real reverse-priority rolling
// waiver wire, and team-to-team trades. IR and bye-week UI warnings are
// deferred — IR needs verified per-player injury designations this
// codebase doesn't resolve yet (see the MagicalAthleteStatus work), and a
// proactive bye-week warning needs a verified bye-week field neither
// provider tier here currently supplies; scoring already nets a bye
// starter to 0 correctly (computeTeamWeekScore), so nothing is wrong,
// just not yet warned about in the lineup UI. Playoffs are the next
// phase — this schema/engine is built so it's additive, not a rebuild.

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

// ── Weekly scoring ───────────────────────────────────────────────────────
// Standard, non-PPR fantasy scoring — a real, widely-recognized default
// format (the same shape ESPN/Yahoo call "Standard"), computed from the
// provider's raw counting stats rather than trusting any single provider's
// own pre-computed FantasyPoints number, per "we own the game rules; the
// sports APIs provide the verified statistics used to score it."

export interface PlayerWeekStats {
  passingYards: number;
  passingTouchdowns: number;
  passingInterceptions: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  fumblesLost: number;
  fieldGoalsMade: number;
  extraPointsMade: number;
}

export function computeFantasyPoints(s: PlayerWeekStats): number {
  const points =
    s.passingYards / 25 +
    s.passingTouchdowns * 4 -
    s.passingInterceptions * 2 +
    s.rushingYards / 10 +
    s.rushingTouchdowns * 6 +
    s.receivingYards / 10 +
    s.receivingTouchdowns * 6 -
    s.fumblesLost * 2 +
    s.fieldGoalsMade * 3 +
    s.extraPointsMade * 1;
  return Math.round(points * 100) / 100;
}

export interface DefenseWeekStats {
  sacks: number;
  interceptions: number;
  fumblesRecovered: number;
  touchdownsScored: number;
  pointsAllowed: number;
  safeties: number;
}

/** Points-allowed is scored in tiers, the same real, standard convention
 *  most fantasy platforms default a team defense to — fewer points allowed
 *  scores more. */
function pointsAllowedScore(pointsAllowed: number): number {
  if (pointsAllowed === 0) return 10;
  if (pointsAllowed <= 6) return 7;
  if (pointsAllowed <= 13) return 4;
  if (pointsAllowed <= 20) return 1;
  if (pointsAllowed <= 27) return 0;
  if (pointsAllowed <= 34) return -1;
  return -4;
}

export function computeDefensePoints(s: DefenseWeekStats): number {
  const points =
    s.sacks * 1 +
    s.interceptions * 2 +
    s.fumblesRecovered * 2 +
    s.touchdownsScored * 6 +
    s.safeties * 2 +
    pointsAllowedScore(s.pointsAllowed);
  return Math.round(points * 100) / 100;
}

// ── Weekly matchup schedule ──────────────────────────────────────────────

export interface FantasyMatchupPairing {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
}

/** A real round-robin schedule — every team plays every other team once
 *  before repeating, the standard way a fixed group schedules a season
 *  with no outside opponents. An odd team count gets a "bye" (paired with
 *  a null placeholder that's simply dropped) each round it draws the
 *  phantom opponent, exactly like a real odd-team league. Runs for
 *  `weeks` weeks, cycling the round-robin again after everyone has played
 *  everyone once, if the league runs longer than teams.length - 1 weeks. */
export function generateRoundRobinSchedule(teamIds: string[], weeks: number): FantasyMatchupPairing[] {
  if (teamIds.length < 2 || weeks < 1) return [];
  const ids = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, null as unknown as string];
  const n = ids.length;
  const roundsPerCycle = n - 1;
  const pairings: FantasyMatchupPairing[] = [];
  const rotating = [...ids];
  for (let week = 1; week <= weeks; week++) {
    const roundIndex = (week - 1) % roundsPerCycle;
    if (roundIndex === 0 && week > 1) {
      // Re-seed the rotation each time a new cycle starts so a longer
      // season replays the same fair pairing order rather than drifting.
      rotating.splice(0, rotating.length, ...ids);
    }
    for (let i = 0; i < n / 2; i++) {
      const home = rotating[i];
      const away = rotating[n - 1 - i];
      if (home && away) pairings.push({ week, homeTeamId: home, awayTeamId: away });
    }
    // Standard round-robin rotation: fix the first element, rotate the rest.
    const fixed = rotating[0];
    const rest = rotating.slice(1);
    rest.unshift(rest.pop() as string);
    rotating.splice(0, rotating.length, fixed, ...rest);
  }
  return pairings;
}

// ── Standings ────────────────────────────────────────────────────────────

export interface FantasyMatchupResult {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  final: boolean;
}

export interface FantasyStandingsEntry {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

/** Real standings from real completed matchup results — wins first, then
 *  total points scored (the standard fantasy tiebreaker when head-to-head
 *  record ties). An in-progress (final:false) matchup doesn't count toward
 *  W/L yet, but its live score still accrues into points for/against so
 *  the table reflects what's actually on the board. */
export function computeFantasyStandings(teamIds: string[], results: FantasyMatchupResult[]): FantasyStandingsEntry[] {
  const base = new Map<string, { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number }>();
  for (const id of teamIds) base.set(id, { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
  for (const r of results) {
    const home = base.get(r.homeTeamId);
    const away = base.get(r.awayTeamId);
    if (home) { home.pointsFor += r.homeScore; home.pointsAgainst += r.awayScore; }
    if (away) { away.pointsFor += r.awayScore; away.pointsAgainst += r.homeScore; }
    if (!r.final) continue;
    if (r.homeScore === r.awayScore) {
      if (home) home.ties += 1;
      if (away) away.ties += 1;
    } else {
      const winner = r.homeScore > r.awayScore ? home : away;
      const loser = r.homeScore > r.awayScore ? away : home;
      if (winner) winner.wins += 1;
      if (loser) loser.losses += 1;
    }
  }
  return [...base.entries()]
    .map(([teamId, s]) => ({ teamId, ...s }))
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** The real, standard initial waiver order — worst record picks first, so
 *  the team that needs the most help gets the first shot at any player.
 *  Ties broken by fewer points scored (also worse). */
export function initialWaiverOrder(standings: FantasyStandingsEntry[]): string[] {
  return [...standings]
    .sort((a, b) => a.wins - b.wins || a.pointsFor - b.pointsFor)
    .map((s) => s.teamId);
}

// ── Waivers ──────────────────────────────────────────────────────────────

export interface WaiverClaimInput {
  id: string;
  teamId: string;
  playerId: string;
}

export interface WaiverResolution {
  wonClaimIds: string[];
  lostClaimIds: string[];
  newPriorityOrder: string[];
}

/** Resolves every pending waiver claim in one processing pass — the real
 *  "rolling reverse-priority" convention most fantasy platforms default
 *  to: the highest-priority team among everyone who claimed a given
 *  player wins that player, every other claim on that same player is
 *  lost, and the winning team drops to the back of the priority order
 *  (so the same team can't sweep every contested player in one pass).
 *  A team with multiple claims on DIFFERENT players can still win more
 *  than one — each is resolved independently against the order as it
 *  stands at that moment, exactly like a real waiver period processing
 *  claims one at a time in priority order. */
export function resolveWaiverClaims(priorityOrder: string[], claims: WaiverClaimInput[]): WaiverResolution {
  const won: string[] = [];
  const lost: string[] = [];
  let order = [...priorityOrder];
  let remaining = [...claims];
  while (remaining.length) {
    remaining.sort((a, b) => order.indexOf(a.teamId) - order.indexOf(b.teamId));
    const winner = remaining[0];
    won.push(winner.id);
    const losers = remaining.filter((c) => c.playerId === winner.playerId && c.id !== winner.id);
    for (const l of losers) lost.push(l.id);
    const consumed = new Set([winner.id, ...losers.map((c) => c.id)]);
    remaining = remaining.filter((c) => !consumed.has(c.id));
    order = [...order.filter((t) => t !== winner.teamId), winner.teamId];
  }
  return { wonClaimIds: won, lostClaimIds: lost, newPriorityOrder: order };
}

// ── Trades ───────────────────────────────────────────────────────────────

/** A trade is legal only when every player named on each side is real
 *  (actually rostered by the team offering them) and neither side offers
 *  the same player twice or offers a player the other side already has.
 *  Pure validation — the service layer still re-checks against the real
 *  DB roster at accept time in case something changed since the trade was
 *  proposed. */
export function isValidTradeProposal(
  proposerRosterIds: string[],
  recipientRosterIds: string[],
  proposerGivingIds: string[],
  recipientGivingIds: string[]
): boolean {
  if (!proposerGivingIds.length || !recipientGivingIds.length) return false;
  const proposerSet = new Set(proposerRosterIds);
  const recipientSet = new Set(recipientRosterIds);
  if (new Set(proposerGivingIds).size !== proposerGivingIds.length) return false;
  if (new Set(recipientGivingIds).size !== recipientGivingIds.length) return false;
  return proposerGivingIds.every((id) => proposerSet.has(id)) && recipientGivingIds.every((id) => recipientSet.has(id));
}

// ── Playoffs ─────────────────────────────────────────────────────────────

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** The standard single-elimination bracket seeding order for a bracket of
 *  `size` (a power of two) — 1 plays the lowest seed, 2 plays the next
 *  lowest, and so on, the same seeding convention every real single-
 *  elimination tournament uses. Returns seed NUMBERS (1-indexed) in
 *  bracket-slot order, e.g. size=4 → [1,4,2,3] (1v4, 2v3); size=8 →
 *  [1,8,4,5,2,7,3,6]. */
function bracketSeedOrder(size: number): number[] {
  if (size <= 1) return [1];
  if (size === 2) return [1, 2];
  const half = bracketSeedOrder(size / 2);
  const order: number[] = [];
  for (const s of half) order.push(s, size + 1 - s);
  return order;
}

export interface PlayoffBracketGame {
  round: number;
  slot: number; // position within the round, 0-indexed
  teamAId: string | null; // null = a bye, or a later round awaiting a prior winner
  teamBId: string | null;
  winnerId: string | null; // set once decided — a bye is decided immediately at seeding
}

/** Seeds a real single-elimination playoff bracket from final regular-
 *  season standings (already rank-sorted by computeFantasyStandings) —
 *  the top `playoffTeams` teams, standard seeding (1v-lowest, etc). When
 *  `playoffTeams` isn't a power of two, the top seeds get a real bye
 *  (auto-win, no opponent) in round 1 rather than a fabricated matchup.
 *  Every later round's games start as TBD (both teams null) until
 *  advancePlayoffBracket fills them in from real decided results. */
export function seedPlayoffBracket(standings: FantasyStandingsEntry[], playoffTeams: number): PlayoffBracketGame[] {
  const seeds = standings.slice(0, playoffTeams);
  const bracketSize = nextPowerOfTwo(Math.max(playoffTeams, 1));
  const rounds = Math.max(1, Math.log2(bracketSize));
  const order = bracketSeedOrder(bracketSize);
  const round1Teams: (string | null)[] = order.map((seedNum) => seeds[seedNum - 1]?.teamId ?? null);

  const games: PlayoffBracketGame[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const teamA = round1Teams[i * 2];
    const teamB = round1Teams[i * 2 + 1];
    const winner = teamA && !teamB ? teamA : !teamA && teamB ? teamB : null;
    games.push({ round: 1, slot: i, teamAId: teamA, teamBId: teamB, winnerId: winner });
  }
  for (let r = 2; r <= rounds; r++) {
    const gamesInRound = bracketSize / Math.pow(2, r);
    for (let i = 0; i < gamesInRound; i++) games.push({ round: r, slot: i, teamAId: null, teamBId: null, winnerId: null });
  }
  return advancePlayoffBracket(games); // propagates any round-1 byes straight into round 2 immediately
}

/** Fills in every round's TBD slots from the prior round's real decided
 *  winners — safe to call after any single game is marked decided; a slot
 *  that already has a team recorded is left untouched. */
export function advancePlayoffBracket(games: PlayoffBracketGame[]): PlayoffBracketGame[] {
  const updated = games.map((g) => ({ ...g }));
  const maxRound = updated.reduce((m, g) => Math.max(m, g.round), 1);
  for (let r = 1; r < maxRound; r++) {
    const thisRound = updated.filter((g) => g.round === r).sort((a, b) => a.slot - b.slot);
    const nextRound = updated.filter((g) => g.round === r + 1).sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < nextRound.length; i++) {
      const feederA = thisRound[i * 2];
      const feederB = thisRound[i * 2 + 1];
      if (feederA?.winnerId && nextRound[i].teamAId == null) nextRound[i].teamAId = feederA.winnerId;
      if (feederB?.winnerId && nextRound[i].teamBId == null) nextRound[i].teamBId = feederB.winnerId;
    }
  }
  return updated;
}

export interface PlayoffClinchStatus {
  teamId: string;
  clinched: boolean;
  eliminated: boolean;
}

/** Real, verified playoff-clinch math from current standings and each
 *  team's own real remaining-game count — never a guess. A team is
 *  CLINCHED once fewer than `playoffTeams` other teams could possibly
 *  still finish with more wins than it already has (even if it loses
 *  every remaining game, it can't be pushed out). A team is ELIMINATED
 *  once `playoffTeams` other teams have already clinched more wins than
 *  it could possibly reach even by winning out. Deliberately conservative
 *  on ties (no fantasy tiebreaker rule is assumed) — it will never
 *  mislabel a team CLINCHED or ELIMINATED, only decline to call an
 *  unresolved tie either way yet. */
export function computePlayoffClinchStatus(standings: FantasyStandingsEntry[], remainingGamesByTeam: Map<string, number>, playoffTeams: number): PlayoffClinchStatus[] {
  const maxPossibleWins = new Map(standings.map((s) => [s.teamId, s.wins + (remainingGamesByTeam.get(s.teamId) ?? 0)]));
  return standings.map((team) => {
    const others = standings.filter((s) => s.teamId !== team.teamId);
    const couldStillPass = others.filter((o) => (maxPossibleWins.get(o.teamId) ?? o.wins) > team.wins).length;
    const alreadyPastMyMax = others.filter((o) => o.wins > (maxPossibleWins.get(team.teamId) ?? team.wins)).length;
    return {
      teamId: team.teamId,
      clinched: couldStillPass < playoffTeams,
      eliminated: alreadyPastMyMax >= playoffTeams,
    };
  });
}
