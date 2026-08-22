// ── Team Directory — browse every team in a league, grouped correctly ──
// (SERVER ONLY) Powers the "All Teams" panel: every team in the league,
// under its real conference/division, with a real resolved logo. Team
// identity/logo is always resolved live against the API-Sports team
// catalog (resolveTeamByName) — never a locally invented or cached-forever
// image. Rosters are NOT fetched here — that's lazy-loaded per team from
// the client only when a team's card is actually opened (see
// /api/discovery/sports/team-roster), so this never burns the paid API
// quota fetching all 30+ rosters on every page view.

import type { SportSlug, SportsStanding } from "../providers/sports";
import { resolveTeamByName, getLeagueTeamRosterMap } from "./service";

export interface DirectoryTeam {
  id: string;
  name: string;
  logoUrl?: string;
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
    // getLeagueTeamRosterMap's doc comment for why resolving 30 team names
    // via 30 separate concurrent live calls left different teams' logos
    // randomly blank from one page load to the next.
    const rosterMap = await getLeagueTeamRosterMap(sport).catch(() => null);
    const merged: SportsStanding[] = [];
    for (const { conference, division, teams } of spec) {
      for (const name of teams) {
        const live = liveByName.get(normalize(name));
        if (live) {
          merged.push({ ...live, group: live.group ?? conference, division: live.division ?? division });
          continue;
        }
        const team = rosterMap ? rosterMap.get(normalize(name)) ?? null : await resolveTeamByName(sport, name).catch(() => null);
        merged.push({
          team: { id: team?.id ?? name, name, logoUrl: team?.logoUrl },
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

async function resolveDivisions(sport: SportSlug, spec: { conference: string; division: string; teams: string[] }[]): Promise<DirectoryGroup[]> {
  try {
    const rosterMap = await getLeagueTeamRosterMap(sport).catch(() => null);
    const byConference = new Map<string, DirectoryDivision[]>();
    for (const { conference, division, teams } of spec) {
      const resolved = await Promise.all(teams.map(async (name): Promise<DirectoryTeam> => {
        const team = rosterMap ? rosterMap.get(normalize(name)) ?? null : await resolveTeamByName(sport, name).catch(() => null);
        return { id: team?.id ?? name, name, logoUrl: team?.logoUrl };
      }));
      const divisions = byConference.get(conference) ?? [];
      divisions.push({ label: division, teams: resolved });
      byConference.set(conference, divisions);
    }
    return Array.from(byConference.entries()).map(([label, divisions]) => ({ label, divisions }));
  } catch {
    // A live team-resolution call failing unexpectedly must never take the
    // All Teams directory down with it.
    return [];
  }
}

/** Every team in the league under its real conference/division, with a
 *  live-resolved logo. NBA and NFL have a verified static reference today
 *  (see VERIFIED_REFERENCE above) — every other sport returns [] here and
 *  the caller falls back to whatever grouping the Standings panel already
 *  derived from real provider data for that sport. */
export async function getTeamDirectory(sport: SportSlug): Promise<DirectoryGroup[]> {
  const spec = VERIFIED_REFERENCE[sport];
  return spec ? resolveDivisions(sport, spec) : [];
}

/** Whether this sport has a verified, hardcoded-but-real conference/
 *  division reference (see VERIFIED_REFERENCE above) — callers use this to
 *  decide whether to source the All Teams directory / Standings fallback
 *  from that reference or fall back to whatever the live provider data
 *  itself derived. */
export function hasVerifiedReference(sport: SportSlug): boolean {
  return sport in VERIFIED_REFERENCE;
}
