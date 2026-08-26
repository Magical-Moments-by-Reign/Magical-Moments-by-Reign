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
import { getLeagueTeamCatalog, getLeagueTeamCatalogWithOffSeasonFallback, resolveDefaultLeagueId } from "./service";

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
   *  yet (off-season, restriction, etc.); the UI (TeamDirectory.tsx) omits
   *  the record line entirely in that case rather than showing a
   *  repetitive "Record unavailable" or a fabricated number. */
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

// Real, current SWAC (Southwestern Athletic Conference) membership — all 12
// institutions are HBCUs, in the real East/West divisional alignment SWAC
// itself put in place for the 2021-22 realignment (after adding Florida
// A&M and Bethune-Cookman) and still uses today. Owner-confirmed real fact
// (CLAUDE.md §12), cross-checked against SWAC's own conference reporting
// and independent team-season records before being added here — never
// guessed. Same conference, same 12 members, across both football (ncaaf)
// and basketball (ncaab), which is why this one list covers both sports
// below rather than being duplicated per sport.
const SWAC_DIVISIONS: { conference: string; division: string; teams: string[] }[] = [
  { conference: "SWAC", division: "East", teams: ["Alabama A&M", "Alabama State", "Bethune-Cookman", "Florida A&M", "Jackson State", "Mississippi Valley State"] },
  { conference: "SWAC", division: "West", teams: ["Alcorn State", "Arkansas-Pine Bluff", "Grambling State", "Prairie View A&M", "Southern", "Texas Southern"] },
];

/** A real, verified conference-membership OVERLAY — deliberately NOT the
 *  same thing as VERIFIED_REFERENCE above. VERIFIED_REFERENCE is an
 *  EXHAUSTIVE membership boundary (every real team in the sport, nothing
 *  else) — right for NBA/NFL, where the full league is small and fully
 *  known, but wrong for ncaaf/ncaab: FBS alone has 130+ teams across ~10
 *  conferences, and no exhaustive verified list exists for either sport
 *  yet (this is the still-open, harder classification question). Adding
 *  ncaaf/ncaab to VERIFIED_REFERENCE with only these 12 SWAC teams would
 *  make getTeamDirectory treat that as the WHOLE sport and silently drop
 *  every other real team — the opposite of what's wanted here.
 *
 *  This overlay instead only SUPPLIES a real conference/division label for
 *  the specific teams it covers, layered on top of buildTeamDirectoryFromCatalog's
 *  existing real-standings-first grouping (see its own use of this map) —
 *  it never removes a team, never limits which teams appear, and never
 *  overrides a grouping standings data already provided; it only upgrades
 *  a SWAC team that would otherwise land in the generic "no group" fallback
 *  bucket into its own real conference/division. */
const CONFERENCE_OVERLAY: Partial<Record<SportSlug, { conference: string; division: string; teams: string[] }[]>> = {
  ncaaf: SWAC_DIVISIONS,
  ncaab: SWAC_DIVISIONS,
};

function conferenceOverlayFor(sport: SportSlug): Map<string, { group: string; division: string }> | null {
  const spec = CONFERENCE_OVERLAY[sport];
  if (!spec) return null;
  const map = new Map<string, { group: string; division: string }>();
  for (const { conference, division, teams } of spec) {
    for (const name of teams) map.set(normalize(name), { group: conference, division });
  }
  return map;
}

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

/** Distinct real team ids appearing anywhere in a standings result — used
 *  as a real, self-updating completeness signal for the live team catalog
 *  (see getLeagueTeamCatalogWithOffSeasonFallback's minimumExpectedCount
 *  param). For a sport whose Standings already went through
 *  getStandingsWithOffSeasonFallback (falling back to the last real
 *  completed season when the current one hasn't posted anything yet), the
 *  number of real teams that fallback found is real evidence of how many
 *  teams the league actually has — never a separately hardcoded guess that
 *  could go stale the moment a league expands, realigns, or renames a
 *  franchise. This deliberately covers every non-VERIFIED_REFERENCE sport,
 *  college catalogs included, without ever hardcoding a school count.
 *  Exported for the [sport]/page.tsx call site. */
export function countDistinctStandingsTeams(standingsGroups: StandingsGroup[]): number {
  const ids = new Set<string>();
  for (const g of standingsGroups) for (const d of g.divisions) for (const r of d.rows) if (r.team.id) ids.add(r.team.id);
  return ids.size;
}

// Confirmed, real provider naming differences ONLY — an entry here must
// represent an independently verified real mismatch between our static
// VERIFIED_REFERENCE name and the live API-Sports catalog's actual name
// for that same real team; never a guess. resolveVerifiedTeamIdentity's
// diagnostic log below is exactly how a real mismatch gets discovered once
// this runs against a live catalog — add the confirmed pair here only
// after that, never speculatively. Never a substring/fuzzy rule (e.g.
// stripping "Los Angeles" to "LA") — that risks silently cross-matching
// two differently located real teams that happen to share a short form;
// every entry here is one exact, individually confirmed real pairing.
//
// nba["LA Clippers"]: Owner-confirmed via the live Owner-only diagnostic
// (see [sport]/page.tsx's "real live provider catalog" panel) — API-Sports
// reports this exact franchise (id 144, alongside all 29 other real NBA
// teams) as "Los Angeles Clippers," never "LA Clippers." Every other NBA
// static name matched the live catalog directly with no alias needed.
const VERIFIED_TEAM_ALIASES: Partial<Record<SportSlug, Record<string, string>>> = {
  nba: { "LA Clippers": "Los Angeles Clippers" },
};

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
 *  page rendering 30 teams doesn't emit 30 separate log lines. Exported
 *  for tests (VERIFIED_TEAM_ALIASES itself stays private/unexported —
 *  tests exercise it indirectly through this resolver). */
export function resolveVerifiedTeamIdentity(sport: SportSlug, staticName: string, catalogByName: Map<string, SportsTeam>): SportsTeam | null {
  const direct = catalogByName.get(normalize(staticName));
  if (direct) return direct;
  const alias = VERIFIED_TEAM_ALIASES[sport]?.[staticName];
  return alias ? catalogByName.get(normalize(alias)) ?? null : null;
}

/** The exact set of real, live-provider names this sport's VERIFIED_REFERENCE
 *  actually covers — the static name itself, or its confirmed
 *  VERIFIED_TEAM_ALIASES real-provider spelling when one exists (e.g. NBA's
 *  "LA Clippers" resolves to "Los Angeles Clippers" here too, the same
 *  pairing resolveVerifiedTeamIdentity uses). Returns null for a sport with
 *  no VERIFIED_REFERENCE — callers must treat null as "no membership
 *  boundary to check," never as "nothing is verified." */
function verifiedFranchiseNameSet(sport: SportSlug): Set<string> | null {
  const spec = VERIFIED_REFERENCE[sport];
  if (!spec) return null;
  const names = new Set<string>();
  for (const { teams } of spec) {
    for (const name of teams) {
      const alias = VERIFIED_TEAM_ALIASES[sport]?.[name];
      names.add(normalize(alias ?? name));
    }
  }
  return names;
}

/** Keeps only this sport's verified real franchises out of a RAW,
 *  unfiltered live catalog — the same membership boundary the All Teams
 *  directory already enforces (resolveVerifiedTeamIdentity), applied to
 *  any OTHER consumer of the raw catalog. Confirmed real defect this
 *  closes: searchTeamsForSport (service.ts, the Follow-a-team search box)
 *  reads the raw catalog directly with no filtering, so a non-franchise
 *  provider row (e.g. NBA's "Team World") could be searched and followed
 *  even though it can never appear in the All Teams directory. A sport
 *  with no VERIFIED_REFERENCE (everything but NBA/NFL today, MLB
 *  included) returns the input completely unchanged — this is
 *  deliberately NOT a general entity-type/TEAM-vs-LEAGUE filter; MLB's
 *  own "American League"/"National League" rows being followable is a
 *  separate, confirmed, NOT-yet-designed issue (no static reference
 *  exists to check MLB team rows against) and must not be silently
 *  "fixed" by pretending MLB has this same architecture. Exported for
 *  tests and for service.ts's searchTeamsForSport. */
export function filterToVerifiedFranchises(sport: SportSlug, teams: SportsTeam[]): SportsTeam[] {
  const verified = verifiedFranchiseNameSet(sport);
  if (!verified) return teams;
  return teams.filter((t) => verified.has(normalize(t.name)));
}

/** Excludes any row from a RAW, unfiltered live catalog whose real name
 *  exactly matches a VERIFIED_REFERENCE pro franchise from ANY sport (NBA,
 *  NFL) — confirmed real defect: the ncaaf All Teams directory has shown
 *  real NFL rows (Green Bay Packers, Denver Broncos) mixed into the real
 *  college programs, live evidence a college-league query on a shared host
 *  can return pro-league rows too. Never a guess — a real college program
 *  can never literally carry an exact NFL/NBA franchise's brand name, so
 *  an exact match here is confirmed contamination, not a false positive.
 *
 *  Deliberately NOT scoped to just "NFL rows out of ncaaf" — the same
 *  class of provider leak could affect any sport sharing a host with a
 *  VERIFIED_REFERENCE league (e.g. ncaab shares basketball's host with
 *  NBA/WNBA), so this checks every VERIFIED_REFERENCE sport's real roster
 *  at once, a shared exclusion rather than a one-off ncaaf patch. A no-op
 *  for a sport that itself HAS a VERIFIED_REFERENCE (NBA/NFL) — this only
 *  ever removes a DIFFERENT sport's real teams from THIS sport's catalog,
 *  never touches a VERIFIED_REFERENCE sport's own real roster. Exported
 *  for tests. */
export function excludeKnownProLeagueContamination(sport: SportSlug, teams: SportsTeam[]): SportsTeam[] {
  if (hasVerifiedReference(sport)) return teams;
  const contamination = new Set<string>();
  for (const otherSport of Object.keys(VERIFIED_REFERENCE) as SportSlug[]) {
    const names = verifiedFranchiseNameSet(otherSport);
    if (names) for (const n of names) contamination.add(n);
  }
  if (!contamination.size) return teams;
  return teams.filter((t) => !contamination.has(normalize(t.name)));
}

/** Fetches the real, live team catalog for a VERIFIED_REFERENCE sport's
 *  resolved league — the one shared fetch point both getTeamDirectory and
 *  getVerifiedStandingsFallback use so a real API-Sports naming mismatch
 *  only ever needs fixing once. Returns [] on no resolved league or a
 *  failed call — callers already treat an empty catalog as "show every
 *  team without id/logo," never as an error. `isOffSeasonPhase` and
 *  `minimumExpectedCount` are passed straight through to
 *  getLeagueTeamCatalogWithOffSeasonFallback — see its own doc comment for
 *  why a current-season catalog that's EMPTY *or* meaningfully short of
 *  this sport's own real, already-known team count (the caller passes the
 *  VERIFIED_REFERENCE spec's own real team count — see getTeamDirectory/
 *  getVerifiedStandingsFallback) retries against the last real completed
 *  season for identity purposes only (id/name/logo), never for
 *  record/roster/schedule. */
async function fetchVerifiedTeamCatalog(sport: SportSlug, isOffSeasonPhase: boolean, minimumExpectedCount: number): Promise<SportsTeam[]> {
  const league = await resolveDefaultLeagueId(sport).catch(() => null);
  if (!league) return [];
  return getLeagueTeamCatalogWithOffSeasonFallback(sport, league, isOffSeasonPhase, minimumExpectedCount).catch(() => []);
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
    // logos randomly blank from one page load to the next. allowZeroFill is
    // this caller's own real "is this genuinely an off-season/preseason
    // window" signal — the same one that already gates whether missing
    // teams get a corroborated 0-0 below, reused here so a not-yet-
    // populated current season also gets the prior-season identity retry.
    const catalogByName = buildCatalogNameIndex(await fetchVerifiedTeamCatalog(sport, allowZeroFill, totalRealTeams));
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

export interface ResolvedDivisions {
  groups: DirectoryGroup[];
  /** Real static team names that had no match in the live catalog on this
   *  resolution — always populated regardless of logDiagnostics (that flag
   *  only controls the console.warn line below); getTeamDirectory surfaces
   *  this to the Owner-only UI banner so a real mismatch is visible without
   *  needing server console access. */
  misses: string[];
  /** TEMPORARY DIAGNOSTIC FIELD — the real, live API-Sports catalog rows
   *  (id + exact provider name) for this sport/league, straight from the
   *  same fetch resolveVerifiedTeamIdentity already matches against. Exists
   *  solely so the Owner-only UI can show the actual live provider identity
   *  for teams that don't resolve, instead of guessing why. Never populated
   *  when misses is empty (nothing to investigate). Remove this field, its
   *  UI, and this comment once VERIFIED_TEAM_ALIASES has been filled in
   *  from Owner-confirmed real pairings and every team resolves — see
   *  VERIFIED_TEAM_ALIASES's own doc comment. */
  liveCatalog: { id: string; name: string }[];
}

async function resolveDivisions(sport: SportSlug, spec: { conference: string; division: string; teams: string[] }[], recordByTeamId: Map<string, string>, logDiagnostics: boolean, isOffSeasonPhase: boolean): Promise<ResolvedDivisions> {
  try {
    const totalRealTeams = spec.reduce((n, s) => n + s.teams.length, 0);
    const catalog = await fetchVerifiedTeamCatalog(sport, isOffSeasonPhase, totalRealTeams);
    const catalogByName = buildCatalogNameIndex(catalog);
    const misses: string[] = [];
    const byConference = new Map<string, DirectoryDivision[]>();
    for (const { conference, division, teams } of spec) {
      const resolved: DirectoryTeam[] = teams.map((name) => {
        const team = resolveVerifiedTeamIdentity(sport, name, catalogByName);
        if (!team) misses.push(name);
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
      console.warn(`[team-directory] ${sport}: ${misses.length} of ${totalRealTeams} static team(s) had no real catalog match — ${misses.join(", ")}`);
    }
    // Only populated when there's actually something to investigate, and
    // only real, already-fetched data — never a second provider call just
    // for this. Real id/name pairs only, nothing else from the catalog row.
    const liveCatalog = misses.length ? catalog.map((t) => ({ id: t.id, name: t.name })) : [];
    return { groups: Array.from(byConference.entries()).map(([label, divisions]) => ({ label, divisions })), misses, liveCatalog };
  } catch {
    // A live team-resolution call failing unexpectedly must never take the
    // All Teams directory down with it.
    return { groups: [], misses: [], liveCatalog: [] };
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
 *  resolveDivisions) — never wired to a member-visible request.
 *  `isOffSeasonPhase` is the caller's own real dated-openers check (the same
 *  one already passed to getVerifiedStandingsFallback's `allowZeroFill`) —
 *  see getLeagueTeamCatalogWithOffSeasonFallback for what it retries. */
export async function getTeamDirectory(sport: SportSlug, standingsGroups: StandingsGroup[] = [], logDiagnostics = false, isOffSeasonPhase = false): Promise<ResolvedDivisions> {
  const spec = VERIFIED_REFERENCE[sport];
  if (!spec) return { groups: [], misses: [], liveCatalog: [] };
  return resolveDivisions(sport, spec, buildRecordByTeamId(standingsGroups), logDiagnostics, isOffSeasonPhase);
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
  sport?: SportSlug,
  gamesDerivedTeamIds?: Set<string> | null,
): DirectoryGroup[] {
  if (!catalog.length) return [];
  // Confirmed real defect fix: a raw catalog for a sport with no
  // VERIFIED_REFERENCE of its own (ncaaf included) can carry another real
  // league's team rows — see excludeKnownProLeagueContamination's own doc
  // comment. `sport` is optional only so existing callers that predate
  // this parameter still compile; every real caller in this codebase now
  // passes it.
  const proLeagueCleaned = sport ? excludeKnownProLeagueContamination(sport, catalog) : catalog;
  // Real, evidence-based scoping — NOT a guess. Confirmed live evidence for
  // ncaaf (see getSeasonGamesDerivedTeamIds and its call site in
  // [sport]/page.tsx): the raw catalog carries 702 rows spanning multiple
  // real divisions, while only 238 of those teams actually appear in this
  // season's real games, every one of which reports the identical real
  // stage string "FBS (Division I-A)" — a real, self-updating signal for
  // which raw-catalog rows belong in this season's directory. Only applied
  // when the caller actually has this evidence (a non-null Set) — every
  // other sport/caller keeps the unfiltered catalog exactly as before.
  // Honest caveat this deliberately does NOT paper over: a real FBS team's
  // real non-conference opponent can itself be a real FCS/D2 school, so
  // this set can still include a small number of real non-FBS teams — it
  // is a much tighter, real boundary than the raw catalog, not a claimed
  // perfectly clean FBS-only one.
  const cleaned = gamesDerivedTeamIds ? proLeagueCleaned.filter((t) => gamesDerivedTeamIds.has(t.id)) : proLeagueCleaned;
  const overlay = sport ? conferenceOverlayFor(sport) : null;
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
  for (const t of cleaned) {
    // The verified conference overlay's own label wins for a team it
    // covers — a confirmed real membership (e.g. SWAC) is more specific and
    // more stable than whatever grouping a live standings response happens
    // to carry for that team, and a provider has been observed grouping a
    // real SWAC school inconsistently (missing conference, wrong bucket)
    // even though the school's real conference membership never changes
    // mid-season. This was flipped from "standings wins" after Owner
    // feedback that a confirmed SWAC school wasn't showing as SWAC — the
    // real win/loss record itself still always comes from live standings
    // (never invented), only the group/division label authority changed.
    // A team the overlay doesn't cover is unaffected: falls through to
    // standings' own grouping exactly as before.
    const standingsLoc = locationByTeamId.get(t.id);
    const overlayLoc = overlay?.get(normalize(t.name));
    const loc = overlayLoc
      ? { group: overlayLoc.group, division: overlayLoc.division, record: standingsLoc?.record }
      : (standingsLoc ?? { group: fallbackGroupLabel, division: "", record: undefined });
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
    const { groups } = await getTeamDirectory(sport).catch(() => ({ groups: [], misses: [], liveCatalog: [] }) as ResolvedDivisions);
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
