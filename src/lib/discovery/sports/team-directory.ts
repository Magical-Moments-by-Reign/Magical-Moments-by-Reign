// ── Team Directory — browse every team in a league, grouped correctly ──
// (SERVER ONLY) Powers the "All Teams" panel: every team in the league,
// under its real conference/division, with a real resolved logo. Team
// identity/logo is always resolved live against the API-Sports team
// catalog (resolveTeamByName) — never a locally invented or cached-forever
// image. Rosters are NOT fetched here — that's lazy-loaded per team from
// the client only when a team's card is actually opened (see
// /api/discovery/sports/team-roster), so this never burns the paid API
// quota fetching all 30+ rosters on every page view.

import type { SportSlug } from "../providers/sports";
import { resolveTeamByName } from "./service";

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

async function resolveDivisions(sport: SportSlug, spec: { conference: string; division: string; teams: string[] }[]): Promise<DirectoryGroup[]> {
  const byConference = new Map<string, DirectoryDivision[]>();
  for (const { conference, division, teams } of spec) {
    const resolved = await Promise.all(teams.map(async (name): Promise<DirectoryTeam> => {
      const team = await resolveTeamByName(sport, name);
      return { id: team?.id ?? name, name, logoUrl: team?.logoUrl };
    }));
    const divisions = byConference.get(conference) ?? [];
    divisions.push({ label: division, teams: resolved });
    byConference.set(conference, divisions);
  }
  return Array.from(byConference.entries()).map(([label, divisions]) => ({ label, divisions }));
}

/** Every team in the league under its real conference/division, with a
 *  live-resolved logo. Only NBA has a verified static reference today
 *  (see NBA_DIVISIONS above) — every other sport returns [] here and the
 *  caller falls back to whatever grouping the Standings panel already
 *  derived from real provider data for that sport. */
export async function getTeamDirectory(sport: SportSlug): Promise<DirectoryGroup[]> {
  if (sport === "nba") return resolveDivisions(sport, NBA_DIVISIONS);
  return [];
}
