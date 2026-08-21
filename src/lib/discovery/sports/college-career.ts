// ── College Career resolver (SERVER ONLY) ───────────────────────────
// A pro player's college career is a real, permanent historical record —
// but SportsDataIO's CFB product reliably covers current/recent college
// rosters, not a player who left school years before turning pro. Full
// real source chain, same discipline as the rest of Magical Sports:
//   1. SportsDataIO CFB (real season stats), matched by the player's real
//      name — works whenever the provider still has that player's college
//      seasons on file.
//   2. API-Sports NCAA football player-level stats — no such product is
//      wired into this codebase today; this tier is a documented no-op,
//      never a guess standing in for it.
//   3/4. A verified official college athletics source, curated as real,
//      owner-confirmed season lines — the same "tier 4" discipline
//      officialSource.ts already uses for season-opener dates, applied
//      here to full college season stat lines. Every entry is sourced
//      from the player's own school's official athletics site; nothing
//      here is guessed, extrapolated, or auto-generated.
// A caller only shows a plain "not available" message once every tier
// above has genuinely returned nothing — and only that plain message,
// never which tier failed or why (that belongs in admin diagnostics, not
// in front of a member).

import { fetchAllPlayers, fetchPlayerSeasonStats, type SdioPlayer } from "../providers/sportsdata";
import { withCache, cacheKeyFor } from "../cache";

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
  seasonsAttended: string; // e.g. "2017–2019", from real season lines
  seasons: CollegeSeasonLine[];
  careerTotals?: Record<string, number>;
  source: "sportsdataio" | "curated";
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

// Tier 3/4/5 registry — curated, real, owner-verified college career
// records, each sourced from the player's own school's official athletics
// site. Keyed by normalized player name. Geno Stone is this resolver's
// validation entry, not a special case in the code path below — just data;
// add more real, verified entries here as they're confirmed.
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
 *  blending a guessed season into a partial real record. Returns null
 *  only when every tier genuinely has nothing. */
export async function getCollegeCareerProfile(name: string, college?: string): Promise<CollegeCareerProfile | null> {
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

  // Tier 3/4/5: curated, owner-verified official-source record.
  const curated = CURATED_COLLEGE_CAREERS[target];
  if (curated && (!college || normalize(curated.college) === normalize(college))) {
    return { ...curated, careerTotals: curated.careerTotals ?? sumSeasons(curated.seasons) };
  }

  return null;
}
