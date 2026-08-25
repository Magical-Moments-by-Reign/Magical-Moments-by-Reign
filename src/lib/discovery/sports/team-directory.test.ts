import { test } from "node:test";
import assert from "node:assert/strict";
import { getVerifiedStandingsFallback, hasVerifiedReference, getTeamDirectory, buildTeamDirectoryFromCatalog } from "./team-directory";
import type { SportsStanding, SportsTeam } from "../providers/sports";
import type { StandingsGroup } from "./standings";

function standingsRow(teamId: string, wins?: number, losses?: number, ties?: number): SportsStanding & { displayRank: number; gb: number | null } {
  return { team: { id: teamId, name: `Team ${teamId}` }, wins, losses, ties, displayRank: 1, gb: null };
}

test("hasVerifiedReference: true only for sports with a real, hardcoded conference/division reference", () => {
  assert.equal(hasVerifiedReference("nba"), true);
  assert.equal(hasVerifiedReference("nfl"), true);
  assert.equal(hasVerifiedReference("mlb"), false);
  assert.equal(hasVerifiedReference("soccer"), false);
});

test("getVerifiedStandingsFallback: a sport with no verified reference returns the live rows unchanged", async () => {
  const live: SportsStanding[] = [{ team: { id: "1", name: "Some Team" }, wins: 3, losses: 1 }];
  assert.equal(await getVerifiedStandingsFallback("mlb", live, true), live);
});

test("getVerifiedStandingsFallback: live data already covering the full real league is returned unchanged (no need to fall back)", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    // 32 real NFL teams already present — same length as NFL_DIVISIONS.
    const live: SportsStanding[] = Array.from({ length: 32 }, (_, i) => ({ team: { id: String(i), name: `Team ${i}` }, wins: 1, losses: 0 }));
    const result = await getVerifiedStandingsFallback("nfl", live, false);
    assert.equal(result, live);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getVerifiedStandingsFallback: NFL empty provider response — every real team appears, corroborated 0-0 when the season is confirmed not started", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await getVerifiedStandingsFallback("nfl", [], true);
    assert.equal(result.length, 32);
    const patriots = result.find((r) => r.team.name === "New England Patriots");
    assert.equal(patriots?.wins, 0);
    assert.equal(patriots?.losses, 0);
    assert.equal(patriots?.group, "AFC");
    assert.equal(patriots?.division, "AFC East");
    const cowboys = result.find((r) => r.team.name === "Dallas Cowboys");
    assert.equal(cowboys?.group, "NFC");
    assert.equal(cowboys?.division, "NFC East");
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getVerifiedStandingsFallback: NFL empty provider response mid-season (not corroborated as pre-start) leaves records as an honest gap, never a fabricated 0-0", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await getVerifiedStandingsFallback("nfl", [], false);
    assert.equal(result.length, 32);
    for (const row of result) {
      assert.equal(row.wins, undefined);
      assert.equal(row.losses, undefined);
    }
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getVerifiedStandingsFallback: a real live record for one team is preserved verbatim; unresolved teammates still get the corroborated 0-0", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const live: SportsStanding[] = [{ team: { id: "21", name: "New England Patriots", logoUrl: "https://x/ne.png" }, wins: 4, losses: 2 }];
    const result = await getVerifiedStandingsFallback("nfl", live, true);
    assert.equal(result.length, 32);
    const patriots = result.find((r) => r.team.name === "New England Patriots");
    assert.equal(patriots?.wins, 4);
    assert.equal(patriots?.losses, 2);
    assert.equal(patriots?.team.logoUrl, "https://x/ne.png");
    const jets = result.find((r) => r.team.name === "New York Jets");
    assert.equal(jets?.wins, 0);
    assert.equal(jets?.losses, 0);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

// ── Bug 1: VERIFIED_REFERENCE (NBA/NFL) directory record populated from
// real standings, via the same formatRecord logic buildTeamDirectoryFromCatalog
// already used — never a second provider fetch, never a fabricated record.

test("buildTeamDirectoryFromCatalog: a real W-L record is populated for a team standings has a row for", () => {
  const catalog: SportsTeam[] = [{ id: "1", name: "Team 1" }, { id: "2", name: "Team 2" }];
  const standingsGroups: StandingsGroup[] = [{ label: "East", divisions: [{ label: "", rows: [standingsRow("1", 10, 5)] }] }];
  const groups = buildTeamDirectoryFromCatalog("Test League", catalog, standingsGroups, true);
  const team1 = groups.flatMap((g) => g.divisions).flatMap((d) => d.teams).find((t) => t.id === "1");
  const team2 = groups.flatMap((g) => g.divisions).flatMap((d) => d.teams).find((t) => t.id === "2");
  assert.equal(team1?.record, "10-5");
  // Team 2 has no standings row at all — record must stay undefined, never
  // a guessed/zero-filled value this function has no basis for.
  assert.equal(team2?.record, undefined);
});

test("buildTeamDirectoryFromCatalog: ties are only appended to the record string when the sport actually reports them", () => {
  const catalog: SportsTeam[] = [{ id: "1", name: "Team 1" }, { id: "2", name: "Team 2" }];
  const standingsGroups: StandingsGroup[] = [{ label: "East", divisions: [{ label: "", rows: [standingsRow("1", 8, 4, 2), standingsRow("2", 8, 4, 0)] }] }];
  const groups = buildTeamDirectoryFromCatalog("Test League", catalog, standingsGroups, true);
  const teams = groups.flatMap((g) => g.divisions).flatMap((d) => d.teams);
  assert.equal(teams.find((t) => t.id === "1")?.record, "8-4-2");
  // A real, explicit 0 ties is not the same as "this sport doesn't track
  // ties" — but it also shouldn't clutter the record string with "-0".
  assert.equal(teams.find((t) => t.id === "2")?.record, "8-4");
});

// ── Bug 2: NBA/NFL identity resolution now goes through the one shared
// resolveVerifiedTeamIdentity resolver (previously two separate,
// duplicated `rosterMap.get(normalize(name))` call sites) — these
// regression tests confirm getTeamDirectory's new (sport, standingsGroups)
// signature still degrades honestly (no id, no fabricated record) when
// the real catalog can't be reached, exactly as before this refactor.

test("getTeamDirectory: unconfigured provider — every real NBA team still appears, with no id/logo/record ever fabricated", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const standingsGroups: StandingsGroup[] = [{ label: "Eastern Conference", divisions: [{ label: "Atlantic Division", rows: [standingsRow("2", 40, 20)] }] }];
    const { groups, misses } = await getTeamDirectory("nba", standingsGroups);
    const allTeams = groups.flatMap((g) => g.divisions).flatMap((d) => d.teams);
    assert.equal(allTeams.length, 30);
    // Every real team is honestly unresolved with no catalog access — this
    // is exactly what the Owner-only diagnostic banner surfaces.
    assert.equal(misses.length, 30);
    // With no provider access, no static team can resolve a real id — so
    // even though standings has a real record for teamId "2", nothing here
    // has a resolved id to join it against, and every record stays honestly
    // undefined rather than guessed.
    for (const t of allTeams) {
      assert.equal(t.id, "");
      assert.equal(t.logoUrl, undefined);
      assert.equal(t.record, undefined);
    }
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getTeamDirectory: called with no standings argument at all (e.g. getTeamById's own lookup) still returns every real NFL team", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const { groups } = await getTeamDirectory("nfl");
    const allTeams = groups.flatMap((g) => g.divisions).flatMap((d) => d.teams);
    assert.equal(allTeams.length, 32);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});
