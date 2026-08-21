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

const TTL_ROSTER = 360; // minutes — matches the roster-list TTL used elsewhere for this same endpoint
const TTL_STATS = 180; // minutes
const TTL_TRANSACTIONS = 180;
const TTL_INJURIES = 60;
const SEASONS_BACK = 4; // current season + up to 3 prior, for the "By Season" table

export interface PlayerSeasonLine {
  season: number;
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
  experienceYears?: number;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  draftTeam?: string;
  /** Structured stats for the current season, keyed by the provider's own
   *  field name. Undefined when the stats endpoint has nothing yet. */
  currentSeasonStats?: Record<string, number>;
  currentSeason: number;
  /** Real per-season stat lines, most recent first — [] when the stats
   *  endpoint has nothing for any of the recent seasons checked. */
  seasonsBySeason: PlayerSeasonLine[];
  /** Real transaction/roster-move history for this player this season —
   *  the honest source for "Career Timeline." [] when the league has no
   *  transaction feed (see TRANSACTIONS_SUPPORTED) or none this season. */
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

  const [team, teamRecord, seasonLines, transactionsAll, injuriesAll, awardRaces] = await Promise.all([
    player.team ? resolveTeamByName(sport, player.team) : Promise.resolve(null),
    fetchTeamRecord(league, player.teamId ?? player.team, season),
    Promise.all(
      Array.from({ length: SEASONS_BACK }, (_, i) => season - i).map(async (yr): Promise<PlayerSeasonLine | null> => {
        const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ league, playerId, season: yr, kind: "player_season_stats" }), TTL_STATS, () =>
          fetchPlayerSeasonStats(league, playerId, yr));
        return cached?.data ? { season: yr, stats: cached.data } : null;
      })
    ).then((rows) => rows.filter((r): r is PlayerSeasonLine => r !== null)),
    withCache("sports", "sportsdataio", cacheKeyFor({ league, season, kind: "transactions" }), TTL_TRANSACTIONS, () => fetchRecentTransactions(league, season)),
    withCache("sports", "sportsdataio", cacheKeyFor({ league, kind: "injuries" }), TTL_INJURIES, () => fetchInjuries(league)),
    Promise.all(
      AWARD_RACES.filter((r) => r.league === league).map(async (r): Promise<PlayerAwardAppearance | null> => {
        const entries = await getAwardRace(r.league, r.award);
        const mine = entries.find((e) => e.playerId === playerId);
        return mine ? { award: r.award, label: r.label, currentRank: mine.currentRank, futuresConsensus: mine.futuresConsensus } : null;
      })
    ).then((rows) => rows.filter((r): r is PlayerAwardAppearance => r !== null)),
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
    experienceYears: player.experienceYears,
    draftYear: player.draftYear,
    draftRound: player.draftRound,
    draftPick: player.draftPick,
    draftTeam: player.draftTeam,
    currentSeasonStats: seasonLines.find((s) => s.season === season)?.stats,
    currentSeason: season,
    seasonsBySeason: seasonLines,
    transactions: (transactionsAll?.data ?? []).filter((t) => t.playerId === playerId),
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
