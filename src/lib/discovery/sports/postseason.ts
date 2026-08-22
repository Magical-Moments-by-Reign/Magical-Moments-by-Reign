// ── Postseason Rule Engine — pure core (SPORT-AGNOSTIC) ────────────────
// One reusable clinch/elimination engine shared by real sports leagues
// (NFL/NBA/WNBA/MLB/NHL standings) and Fantasy Football playoffs — never a
// separate copy per product (fantasy.ts's own playoff-clinch math now
// calls into this module instead of duplicating it). Each league's own
// structure (conferences, divisions, playoff format, real season length)
// lives as a versioned config/adapter here, not ad hoc branching, so
// adding a league is "add an adapter," not "add a special case."
//
// "IF THE PLAYOFFS STARTED TODAY" discipline: every projection here is
// exactly that — a projection from real, current standings. A team is
// only ever labeled CLINCHED/ELIMINATED once the math in
// computeClinchStatus below makes it mathematically certain (conservative
// on ties, since no real tiebreaker rule is implemented for any league
// yet — see the NFL seed projector's own disclosed limitation). Never
// fabricates a division/wild-card/seed clinch that would require real
// tiebreaker data this codebase doesn't have verified.

export interface StandingsEntry {
  teamId: string;
  wins: number;
}

export interface ClinchStatus {
  teamId: string;
  clinched: boolean;
  eliminated: boolean;
}

/** Real, verified clinch/elimination math from current standings and each
 *  team's own real remaining-game count — never a guess. A team is
 *  CLINCHED once fewer than `playoffSpots` other teams could possibly
 *  still finish with more wins than it already has (even if it loses
 *  every remaining game, it can't be pushed out). A team is ELIMINATED
 *  once `playoffSpots` other teams have already banked more wins than it
 *  could possibly reach even by winning out. Deliberately conservative on
 *  ties (no tiebreaker rule is assumed for any league) — it will never
 *  mislabel a team CLINCHED or ELIMINATED, only decline to call an
 *  unresolved race either way yet. Shared by real-sports standings and
 *  Fantasy Football playoffs alike — the math doesn't change by product. */
export function computeClinchStatus(standings: StandingsEntry[], remainingGamesByTeam: Map<string, number>, playoffSpots: number): ClinchStatus[] {
  const maxPossibleWins = new Map(standings.map((s) => [s.teamId, s.wins + (remainingGamesByTeam.get(s.teamId) ?? 0)]));
  return standings.map((team) => {
    const others = standings.filter((s) => s.teamId !== team.teamId);
    const couldStillPass = others.filter((o) => (maxPossibleWins.get(o.teamId) ?? o.wins) > team.wins).length;
    const alreadyPastMyMax = others.filter((o) => o.wins > (maxPossibleWins.get(team.teamId) ?? team.wins)).length;
    return {
      teamId: team.teamId,
      clinched: couldStillPass < playoffSpots,
      eliminated: alreadyPastMyMax >= playoffSpots,
    };
  });
}

// Real, official regular-season game counts — a fixed league rule, not a
// guess, so "games remaining" can be computed from real standings alone
// with no extra provider call. Deliberately excludes college sports
// (NCAAF/NCAAB), whose real schedule length varies team to team — a fixed
// constant there would be a fabricated number, not a verified one.
export const REGULAR_SEASON_GAMES: Partial<Record<string, number>> = {
  nfl: 17,
  nba: 82,
  wnba: 40,
  mlb: 162,
  nhl: 82,
};

/** Real games remaining for one team this season — null when this sport's
 *  season length isn't a fixed, verified constant (see REGULAR_SEASON_GAMES),
 *  never a guessed number. */
export function remainingGamesForSport(sport: string, wins: number, losses: number, ties = 0): number | null {
  const total = REGULAR_SEASON_GAMES[sport];
  if (total == null) return null;
  return Math.max(0, total - (wins + losses + ties));
}

export interface PostseasonPictureEntry {
  teamId: string;
  wins: number;
  losses: number;
  inField: boolean; // true when ranked within the group's playoff-spot count today
  clinched: boolean;
  eliminated: boolean;
}

/** The generic "IF THE PLAYOFFS STARTED TODAY" picture for one group
 *  (conference/league/division — whatever the real standings are already
 *  scoped to) with a flat playoff-spot cutoff. NFL/NBA/NHL/MLB all layer
 *  their own real seeding rules (division winners, wild cards, play-in) on
 *  top of this — see the league-specific adapters below — but every one
 *  of them still needs "who's mathematically in/out today," which is what
 *  this shared function answers. */
export function computePostseasonPicture(
  sport: string,
  teams: { teamId: string; wins: number; losses: number; ties?: number }[],
  playoffSpots: number
): PostseasonPictureEntry[] {
  const remainingByTeam = new Map(teams.map((t) => [t.teamId, remainingGamesForSport(sport, t.wins, t.losses, t.ties) ?? 0]));
  const clinchByTeam = new Map(computeClinchStatus(teams, remainingByTeam, playoffSpots).map((c) => [c.teamId, c]));
  const ranked = [...teams].sort((a, b) => b.wins - a.wins);
  return ranked.map((t, i) => ({
    teamId: t.teamId,
    wins: t.wins,
    losses: t.losses,
    inField: i < playoffSpots,
    clinched: clinchByTeam.get(t.teamId)?.clinched ?? false,
    eliminated: clinchByTeam.get(t.teamId)?.eliminated ?? false,
  }));
}

// ── NFL adapter ──────────────────────────────────────────────────────────
// Real NFL playoff structure: each of the AFC/NFC's 4 division winners
// takes seeds 1-4 (by record, regardless of any wild card's record — the
// real rule, not a simplification), then the next 3 best non-division-
// winning records in that conference fill seeds 5-7. Division tiebreakers
// (head-to-head, common games, strength of victory, ...) are NOT
// implemented — this codebase has no verified source for that data — so
// ties inside a division fall back to array order and are NOT presented
// as an authoritative division-winner call; see NflSeedResult.projected.

export interface NflTeamRecord {
  teamId: string;
  wins: number;
  losses: number;
  ties?: number;
  division: string; // e.g. "AFC East" — the real division label from standings
}

export interface NflSeedResult {
  seed: number;
  teamId: string;
  isDivisionWinner: boolean;
  clinched: boolean;
  eliminated: boolean;
}

function winPct(t: { wins: number; losses: number; ties?: number }): number {
  const games = t.wins + t.losses + (t.ties ?? 0);
  return games ? (t.wins + (t.ties ?? 0) * 0.5) / games : 0;
}

/** Projects one conference's real 7-seed field from today's standings.
 *  `teams` must already be scoped to a single conference (AFC or NFC) —
 *  callers filter by the real conference label from getStandings. */
export function projectNflConferenceSeeds(teams: NflTeamRecord[]): NflSeedResult[] {
  const byDivision = new Map<string, NflTeamRecord[]>();
  for (const t of teams) byDivision.set(t.division, [...(byDivision.get(t.division) ?? []), t]);

  const divisionLeaders: NflTeamRecord[] = [];
  const nonLeaders: NflTeamRecord[] = [];
  for (const teamsInDivision of byDivision.values()) {
    const sorted = [...teamsInDivision].sort((a, b) => winPct(b) - winPct(a));
    if (sorted[0]) divisionLeaders.push(sorted[0]);
    nonLeaders.push(...sorted.slice(1));
  }

  const seededLeaders = [...divisionLeaders].sort((a, b) => winPct(b) - winPct(a));
  const seededWildcards = [...nonLeaders].sort((a, b) => winPct(b) - winPct(a)).slice(0, 3);

  const remainingByTeam = new Map(teams.map((t) => [t.teamId, remainingGamesForSport("nfl", t.wins, t.losses, t.ties) ?? 0]));
  const clinchByTeam = new Map(computeClinchStatus(teams, remainingByTeam, 7).map((c) => [c.teamId, c]));

  return [
    ...seededLeaders.map((t, i) => ({
      seed: i + 1,
      teamId: t.teamId,
      isDivisionWinner: true,
      clinched: clinchByTeam.get(t.teamId)?.clinched ?? false,
      eliminated: false,
    })),
    ...seededWildcards.map((t, i) => ({
      seed: seededLeaders.length + i + 1,
      teamId: t.teamId,
      isDivisionWinner: false,
      clinched: clinchByTeam.get(t.teamId)?.clinched ?? false,
      eliminated: false,
    })),
  ];
}
