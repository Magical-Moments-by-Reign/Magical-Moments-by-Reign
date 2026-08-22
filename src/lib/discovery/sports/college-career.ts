// ── College Career resolver (SERVER ONLY) ───────────────────────────
// A pro player's college career is a real, permanent historical record —
// but SportsDataIO's CFB product reliably covers current/recent college
// rosters, not a player who left school years before turning pro. Full
// real, AUTOMATED source chain, same discipline as the rest of Magical
// Sports — no per-player hand-maintained entries in the normal path:
//   1. SportsDataIO CFB (real season stats), matched by the player's real
//      name — works whenever the provider still has that player's college
//      seasons on file. The only tier with full season-by-season stat
//      lines today.
//   2. API-Sports NCAA football player-level stats — no such product is
//      wired into this codebase today; this tier is a documented no-op,
//      never a guess standing in for it.
//   3. The Player Knowledge Provider (player-knowledge.ts) — Wikidata's
//      real, structured "educated at" claim with its real attended-years
//      qualifiers. This confirms the real college and real years attended
//      even when no provider has season-level stats — genuinely automated
//      for any real player, not a curated list.
//   4. CURATED_COLLEGE_CAREERS below is an OVERRIDE/CORRECTION layer only
//      — a small number of real, owner-verified season-stat entries for
//      cases where a human has specifically confirmed detailed stats
//      against a school's official athletics site. It is never the normal
//      path for a new player; the automated tiers above are.
// A caller only shows a plain "not available" message (or, per policy,
// omits the subsection) once every tier above has genuinely returned
// nothing — and never explains which tier failed or why (that belongs in
// admin diagnostics, not in front of a member).

import { fetchAllPlayers, fetchPlayerSeasonStats, type SdioPlayer } from "../providers/sportsdata";
import { withCache, cacheKeyFor } from "../cache";
import { getPlayerKnowledge } from "./player-knowledge";

const TTL_CFB_ROSTER = 360; // minutes — matches the roster-list TTL used elsewhere
const TTL_CFB_HISTORICAL = 60 * 24 * 365; // ~1 year — a completed college season never changes
const CFB_LOOKBACK_YEARS = 6; // generous bound past a real college eligibility window

export interface CollegeSeasonLine {
  season: number;
  classYear?: string; // "Freshman" | "Sophomore" | "Junior" | "Senior" — only when a real source states it
  games?: number;
  starts?: number;
  stats: Record<string, number>; // real, position-appropriate counting stats only
  honors?: string[]; // e.g. "Second-Team All-Big Ten" — real, named honors only
}

export interface CollegeCareerProfile {
  college: string;
  position?: string;
  seasonsAttended: string; // e.g. "2017–2019", from a real source
  /** Full season-by-season stat lines when a tier has them — [] when we
   *  only know the real college/years (Wikidata tier) but no detailed
   *  stats exist anywhere yet. The UI shows the stats subsection only when
   *  this is non-empty; an empty array here is not itself an error. */
  seasons: CollegeSeasonLine[];
  careerTotals?: Record<string, number>;
  source: "sportsdataio" | "wikidata" | "curated";
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function sumSeasons(seasons: CollegeSeasonLine[]): Record<string, number> | undefined {
  if (!seasons.length) return undefined;
  const totals: Record<string, number> = {};
  for (const s of seasons) {
    for (const [field, value] of Object.entries(s.stats)) totals[field] = (totals[field] ?? 0) + value;
  }
  return Object.keys(totals).length ? totals : undefined;
}

function seasonsAttendedLabel(seasons: CollegeSeasonLine[]): string {
  const years = seasons.map((s) => s.season).sort((a, b) => a - b);
  if (!years.length) return "";
  return years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`;
}

// Override/correction registry ONLY — real, owner-verified college career
// stat lines for cases where a human has specifically confirmed detailed
// stats against a school's official athletics site and the automated
// tiers above don't have season-level detail. Keyed by normalized player
// name. Geno Stone is this resolver's original validation entry, kept as
// an example of the override shape — this is deliberately NOT how new
// players get real college data; see the module doc comment above.
const CURATED_COLLEGE_CAREERS: Record<string, CollegeCareerProfile> = {
  "geno stone": {
    college: "Iowa",
    position: "S",
    source: "curated",
    seasonsAttended: "2017–2019",
    seasons: [
      { season: 2017, classYear: "Freshman", stats: { Tackles: 17, Interceptions: 1 } },
      {
        season: 2018,
        games: 13,
        starts: 8,
        stats: { Tackles: 39, Interceptions: 4, InterceptionReturnTouchdowns: 1, FumblesForced: 1 },
        honors: ["Honorable Mention All-Big Ten"],
      },
      {
        season: 2019,
        starts: 13,
        stats: { Tackles: 70, TacklesForLoss: 3, Sacks: 1, Interceptions: 1, PassesDefended: 4, FumblesForced: 3 },
        honors: ["Second-Team All-Big Ten"],
      },
    ],
  },
};

/** Resolves a real player's real college career through the full tiered
 *  source chain, stopping at the first tier with real data — never
 *  blending a guessed season into a partial real record. `league` selects
 *  the right sport keywords for the Wikidata disambiguation tier. Returns
 *  null only when every tier genuinely has nothing. */
export async function getCollegeCareerProfile(name: string, league: "nfl" | "cfb" | "nba" | "wnba", college?: string): Promise<CollegeCareerProfile | null> {
  const target = normalize(name);

  // Tier 1: SportsDataIO CFB, matched by real name.
  const rosterCached = await withCache("sports", "sportsdataio", cacheKeyFor({ league: "cfb", kind: "all_players" }), TTL_CFB_ROSTER, () => fetchAllPlayers("cfb"));
  const cfbPlayer: SdioPlayer | undefined = rosterCached?.data?.find((p) => normalize(p.name) === target);
  if (cfbPlayer) {
    const currentYear = new Date().getUTCFullYear();
    const yearsToCheck: number[] = [];
    for (let yr = currentYear; yr >= currentYear - CFB_LOOKBACK_YEARS; yr--) yearsToCheck.push(yr);
    const rows = (
      await Promise.all(
        yearsToCheck.map(async (yr): Promise<CollegeSeasonLine[]> => {
          const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ league: "cfb", playerId: cfbPlayer.playerId, season: yr, kind: "player_season_stats" }), TTL_CFB_HISTORICAL, () =>
            fetchPlayerSeasonStats("cfb", cfbPlayer.playerId, yr));
          return (cached?.data ?? []).map((row) => ({ season: yr, games: row.stats.Games, starts: row.stats.Started, stats: row.stats }));
        })
      )
    ).flat();
    if (rows.length) {
      return {
        college: cfbPlayer.college ?? college ?? cfbPlayer.team ?? "",
        position: cfbPlayer.position,
        seasonsAttended: seasonsAttendedLabel(rows),
        seasons: rows,
        careerTotals: sumSeasons(rows),
        source: "sportsdataio",
      };
    }
  }

  // Tier 2 (API-Sports NCAA player stats) has no product wired into this
  // codebase — documented gap, not attempted.

  // Tier 3: Player Knowledge Provider (Wikidata) — real "educated at" claim
  // with real attended-years qualifiers. No season-level stats, but a real,
  // automated confirmation of the college and years for any real player
  // Wikidata documents, not just the ones in the override registry below.
  const knowledge = await getPlayerKnowledge(name, league).catch(() => null);
  if (knowledge?.college && (!college || normalize(knowledge.college.name) === normalize(college) || normalize(knowledge.college.name).includes(normalize(college)))) {
    return {
      college: knowledge.college.name,
      seasonsAttended: knowledge.college.startYear
        ? knowledge.college.endYear && knowledge.college.endYear !== knowledge.college.startYear
          ? `${knowledge.college.startYear}–${knowledge.college.endYear}`
          : String(knowledge.college.startYear)
        : "",
      seasons: [],
      source: "wikidata",
    };
  }

  // Tier 4: override/correction registry (see doc comment above).
  const curated = CURATED_COLLEGE_CAREERS[target];
  if (curated && (!college || normalize(curated.college) === normalize(college))) {
    return { ...curated, careerTotals: curated.careerTotals ?? sumSeasons(curated.seasons) };
  }

  return null;
}
