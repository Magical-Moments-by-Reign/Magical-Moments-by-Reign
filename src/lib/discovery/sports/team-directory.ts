// ── Team Directory — browse every team in a league, grouped correctly ──
// (SERVER ONLY) Powers the "All Teams" panel: every team in the league,
// under its real conference/division, with a real resolved logo. Team
// identity/logo is always resolved live against the API-Sports team
// catalog (buildTeamDirectoryFromCatalog for most sports;
// resolveVerifiedTeamIdentity against the same real catalog for NBA/NFL's
// VERIFIED_REFERENCE) — never a locally invented or cached-forever image.
// Rosters are NOT fetched here — that's lazy-loaded per team from
// the client only when a team's card is actually opened (see
// /api/discovery/sports/team-roster), so this never burns the paid API
// quota fetching all 30+ rosters on every page view.

import type { SportSlug, SportsStanding, SportsTeam } from "../providers/sports";
import type { StandingsGroup } from "./standings";
import { getLeagueTeamCatalog, resolveDefaultLeagueId } from "./service";

export interface DirectoryTeam {
  id: string;
  name: string;
  logoUrl?: string;
  /** The real league/conference and division this team's card is already
   *  grouped under (mirrors the surrounding DirectoryGroup/DirectoryDivision
   *  labels) — carried on the team itself too so a card can show "American
   *  League · East" without the caller re-threading the group context. */
  league?: string;
  division?: string;
  /** A real "W-L" (or "W-L-T") record from the same live standings row
   *  used for grouping, when Standings has one for this team — never
   *  computed or guessed. Undefined when Standings doesn't have this team
   *  yet (off-season, restriction, etc.); the UI shows "Record unavailable"
   *  rather than a fabricated number. */
  record?: string;
}

export interface DirectoryDivision {
  label: string;
  teams: DirectoryTeam[];
}

export interface DirectoryGroup {
  label: string;
  divisions: DirectoryDivision[];
}

// Real, stable NBA conference/division alignment — this is public,
// unchanging league organizational structure (unchanged since the 2004-05
// realignment), not provider-supplied data, so it's safe to state directly
// rather than depend on API-Sports' own conference/division fields being
// populated for this sport. Team NAMES here are matched against the real
// API-Sports team catalog below — the id/logo shown is always the live,
// resolved one, never invented.
const NBA_DIVISIONS: { conference: string; division: string; teams: string[] }[] = [
  { conference: "Eastern Conference", division: "Atlantic Division", teams: ["Boston Celtics", "Brooklyn Nets", "New York Knicks", "Philadelphia 76ers", "Toronto Raptors"] },
  { conference: "Eastern Conference", division: "Central Division", teams: ["Chicago Bulls", "Cleveland Cavaliers", "Detroit Pistons", "Indiana Pacers", "Milwaukee Bucks"] },
  { conference: "Eastern Conference", division: "Southeast Division", teams: ["Atlanta Hawks", "Charlotte Hornets", "Miami Heat", "Orlando Magic", "Washington Wizards"] },
  { conference: "Western Conference", division: "Northwest Division", teams: ["Denver Nuggets", "Minnesota Timberwolves", "Oklahoma City Thunder", "Portland Trail Blazers", "Utah Jazz"] },
  { conference: "Western Conference", division: "Pacific Division", teams: ["Golden State Warriors", "LA Clippers", "Los Angeles Lakers", "Phoenix Suns", "Sacramento Kings"] },
  { conference: "Western Conference", division: "Southwest Division", teams: ["Dallas Mavericks", "Houston Rockets", "Memphis Grizzlies", "New Orleans Pelicans", "San Antonio Spurs"] },
];

// Real, stable NFL conference/division alignment (32 teams, 4 per division,
// 4 divisions per conference) — the league's own public structure, not
// provider-supplied data, so it's safe to state directly the same way
// NBA_DIVISIONS is. Used both for the All Teams directory and as the
// verified fallback the Standings panel fills in with when a provider
// hasn't posted a season's win-loss data yet (see
// getVerifiedStandingsFallback below) — a customer should never see "No
// standings data returned" for a league whose real structure we already
// know for certain.
const NFL_DIVISIONS: { conference: string; division: string; teams: string[] }[] = [
  { conference: "AFC", division: "AFC East", teams: ["Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets"] },
  { conference: "AFC", division: "AFC North", teams: ["Baltimore Ravens", "Cincinnati Bengals", "Cleveland Browns", "Pittsburgh Steelers"] },
  { conference: "AFC", division: "AFC South", teams: ["Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Tennessee Titans"] },
  { conference: "AFC", division: "AFC West", teams: ["Denver Broncos", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers"] },
  { conference: "NFC", division: "NFC East", teams: ["Dallas Cowboys", "New York Giants", "Philadelphia Eagles", "Washington Commanders"] },
  { conference: "NFC", division: "NFC North", teams: ["Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings"] },
  { conference: "NFC", division: "NFC South", teams: ["Atlanta Falcons", "Carolina Panthers", "New Orleans Saints", "Tampa Bay Buccaneers"] },
  { conference: "NFC", division: "NFC West", teams: ["Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks"] },
];

const VERIFIED_REFERENCE: Partial<Record<SportSlug, { conference: string; division: string; teams: string[] }[]>> = {
  nba: NBA_DIVISIONS,
  nfl: NFL_DIVISIONS,
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Real "W-L" (or "W-L-T" when the sport tracks ties) record string from a
 *  standings row's own real wins/losses — never computed or guessed, never
 *  returned when either real number is missing. The one place this
 *  formatting rule lives, so buildTeamDirectoryFromCatalog and the
 *  VERIFIED_REFERENCE (NBA/NFL) directory path below can never drift from
 *  each other on what a "record" string looks like. */
function formatRecord(wins: number | undefined, losses: number | undefined, ties: number | undefined): string | undefined {
  return typeof wins === "number" && typeof losses === "number"
    ? `${wins}-${losses}${typeof ties === "number" && ties > 0 ? `-${ties}` : ""}`
    : undefined;
}

/** Real record per team id, straight from already-fetched real standings
 *  rows — no second standings fetch. Shared by buildTeamDirectoryFromCatalog
 *  (which additionally uses these same rows for group/division labeling)
 *  and getTeamDirectory's VERIFIED_REFERENCE (NBA/NFL) path below, which
 *  only needs the record half of that same data. */
function buildRecordByTeamId(standingsGroups: StandingsGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of standingsGroups) {
    for (const d of g.divisions) {
      for (const r of d.rows) {
        const record = formatRecord(r.wins, r.losses, r.ties);
        if (record) map.set(r.team.id, record);
      }
    }
  }
  return map;
}

// Confirmed, real provider naming differences ONLY — an entry here must
// represent an independently verified real mismatch between our static
// VERIFIED_REFERENCE name and the live API-Sports catalog's actual name
// for that same real team; never a guess. Starts empty: this sandbox has
// no live API-Sports key to compare against, so no mismatch here has been
// confirmed yet. resolveVerifiedTeamIdentity's diagnostic log below is
// exactly how a real mismatch gets discovered once this runs against a
// live catalog — add the confirmed pair here only after that, never
// speculatively. Never a substring/fuzzy rule (e.g. stripping "Los
// Angeles" to "LA") — that risks silently cross-matching two differently
// located real teams that happen to share a short form.
const VERIFIED_TEAM_ALIASES: Partial<Record<SportSlug, Record<string, string>>> = {};

function buildCatalogNameIndex(catalog: SportsTeam[]): Map<string, SportsTeam> {
  return new Map(catalog.map((t) => [normalize(t.name), t]));
}

/** ONE shared resolver for every VERIFIED_REFERENCE (NBA/NFL) static team
 *  name — replaces the two separate, duplicated
 *  `rosterMap.get(normalize(name))` lookups that used to live here (one in
 *  getVerifiedStandingsFallback, one in resolveDivisions), so a real
 *  provider-naming fix only ever needs to happen in one place. Exact
 *  normalized full-name match against the real, live catalog first; a
 *  confirmed VERIFIED_TEAM_ALIASES entry only when the real provider
 *  spells this specific team differently. Never a substring/fuzzy match —
 *  "LA" must never match "Los Angeles", and two real teams that share a
 *  city name must never cross-match. Returns null (never a guessed team)
 *  when nothing in the real catalog matches confidently — logging a miss
 *  is the caller's job (see resolveDivisions), not this function's, so a
 *  page rendering 30 teams doesn't emit 30 separate log lines. */
function resolveVerifiedTeamIdentity(sport: SportSlug, staticName: string, catalogByName: Map<string, SportsTeam>): SportsTeam | null {
  const direct = catalogByName.get(normalize(staticName));
  if (direct) return direct;
  const alias = VERIFIED_TEAM_ALIASES[sport]?.[staticName];
  return alias ? catalogByName.get(normalize(alias)) ?? null : null;
}

/** Fetches the real, live team catalog for a VERIFIED_REFERENCE sport's
 *  resolved league — the one shared fetch point both getTeamDirectory and
 *  getVerifiedStandingsFallback use so a real API-Sports naming mismatch
 *  only ever needs fixing once. Returns [] on no resolved league or a
 *  failed call — callers already treat an empty catalog as "show every
 *  team without id/logo," never as an error. */
async function fetchVerifiedTeamCatalog(sport: SportSlug): Promise<SportsTeam[]> {
  const league = await resolveDefaultLeagueId(sport).catch(() => null);
  if (!league) return [];
  return getLeagueTeamCatalog(sport, league).catch(() => []);
}

/** Fills in the complete, real league structure (every real team, under its
 *  real conference/division) whenever live provider standings don't already
 *  cover the whole league — never a generic "No standings data returned"
 *  for a sport whose real structure is public and unchanging. A team the
 *  live data already has a record for keeps that real record; a team with
 *  no live record gets 0-0 ONLY when `allowZeroFill` is true (i.e. the
 *  caller has already confirmed, from real game-date data, that this
 *  season genuinely hasn't started) — otherwise it's left with
 *  wins/losses undefined, which the Standings panel renders as an honest
 *  "—" rather than a fabricated record. Sports with no verified reference
 *  (everything but NBA/NFL today) return `liveRows` unchanged. */
export async function getVerifiedStandingsFallback(sport: SportSlug, liveRows: SportsStanding[], allowZeroFill: boolean): Promise<SportsStanding[]> {
  const spec = VERIFIED_REFERENCE[sport];
  if (!spec) return liveRows;
  const totalRealTeams = spec.reduce((n, s) => n + s.teams.length, 0);
  if (liveRows.length >= totalRealTeams) return liveRows;

  try {
    const liveByName = new Map(liveRows.map((r) => [normalize(r.team.name), r]));
    // Prefetched ONCE for the whole league rather than once per team — see
    // fetchVerifiedTeamCatalog's doc comment for why resolving 30 team
    // names via 30 separate concurrent live calls left different teams'
    // logos randomly blank from one page load to the next.
    const catalogByName = buildCatalogNameIndex(await fetchVerifiedTeamCatalog(sport));
    const merged: SportsStanding[] = [];
    for (const { conference, division, teams } of spec) {
      for (const name of teams) {
        const live = liveByName.get(normalize(name));
        if (live) {
          merged.push({ ...live, group: live.group ?? conference, division: live.division ?? division });
          continue;
        }
        const team = resolveVerifiedTeamIdentity(sport, name, catalogByName);
        merged.push({
          // An unresolved team gets NO id, never the team name standing in
          // as one — a name isn't a real API-Sports team id, and using it
          // as one used to send a doomed roster lookup for a team whose
          // logo was already honestly missing (see TeamRosterPanel's own
          // guard on an empty id).
          team: { id: team?.id ?? "", name, logoUrl: team?.logoUrl },
          wins: allowZeroFill ? 0 : undefined,
          losses: allowZeroFill ? 0 : undefined,
          group: conference,
          division,
        });
      }
    }
    return merged;
  } catch {
    // A live team-resolution call failing unexpectedly must never take the
    // whole Standings panel down with it — fall back to whatever real rows
    // the primary/secondary providers already returned.
    return liveRows;
  }
}

async function resolveDivisions(sport: SportSlug, spec: { conference: string; division: string; teams: string[] }[], recordByTeamId: Map<string, string>, logDiagnostics: boolean): Promise<DirectoryGroup[]> {
  try {
    const catalogByName = buildCatalogNameIndex(await fetchVerifiedTeamCatalog(sport));
    const misses: string[] = [];
    const byConference = new Map<string, DirectoryDivision[]>();
    for (const { conference, division, teams } of spec) {
      const resolved: DirectoryTeam[] = teams.map((name) => {
        const team = resolveVerifiedTeamIdentity(sport, name, catalogByName);
        if (!team && logDiagnostics) misses.push(name);
        // See getVerifiedStandingsFallback's comment on this same pattern —
        // an unresolved team gets no id, never its own name standing in.
        // A resolved team's record comes from the real standings the
        // caller already fetched (buildRecordByTeamId) — never a second
        // standings/provider fetch from inside this loop.
        return { id: team?.id ?? "", name, logoUrl: team?.logoUrl, league: conference, division, record: team ? recordByTeamId.get(team.id) : undefined };
      });
      const divisions = byConference.get(conference) ?? [];
      divisions.push({ label: division, teams: resolved });
      byConference.set(conference, divisions);
    }
    // ONE aggregated log line, never one per team — and only when the
    // caller has explicitly opted in (getTeamDirectory gates this to the
    // Owner's own page views, the same admin-diagnostic trust boundary
    // /api/discovery/sports/team-roster already uses for its
    // ownerDiagnostic field), so this never spams production logs on
    // every member's page view. A team the real catalog genuinely can't
    // match is still shown (honestly, with no id/logo) regardless of
    // whether logDiagnostics is on — this only controls whether the miss
    // gets reported anywhere. Once a listed name is independently
    // confirmed as a real provider naming difference (not a genuine
    // catalog gap), add it to VERIFIED_TEAM_ALIASES.
    if (logDiagnostics && misses.length) {
      console.warn(`[team-directory] ${sport}: ${misses.length} of ${spec.reduce((n, s) => n + s.teams.length, 0)} static team(s) had no real catalog match — ${misses.join(", ")}`);
    }
    return Array.from(byConference.entries()).map(([label, divisions]) => ({ label, divisions }));
  } catch {
    // A live team-resolution call failing unexpectedly must never take the
    // All Teams directory down with it.
    return [];
  }
}

/** Every team in the league under its real conference/division, with a
 *  live-resolved logo and — when the caller passes real standings — a real
 *  W-L(-T) record (see buildRecordByTeamId). NBA and NFL have a verified
 *  static reference today (see VERIFIED_REFERENCE above) — every other
 *  sport returns [] here and the caller falls back to whatever grouping
 *  the Standings panel already derived from real provider data for that
 *  sport. `standingsGroups` defaults to [] for callers (e.g. the Team
 *  Detail page's own getTeamById lookup) that don't need a record on the
 *  result and already fetch one separately when they do. `logDiagnostics`
 *  should only ever be true for an Owner's own page view (see
 *  resolveDivisions) — never wired to a member-visible request. */
export async function getTeamDirectory(sport: SportSlug, standingsGroups: StandingsGroup[] = [], logDiagnostics = false): Promise<DirectoryGroup[]> {
  const spec = VERIFIED_REFERENCE[sport];
  if (!spec) return [];
  return resolveDivisions(sport, spec, buildRecordByTeamId(standingsGroups), logDiagnostics);
}

/** Whether this sport has a verified, hardcoded-but-real conference/
 *  division reference (see VERIFIED_REFERENCE above) — callers use this to
 *  decide whether to source the All Teams directory / Standings fallback
 *  from that reference or fall back to whatever the live provider data
 *  itself derived. */
export function hasVerifiedReference(sport: SportSlug): boolean {
  return sport in VERIFIED_REFERENCE;
}

/** Builds the All Teams directory for a sport with no VERIFIED_REFERENCE
 *  from the real, live team catalog (service.ts's getLeagueTeamCatalog) —
 *  the PRIMARY source, so the directory shows every real team the provider
 *  has regardless of whether Standings happened to succeed. Standings'
 *  own conference/division grouping is used only as presentation labeling
 *  for teams standings already covers — never as the gate on whether a
 *  team appears at all. A catalog team with no matching standings row (a
 *  Standings failure/restriction, an off-season with no win-loss data yet,
 *  or simply a team the standings response doesn't carry) still appears,
 *  under an honest fallback bucket ("<Sport> (Standings unavailable)" when
 *  Standings itself came back empty/restricted, or plain "<Sport>" when it
 *  has data for other teams but just not this one) rather than silently
 *  vanishing. Pure — no I/O; the catalog and standings groups are both
 *  fetched by the caller. Returns [] when the catalog itself is empty (the
 *  caller should fall back to deriving groups straight from
 *  standingsGroups in that case, same as before this existed). */
export function buildTeamDirectoryFromCatalog(
  sportLabel: string,
  catalog: SportsTeam[],
  standingsGroups: StandingsGroup[],
  standingsAvailable: boolean,
): DirectoryGroup[] {
  if (!catalog.length) return [];
  const locationByTeamId = new Map<string, { group: string; division: string; record?: string }>();
  for (const g of standingsGroups) {
    for (const d of g.divisions) {
      for (const r of d.rows) {
        locationByTeamId.set(r.team.id, { group: g.label || sportLabel, division: d.label, record: formatRecord(r.wins, r.losses, r.ties) });
      }
    }
  }
  const fallbackGroupLabel = standingsAvailable ? sportLabel : `${sportLabel} (Standings unavailable)`;
  const groups = new Map<string, Map<string, DirectoryTeam[]>>();
  for (const t of catalog) {
    const loc = locationByTeamId.get(t.id) ?? { group: fallbackGroupLabel, division: "", record: undefined };
    const divisions = groups.get(loc.group) ?? new Map<string, DirectoryTeam[]>();
    const teams = divisions.get(loc.division) ?? [];
    teams.push({ id: t.id, name: t.name, logoUrl: t.logoUrl, league: loc.group, division: loc.division, record: loc.record });
    divisions.set(loc.division, teams);
    groups.set(loc.group, divisions);
  }
  return Array.from(groups.entries()).map(([label, divisions]) => ({
    label,
    divisions: Array.from(divisions.entries()).map(([label, teams]) => ({ label, teams })),
  }));
}

/** Resolves one real team's identity (id/name/live-resolved logo) from a
 *  bare team id — the Team Detail page's entry point (see
 *  team/[sport]/[teamId]/page.tsx). NBA/NFL (hasVerifiedReference) are
 *  looked up in the verified conference/division reference so the id
 *  always matches what Standings/All Teams already show for that team;
 *  every other sport resolves it against the real, live team catalog for
 *  the sport's resolved default league — the same primary source the All
 *  Teams directory itself uses. Returns null (never a fabricated team)
 *  when the sport has no resolved league yet, the catalog/directory call
 *  fails, or nothing matches this id. */
export async function getTeamById(sport: SportSlug, teamId: string): Promise<DirectoryTeam | null> {
  if (!teamId) return null;
  if (hasVerifiedReference(sport)) {
    const groups = await getTeamDirectory(sport).catch(() => []);
    for (const g of groups) {
      for (const d of g.divisions) {
        const match = d.teams.find((t) => t.id === teamId);
        if (match) return match;
      }
    }
    return null;
  }
  const league = await resolveDefaultLeagueId(sport);
  if (!league) return null;
  const catalog = await getLeagueTeamCatalog(sport, league).catch(() => []);
  return catalog.find((t) => t.id === teamId) ?? null;
}
