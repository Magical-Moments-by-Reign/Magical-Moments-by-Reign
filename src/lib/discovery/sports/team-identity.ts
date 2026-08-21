// ── Cross-provider Team Identity Resolver (SERVER ONLY) ────────────
// API-Sports and SportsDataIO each have their own idea of a team: API-Sports
// keys everything off its own numeric team id and a full franchise name
// ("Boston Celtics"); SportsDataIO keys its Players/Injuries/Transactions
// rows off a real numeric TeamID but usually only carries the short team
// code ("BOS") on the row itself, not the full name. Comparing "BOS" to
// "Boston Celtics" as strings — the bug this module replaces — always
// fails, which is why roster/injury lookups kept coming back empty even
// when the provider genuinely had the data.
//
// This is the one place that builds the bridge: a real SportsDataIO team
// directory (TeamID + Key + full name for every team in the league),
// sourced from the Standings endpoint — which SportsDataIO always
// populates for every real team, even at 0-0 before a season starts, so
// this directory is never gated on a season having live results yet.
// Every other cross-provider team lookup in this codebase (rosters,
// injuries, transactions, player profiles) should resolve through
// resolveSdioTeamId rather than re-deriving its own name-string guess.

import { withCache, cacheKeyFor } from "../cache";
import { fetchStandings, type SdioLeague } from "../providers/sportsdata";

const TTL_TEAM_IDENTITY = 10080; // 1 week — a league's team identities/keys essentially never change mid-season

export interface SdioTeamIdentity {
  teamId: string;
  key?: string;
  fullName: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Same August-boundary convention as sdioSeasonYear in service.ts and
// currentSeasonYear in player-profile.ts, duplicated here to keep this
// module's only real dependency limited to the one sportsdata.ts export it
// actually needs.
function seasonYearFor(league: SdioLeague): number {
  const now = new Date();
  if (league === "wnba") return now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** The real SportsDataIO team directory for a league this season — every
 *  team's TeamID, Key, and full name, straight from Standings. Cached for a
 *  week since team identity essentially never changes. Returns [] on
 *  missing config, a failed call, or a response with no usable rows —
 *  callers degrade to "can't resolve" rather than guessing. */
export async function getSdioTeamDirectory(league: SdioLeague): Promise<SdioTeamIdentity[]> {
  const season = seasonYearFor(league);
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ league, season, kind: "team_identity" }), TTL_TEAM_IDENTITY, () =>
    fetchStandings(league, season));
  const rows = cached?.data ?? [];
  return rows.filter((r) => r.teamId).map((r) => ({ teamId: r.teamId!, key: r.key, fullName: r.team }));
}

/** Resolves a real, provider-agnostic team name (typically API-Sports' full
 *  franchise name, e.g. "Boston Celtics") to its real SportsDataIO TeamID.
 *  Full-name match is the primary signal; a Key/abbreviation match is used
 *  only as a verified secondary resolver when the full name doesn't match —
 *  never the reverse, and never a fuzzy guess across different teams.
 *  Returns null when nothing in the real directory matches confidently. */
export async function resolveSdioTeamId(league: SdioLeague, teamName: string): Promise<string | null> {
  const directory = await getSdioTeamDirectory(league);
  if (!directory.length) return null;
  const target = normalize(teamName);
  const byFullName = directory.find((t) => normalize(t.fullName) === target);
  if (byFullName) return byFullName.teamId;
  const byKey = directory.find((t) => t.key && normalize(t.key) === target);
  return byKey?.teamId ?? null;
}
