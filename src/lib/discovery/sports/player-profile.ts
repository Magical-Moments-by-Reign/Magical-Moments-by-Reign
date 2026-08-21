// ── Player Profile — normalized model + resolver (SERVER ONLY) ────────
// One reusable shape the Player Profile page renders regardless of which
// provider/tier answered a given field — the UI never has to know whether a
// value came from the roster list, a season-stats call, or the award-race
// feed. Every field is real or absent; nothing here is invented, and no
// field is ever zero-filled to stand in for "we don't have this."
//
// Magical Sports Data Policy for this page: identity/roster fields and
// season stats come from SportsDataIO (the only provider with player-level
// detail in this codebase); team identity/logo/record are cross-resolved
// against the real API-Sports team catalog the same way the SportsDataIO
// schedule/standings fallbacks already do. College career detail (year-by-
// year stats, bowl games, awards), high-school-era facts beyond the school
// name, and NFL/NBA honors (Pro Bowl, All-Pro, championships) are NOT
// available from either connected provider today and are deliberately left
// undefined rather than guessed — see the page's own "not available yet"
// treatment for those sections, and getPlayerProfileGaps below for an
// explicit, honest list of what a licensed bio/draft data source would add.

import { withCache, cacheKeyFor } from "../cache";
import {
  fetchAllPlayers, fetchRecentTransactions, fetchInjuries, fetchPlayerSeasonStats, fetchTeamRecord,
  type SdioLeague, type SdioTransaction, type SdioInjury,
} from "../providers/sportsdata";
import { AWARD_RACES, getAwardRace } from "./awards";
import { resolveTeamByName, sportSlugForSdio } from "./service";
import { getCollegeCareerProfile, type CollegeCareerProfile } from "./college-career";

const TTL_ROSTER = 360; // minutes — matches the roster-list TTL used elsewhere for this same endpoint
const TTL_STATS = 180; // minutes — the live, still-moving current season
const TTL_HISTORICAL = 60 * 24 * 365; // ~1 year — a completed season's stats/transactions never change, cache aggressively
const TTL_INJURIES = 60;
// When neither the player's real draft year nor experience count tells us
// where their career started, this bounds how far back we check rather
// than guessing an exact start — comfortably past the longest real NFL/NBA
// careers on record. Every season in range is independently, really
// fetched; one with nothing simply doesn't appear — never a fabricated gap
// filled in, never a real season silently dropped because of a fixed cap.
const MAX_SEASON_LOOKBACK = 20;

// Rate/percentage fields aren't meaningfully additive across seasons (you
// can't sum a completion percentage) — Career Totals sums every other
// field and leaves these out rather than publish a misleading average.
const NON_ADDITIVE_STAT_FIELDS = new Set(["PassingCompletionPercentage", "RushingYardsPerAttempt", "ReceivingYardsPerReception", "FieldGoalsPercentage", "ThreePointersPercentage", "FreeThrowsPercentage"]);

export interface PlayerSeasonLine {
  season: number;
  /** The real team this stat line was recorded under. Present whenever the
   *  provider reports it; a player traded mid-season gets one line per real
   *  team rather than one blended line. */
  team?: string;
  stats: Record<string, number>;
}

export interface PlayerAwardAppearance {
  award: string;
  label: string;
  currentRank?: number;
  futuresConsensus?: string;
}

export interface PlayerProfile {
  playerId: string;
  league: SdioLeague;
  name: string;
  team?: string;
  teamLogoUrl?: string;
  teamRecord?: string;
  number?: number;
  position?: string;
  status?: string;
  photoUrl?: string;
  age?: number;
  birthDate?: string;
  heightInches?: number;
  weightLbs?: number;
  birthCity?: string;
  birthState?: string;
  highSchool?: string;
  college?: string;
  /** The player's real college career — full year-by-year stat lines when a
   *  real source has them, resolved through the tiered chain in
   *  college-career.ts. Undefined when the player has no known college;
   *  null when a college is known but no tier could confirm real season
   *  data for it (the page shows a plain "not available" line only then). */
  collegeCareer?: CollegeCareerProfile | null;
  experienceYears?: number;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  draftTeam?: string;
  /** Structured stats for the current season, keyed by the provider's own
   *  field name. Undefined when the stats endpoint has nothing yet. */
  currentSeasonStats?: Record<string, number>;
  currentSeason: number;
  /** Real per-season stat lines, most recent first — every season from the
   *  player's real career start (draft year, or derived from a real
   *  experience count) through the current one that the provider actually
   *  had data for. [] when the stats endpoint has nothing for any season
   *  checked. */
  seasonsBySeason: PlayerSeasonLine[];
  /** Sum of every additive stat field across seasonsBySeason (rate/
   *  percentage fields excluded — see NON_ADDITIVE_STAT_FIELDS). Undefined
   *  when there are no season lines to sum. */
  careerTotals?: Record<string, number>;
  /** Real transaction/roster-move history for this player across their
   *  full real career range (not just the current season) — the honest
   *  source for "The Journey." [] when the league has no transaction feed
   *  (see TRANSACTIONS_SUPPORTED) or none on record. */
  transactions: SdioTransaction[];
  /** Current real injury entries for this player — normally 0 or 1. */
  injuries: SdioInjury[];
  /** Real award-race appearances (Heisman/MVP watch) this player shows up
   *  in, if any. */
  awards: PlayerAwardAppearance[];
}

/** NFL/CFB/NBA seasons are named for the year they start; WNBA plays a
 *  single-calendar-year season. Same convention as sdioSeasonYear in
 *  service.ts, duplicated here to keep this module's only dependency on
 *  service.ts limited to the two named exports it actually needs. */
function currentSeasonYear(league: SdioLeague): number {
  const now = new Date();
  if (league === "wnba") return now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** Where a player's real career started, for deciding how far back to
 *  check for season stats/transactions — never a fixed short window. The
 *  provider's own real draft year is authoritative when we have it; a real
 *  experience-season count is the next best signal; only when neither
 *  exists do we fall back to a generous bound (MAX_SEASON_LOOKBACK) rather
 *  than refusing to look. This never invents which seasons had real
 *  stats — it only decides which years are worth actually asking about. */
export function careerStartYear(player: { draftYear?: number; experienceYears?: number }, currentSeason: number): number {
  if (typeof player.draftYear === "number" && player.draftYear > 1900) return player.draftYear;
  if (typeof player.experienceYears === "number" && player.experienceYears > 0) return currentSeason - player.experienceYears + 1;
  return currentSeason - (MAX_SEASON_LOOKBACK - 1);
}

/** Sums every additive field present across the given season lines —
 *  purely a real-data aggregation, never a fabricated figure. */
export function sumCareerTotals(lines: PlayerSeasonLine[]): Record<string, number> | undefined {
  if (!lines.length) return undefined;
  const totals: Record<string, number> = {};
  for (const line of lines) {
    for (const [field, value] of Object.entries(line.stats)) {
      if (NON_ADDITIVE_STAT_FIELDS.has(field)) continue;
      totals[field] = (totals[field] ?? 0) + value;
    }
  }
  return Object.keys(totals).length ? totals : undefined;
}

/** Resolves the full normalized profile for one player. Returns null only
 *  when the player can't be found in the league's roster list at all —
 *  every other field degrades gracefully to undefined/[] rather than
 *  failing the whole page. */
export async function getPlayerProfile(league: SdioLeague, playerId: string): Promise<PlayerProfile | null> {
  const rosterCached = await withCache("sports", "sportsdataio", cacheKeyFor({ league, kind: "all_players" }), TTL_ROSTER, () => fetchAllPlayers(league));
  const player = rosterCached?.data?.find((p) => p.playerId === playerId);
  if (!player) return null;

  const season = currentSeasonYear(league);
  const sport = sportSlugForSdio(league);
  const startYear = careerStartYear(player, season);
  const seasonsToCheck: number[] = [];
  for (let yr = season; yr >= startYear; yr--) seasonsToCheck.push(yr);

  const [team, teamRecord, seasonLines, transactionsBySeason, injuriesAll, awardRaces, collegeCareer] = await Promise.all([
    player.team ? resolveTeamByName(sport, player.team) : Promise.resolve(null),
    fetchTeamRecord(league, player.teamId ?? player.team, season),
    Promise.all(
      seasonsToCheck.map(async (yr): Promise<PlayerSeasonLine[]> => {
        const ttl = yr === season ? TTL_STATS : TTL_HISTORICAL;
        const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ league, playerId, season: yr, kind: "player_season_stats" }), ttl, () =>
          fetchPlayerSeasonStats(league, playerId, yr));
        return (cached?.data ?? []).map((row) => ({ season: yr, team: row.team, stats: row.stats }));
      })
    ).then((rows) => rows.flat()),
    Promise.all(
      seasonsToCheck.map(async (yr) => {
        const ttl = yr === season ? TTL_STATS : TTL_HISTORICAL;
        const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ league, season: yr, kind: "transactions" }), ttl, () =>
          fetchRecentTransactions(league, yr));
        return cached?.data ?? [];
      })
    ),
    withCache("sports", "sportsdataio", cacheKeyFor({ league, kind: "injuries" }), TTL_INJURIES, () => fetchInjuries(league)),
    Promise.all(
      AWARD_RACES.filter((r) => r.league === league).map(async (r): Promise<PlayerAwardAppearance | null> => {
        const entries = await getAwardRace(r.league, r.award);
        const mine = entries.find((e) => e.playerId === playerId);
        return mine ? { award: r.award, label: r.label, currentRank: mine.currentRank, futuresConsensus: mine.futuresConsensus } : null;
      })
    ).then((rows) => rows.filter((r): r is PlayerAwardAppearance => r !== null)),
    // A "college career" section only makes sense for a pro-league player
    // (nfl/nba/wnba) — a cfb league profile IS the college record itself,
    // shown in the main Professional Career section already.
    league !== "cfb" && player.college ? getCollegeCareerProfile(player.name, player.college) : Promise.resolve(undefined),
  ]);

  return {
    playerId: player.playerId,
    league,
    name: player.name,
    team: player.team,
    teamLogoUrl: team?.logoUrl,
    teamRecord,
    number: player.number,
    position: player.position,
    status: player.status,
    photoUrl: player.photoUrl,
    age: player.age,
    birthDate: player.birthDate,
    heightInches: player.heightInches,
    weightLbs: player.weightLbs,
    birthCity: player.birthCity,
    birthState: player.birthState,
    highSchool: player.highSchool,
    college: player.college,
    collegeCareer,
    experienceYears: player.experienceYears,
    draftYear: player.draftYear,
    draftRound: player.draftRound,
    draftPick: player.draftPick,
    draftTeam: player.draftTeam,
    currentSeasonStats: seasonLines.find((s) => s.season === season)?.stats,
    currentSeason: season,
    seasonsBySeason: seasonLines,
    careerTotals: sumCareerTotals(seasonLines),
    transactions: transactionsBySeason.flatMap((rows) => rows ?? []).filter((t) => t.playerId === playerId),
    injuries: (injuriesAll?.data ?? []).filter((i) => i.playerId === playerId),
    awards: awardRaces,
  };
}

/** Finds a SportsDataIO playerId for a real name within a league — the
 *  bridge that lets an API-Sports-sourced roster card (a different id
 *  space) link into this SportsDataIO-keyed profile. Exact normalized-name
 *  match only, same discipline as the rest of this codebase's cross-
 *  provider team-name matching — never a fuzzy guess that could link to the
 *  wrong player. Returns null when nothing matches confidently. */
export async function findPlayerIdByName(league: SdioLeague, name: string): Promise<string | null> {
  const rosterCached = await withCache("sports", "sportsdataio", cacheKeyFor({ league, kind: "all_players" }), TTL_ROSTER, () => fetchAllPlayers(league));
  const roster = rosterCached?.data;
  if (!roster?.length) return null;
  const target = name.toLowerCase().trim();
  return roster.find((p) => p.name.toLowerCase().trim() === target)?.playerId ?? null;
}
