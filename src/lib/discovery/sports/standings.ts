// ── Standings normalization (PURE — no I/O, easily testable) ──────
// Turns a flat SportsStanding[] into the real league structure fans expect:
// MLB's AL/NL → East/Central/West, NFL's AFC/NFC → North/South/East/West,
// NBA/WNBA's Eastern/Western conferences (no division split — matches how
// those are actually presented), one flat table for everything else. Every
// grouping label comes straight from the provider's own conference/division
// fields (SportsStanding.group/division) — never hardcoded by team name.
// Rank/games-behind are computed from real wins/losses for win-loss sports;
// points-based tables (soccer) are left in the provider's own order/rank.

import type { SportSlug, SportsStanding } from "../providers/sports";

export interface RankedStandingRow extends SportsStanding {
  displayRank: number;
  gb: number | null;
}

export interface StandingsDivision {
  /** Empty string when this sport/group has no real division split — the
   *  rows render directly under the group heading with no sub-heading. */
  label: string;
  rows: RankedStandingRow[];
}

export interface StandingsGroup {
  /** Empty string only for the single implicit group of an entirely
   *  ungrouped sport (no real conference/league data at all). */
  label: string;
  divisions: StandingsDivision[];
}

// Sports whose real ranking is win-loss based — re-rank by actual win
// percentage rather than trusting row order or a possibly division-scoped
// provider rank field. Deliberately excludes points-based tables (soccer,
// rugby) where win% is NOT the real ranking metric and would mis-rank them.
const WIN_PCT_SPORTS: ReadonlySet<SportSlug> = new Set(["nfl", "ncaaf", "nba", "wnba", "ncaab", "mlb", "ncaabaseball", "nhl"]);

// NHL's real standings are points-based (2 for a win, 1 for an overtime/
// shootout loss, 0 for a regulation loss) — a plain win% ranking mis-orders
// two teams with the same win count but a different number of OT losses.
// Ranked by the provider's own real `points` field when the response
// includes one (checked first, below); nhl stays in WIN_PCT_SPORTS above so
// it still falls back to real win%-based ranking (the previous behavior,
// strictly better than provider row order) on the rare response with no
// points field, rather than losing ranking entirely.
const POINTS_RANKED_SPORTS: ReadonlySet<SportSlug> = new Set(["nhl"]);

// Sports whose real structure is (league/conference) → (division) → teams.
// Everything else groups one level deep (conference only, e.g. NBA/WNBA) or
// not at all (whatever the provider's `group` field does or doesn't give).
const TWO_LEVEL_SPORTS: ReadonlySet<SportSlug> = new Set(["nfl", "mlb", "nhl"]);

const LEAGUE_ABBR_LABEL: Record<string, string> = { AL: "American League", NL: "National League" };

/** When a row carries a division label but no top-level group (e.g. the
 *  provider only returns "AL West", not a separate "American League"
 *  wrapper), derive the real top-level league from that same real string's
 *  own standard prefix — expanding a well-known abbreviation the provider
 *  itself returned, never inventing a new fact. */
function deriveGroupFromDivision(division: string): string | undefined {
  const m = division.match(/^(AL|NL|AFC|NFC)\b/i);
  if (!m) return undefined;
  const abbr = m[1].toUpperCase();
  return LEAGUE_ABBR_LABEL[abbr] ?? abbr;
}

function winPct(s: SportsStanding): number {
  const w = s.wins ?? 0, l = s.losses ?? 0;
  return w + l > 0 ? w / (w + l) : 0;
}

function gamesBehind(leader: SportsStanding, team: SportsStanding): number | null {
  if (leader.wins == null || leader.losses == null || team.wins == null || team.losses == null) return null;
  return (leader.wins - team.wins + (team.losses - leader.losses)) / 2;
}

function sortByWinPct(rows: SportsStanding[]): SportsStanding[] {
  return [...rows].sort((a, b) => winPct(b) - winPct(a) || (b.wins ?? 0) - (a.wins ?? 0) || a.team.name.localeCompare(b.team.name));
}

function sortByPoints(rows: SportsStanding[]): SportsStanding[] {
  return [...rows].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.wins ?? 0) - (a.wins ?? 0) || a.team.name.localeCompare(b.team.name));
}

type RankMode = "winpct" | "points" | "provider";

function rankRows(rows: SportsStanding[], mode: RankMode): RankedStandingRow[] {
  if (mode === "provider") return rows.map((s, i) => ({ ...s, displayRank: s.rank ?? i + 1, gb: null }));
  const ordered = mode === "points" ? sortByPoints(rows) : sortByWinPct(rows);
  const leader = ordered[0];
  // Games-behind is a win-loss-delta formula — it doesn't translate to a
  // points table (a 2-1-0 hockey standings row isn't "games behind" the
  // same way a plain win-loss one is), so it's only ever computed in
  // win%-ranked mode; points-ranked and provider-order tables leave it null.
  return ordered.map((s, i) => ({ ...s, displayRank: i + 1, gb: mode === "winpct" ? (i === 0 ? 0 : gamesBehind(leader, s)) : null }));
}

/** The one reusable, sport-aware standings transformer — every Standings
 *  panel calls this instead of rendering a flat provider array. Returns []
 *  for an empty input. */
export function normalizeStandingsBySport(sport: SportSlug, standings: SportsStanding[]): StandingsGroup[] {
  if (!standings.length) return [];
  // Points-ranked only when the provider actually returned real points data
  // for this response — a points-ranked sport with no points field falls
  // back to win% rather than ranking every team as a 0-way tie.
  const rankMode: RankMode = POINTS_RANKED_SPORTS.has(sport) && standings.some((s) => typeof s.points === "number")
    ? "points"
    : WIN_PCT_SPORTS.has(sport)
    ? "winpct"
    : "provider";
  const twoLevel = TWO_LEVEL_SPORTS.has(sport);

  const enriched = standings.map((s) => {
    const division = s.division;
    const group = s.group ?? (division ? deriveGroupFromDivision(division) : undefined);
    return { ...s, _group: group, _division: division };
  });

  const hasGroups = enriched.some((s) => s._group);
  if (!hasGroups) {
    return [{ label: "", divisions: [{ label: "", rows: rankRows(enriched, rankMode) }] }];
  }

  const byGroup = new Map<string, typeof enriched>();
  for (const s of enriched) {
    const key = s._group ?? "Other";
    byGroup.set(key, [...(byGroup.get(key) ?? []), s]);
  }

  return Array.from(byGroup.entries()).map(([label, groupRows]) => {
    const hasDivisions = twoLevel && groupRows.some((r) => r._division);
    if (!hasDivisions) {
      return { label, divisions: [{ label: "", rows: rankRows(groupRows, rankMode) }] };
    }
    const byDivision = new Map<string, typeof groupRows>();
    for (const r of groupRows) {
      const key = r._division ?? "Other";
      byDivision.set(key, [...(byDivision.get(key) ?? []), r]);
    }
    const divisions = Array.from(byDivision.entries()).map(([divLabel, rows]) => ({
      label: divLabel,
      rows: rankRows(rows, rankMode),
    }));
    return { label, divisions };
  });
}

// ── Season/phase label ─────────────────────────────────────────────
// What the Standings panel is actually looking at, in plain words — driven
// entirely by real dated games we've already fetched (the same preseason/
// regular/postseason openers the hero countdown and header footnotes use)
// and the exact season string the standings query itself resolved to
// (SportsStandingsResult.season) — never a separately-guessed "today's
// season" that could disagree with what was actually returned.

export type SeasonPhase = "preseason" | "regular" | "postseason";

export interface SeasonPhaseInputs {
  now: number;
  preseasonGameStartsAt?: string | null;
  regularGameStartsAt?: string | null;
  postseasonGameStartsAt?: string | null;
}

/** Where we are right now relative to the real, provider-reported season
 *  openers. "preseason" covers both "before this season's preseason
 *  starts" and "we don't even have this season's schedule posted yet" —
 *  both cases mean whatever standings are on screen belong to the last
 *  COMPLETED season, not a new one that hasn't started. */
export function determineSeasonPhase(inputs: SeasonPhaseInputs): SeasonPhase {
  const pre = inputs.preseasonGameStartsAt ? +new Date(inputs.preseasonGameStartsAt) : null;
  const reg = inputs.regularGameStartsAt ? +new Date(inputs.regularGameStartsAt) : null;
  const post = inputs.postseasonGameStartsAt ? +new Date(inputs.postseasonGameStartsAt) : null;
  if (post != null && inputs.now >= post) return "postseason";
  if (reg != null && inputs.now >= reg) return "regular";
  if (pre != null && inputs.now >= pre) return "preseason";
  return "preseason";
}

/** "2025-2026" -> "2025–26"; a plain single year (NFL/MLB-style) is left
 *  as-is. Purely a display transform of the real season string the
 *  standings query itself resolved to — never invented. */
function formatSeasonYears(season: string): string {
  const m = season.match(/^(\d{4})-(\d{4})$/);
  return m ? `${m[1]}–${m[2].slice(2)}` : season;
}

/** The label to show above a Standings panel — e.g. "2025–26 Final Regular
 *  Season Standings" during the 2026 preseason/offseason, or "2026–27
 *  Regular Season Standings" once that season is actually underway. Null
 *  when there's no season string to attach (nothing fetched yet). This
 *  never fabricates a separate preseason win-loss table — there is no
 *  verified source for one, so a "preseason" phase just means the last
 *  completed regular season is what's shown, labeled as Final. */
export function formatSeasonLabel(season: string | undefined, phase: SeasonPhase): string | null {
  if (!season) return null;
  const years = formatSeasonYears(season);
  return phase === "regular" ? `${years} Regular Season Standings` : `${years} Final Regular Season Standings`;
}
