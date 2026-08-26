import { test } from "node:test";
import assert from "node:assert/strict";
import { getVerifiedStandingsFallback, hasVerifiedReference, getTeamDirectory, buildTeamDirectoryFromCatalog, resolveVerifiedTeamIdentity, filterToVerifiedFranchises, excludeKnownProLeagueContamination } from "./team-directory";
import type { SportsStanding, SportsTeam } from "../providers/sports";
import type { StandingsGroup } from "./standings";

function standingsRow(teamId: string, wins?: number, losses?: number, ties?: number): SportsStanding & { displayRank: number; gb: number | null } {
  return { team: { id: teamId, name: `Team ${teamId}` }, wins, losses, ties, displayRank: 1, gb: null };
}

// ── resolveVerifiedTeamIdentity: the NBA "LA Clippers" alias fix ────────
// Owner-confirmed via the live Owner-only diagnostic (real live catalog
// panel) — API-Sports reports this exact franchise as "Los Angeles
// Clippers," never our VERIFIED_REFERENCE's "LA Clippers." This closes
// that one confirmed real mismatch; every other NBA static name matches
// the live catalog directly with no alias needed.

function catalogIndex(teams: SportsTeam[]): Map<string, SportsTeam> {
  return new Map(teams.map((t) => [t.name.toLowerCase().trim(), t]));
}

test("resolveVerifiedTeamIdentity: exact direct match needs no alias", () => {
  const catalog = catalogIndex([{ id: "133", name: "Boston Celtics" }]);
  const team = resolveVerifiedTeamIdentity("nba", "Boston Celtics", catalog);
  assert.equal(team?.id, "133");
});

test("resolveVerifiedTeamIdentity: \"LA Clippers\" resolves via the confirmed alias to the real provider name \"Los Angeles Clippers\"", () => {
  const catalog = catalogIndex([{ id: "144", name: "Los Angeles Clippers" }]);
  const team = resolveVerifiedTeamIdentity("nba", "LA Clippers", catalog);
  assert.equal(team?.id, "144");
});

test("resolveVerifiedTeamIdentity: the Clippers alias never cross-matches a different real Los Angeles team", () => {
  const catalog = catalogIndex([{ id: "145", name: "Los Angeles Lakers" }]);
  const team = resolveVerifiedTeamIdentity("nba", "LA Clippers", catalog);
  assert.equal(team, null);
});

test("resolveVerifiedTeamIdentity: an unresolved team with no alias returns null, never a guess", () => {
  const catalog = catalogIndex([{ id: "999", name: "Some Other Team" }]);
  const team = resolveVerifiedTeamIdentity("nba", "Nonexistent Team", catalog);
  assert.equal(team, null);
});

test("resolveVerifiedTeamIdentity: the Clippers alias is NBA-only — it never applies to another sport's static name lookup", () => {
  const catalog = catalogIndex([{ id: "144", name: "Los Angeles Clippers" }]);
  const team = resolveVerifiedTeamIdentity("nfl", "LA Clippers", catalog);
  assert.equal(team, null);
});

// ── filterToVerifiedFranchises: keeps a non-franchise provider row (e.g.
// NBA's real "Team World" row, confirmed via the live Owner diagnostic)
// out of ANY raw-catalog consumer, not just the All Teams directory —
// today's confirmed real defect this closes is searchTeamsForSport
// (service.ts), which reads the raw catalog with no filtering at all.

test("filterToVerifiedFranchises: NBA — keeps real verified franchises, drops a non-franchise provider row", () => {
  const raw: SportsTeam[] = [
    { id: "133", name: "Boston Celtics" },
    { id: "144", name: "Los Angeles Clippers" }, // resolves via the confirmed alias
    { id: "1414", name: "Team World" }, // real provider row, not one of the 30 franchises
  ];
  const result = filterToVerifiedFranchises("nba", raw);
  assert.deepEqual(result.map((t) => t.id).sort(), ["133", "144"]);
});

test("filterToVerifiedFranchises: legitimate NBA teams remain searchable, including via the Clippers alias", () => {
  const raw: SportsTeam[] = [{ id: "144", name: "Los Angeles Clippers" }];
  const result = filterToVerifiedFranchises("nba", raw);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "144");
});

test("filterToVerifiedFranchises: legitimate NFL teams remain searchable", () => {
  const raw: SportsTeam[] = [{ id: "1", name: "Buffalo Bills" }];
  const result = filterToVerifiedFranchises("nfl", raw);
  assert.equal(result.length, 1);
});

test("filterToVerifiedFranchises: a sport with no VERIFIED_REFERENCE (e.g. MLB) returns the raw catalog completely unchanged — this is NOT a general entity-type filter", () => {
  const raw: SportsTeam[] = [
    { id: "1", name: "New York Yankees" },
    { id: "50", name: "American League" }, // the separately-flagged, NOT-fixed-here MLB defect
  ];
  const result = filterToVerifiedFranchises("mlb", raw);
  assert.deepEqual(result, raw);
});

// ── excludeKnownProLeagueContamination: closes the confirmed real defect —
// real NFL rows (Green Bay Packers, Denver Broncos) appearing in the live
// ncaaf All Teams directory, mixed in with real college programs.

test("excludeKnownProLeagueContamination: drops real NFL rows leaked into an ncaaf catalog, keeps every real college program", () => {
  const raw: SportsTeam[] = [
    { id: "gb", name: "Green Bay Packers" }, // real NFL row, confirmed leaked
    { id: "den", name: "Denver Broncos" }, // real NFL row, confirmed leaked
    { id: "osu", name: "Ohio State" },
    { id: "bama", name: "Alabama" },
  ];
  const result = excludeKnownProLeagueContamination("ncaaf", raw);
  assert.deepEqual(result.map((t) => t.id).sort(), ["bama", "osu"]);
});

test("excludeKnownProLeagueContamination: also catches an NBA row leaked into a non-NBA catalog (ncaab)", () => {
  const raw: SportsTeam[] = [
    { id: "bos", name: "Boston Celtics" }, // real NBA row
    { id: "duke", name: "Duke" },
  ];
  const result = excludeKnownProLeagueContamination("ncaab", raw);
  assert.deepEqual(result.map((t) => t.id), ["duke"]);
});

test("excludeKnownProLeagueContamination: a no-op for a sport that itself HAS a VERIFIED_REFERENCE (NBA/NFL) — never filters its own real roster", () => {
  const raw: SportsTeam[] = [{ id: "gb", name: "Green Bay Packers" }, { id: "buf", name: "Buffalo Bills" }];
  const result = excludeKnownProLeagueContamination("nfl", raw);
  assert.deepEqual(result, raw);
});

test("excludeKnownProLeagueContamination: a sport with no real leaked rows returns the catalog unchanged", () => {
  const raw: SportsTeam[] = [{ id: "osu", name: "Ohio State" }, { id: "bama", name: "Alabama" }];
  const result = excludeKnownProLeagueContamination("ncaaf", raw);
  assert.deepEqual(result, raw);
});

test("buildTeamDirectoryFromCatalog: passing sport=\"ncaaf\" excludes a leaked NFL row from the built directory", () => {
  const catalog: SportsTeam[] = [
    { id: "gb", name: "Green Bay Packers" },
    { id: "osu", name: "Ohio State" },
  ];
  const groups = buildTeamDirectoryFromCatalog("College Football", catalog, [], true, "ncaaf");
  const names = groups.flatMap((g) => g.divisions.flatMap((d) => d.teams.map((t) => t.name)));
  assert.deepEqual(names, ["Ohio State"]);
});

test("buildTeamDirectoryFromCatalog: omitting sport keeps prior behavior unchanged (no exclusion applied)", () => {
  const catalog: SportsTeam[] = [{ id: "gb", name: "Green Bay Packers" }, { id: "osu", name: "Ohio State" }];
  const groups = buildTeamDirectoryFromCatalog("College Football", catalog, [], true);
  const names = groups.flatMap((g) => g.divisions.flatMap((d) => d.teams.map((t) => t.name)));
  assert.deepEqual(names.sort(), ["Green Bay Packers", "Ohio State"]);
});

// ── SWAC conference overlay: real, Owner-confirmed HBCU conference
// membership (all 12 real SWAC schools, East/West) enriches ncaaf/ncaab's
// directory grouping without ever hiding a team or overriding real live
// standings data — see conferenceOverlayFor's own doc comment for why this
// is deliberately NOT the same mechanism as VERIFIED_REFERENCE (NBA/NFL).

test("buildTeamDirectoryFromCatalog: a SWAC school with no standings grouping gets its real SWAC conference/division instead of the generic fallback bucket", () => {
  const catalog: SportsTeam[] = [
    { id: "as", name: "Alabama State" },
    { id: "aam", name: "Alabama A&M" },
    { id: "gram", name: "Grambling State" },
    { id: "osu", name: "Ohio State" }, // real FBS team, not SWAC — must land in the generic bucket, unaffected
  ];
  const groups = buildTeamDirectoryFromCatalog("College Football", catalog, [], true, "ncaaf");
  const byGroup = new Map(groups.map((g) => [g.label, g]));
  const swac = byGroup.get("SWAC")!;
  assert.ok(swac);
  const east = swac.divisions.find((d) => d.label === "East")!;
  const west = swac.divisions.find((d) => d.label === "West")!;
  assert.deepEqual(east.teams.map((t) => t.name).sort(), ["Alabama A&M", "Alabama State"]);
  assert.deepEqual(west.teams.map((t) => t.name), ["Grambling State"]);
  // Ohio State (a real, non-SWAC FBS team) still appears, in the generic bucket — never dropped.
  const generic = byGroup.get("College Football")!;
  assert.deepEqual(generic.divisions.flatMap((d) => d.teams.map((t) => t.name)), ["Ohio State"]);
});

test("buildTeamDirectoryFromCatalog: real live standings grouping for a SWAC school always wins over the overlay — never overrides live data", () => {
  const catalog: SportsTeam[] = [{ id: "as", name: "Alabama State" }];
  const standingsGroups: StandingsGroup[] = [
    {
      label: "Some Real Live Group",
      divisions: [{ label: "Some Real Live Division", rows: [{ team: { id: "as", name: "Alabama State" }, wins: 5, losses: 2 }] }],
    },
  ];
  const groups = buildTeamDirectoryFromCatalog("College Football", catalog, standingsGroups, true, "ncaaf");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "Some Real Live Group");
});

test("buildTeamDirectoryFromCatalog: the SWAC overlay only applies to ncaaf/ncaab — a no-op for every other sport", () => {
  const catalog: SportsTeam[] = [{ id: "as", name: "Alabama State" }];
  const groups = buildTeamDirectoryFromCatalog("Some Sport", catalog, [], true, "ncaabaseball");
  assert.equal(groups[0].label, "Some Sport"); // falls to the generic fallback bucket, not SWAC
});

test("buildTeamDirectoryFromCatalog: ncaab gets the SAME real SWAC overlay as ncaaf — one conference, both sports", () => {
  const catalog: SportsTeam[] = [{ id: "ts", name: "Texas Southern" }];
  const groups = buildTeamDirectoryFromCatalog("College Basketball", catalog, [], true, "ncaab");
  assert.equal(groups[0].label, "SWAC");
  assert.equal(groups[0].divisions[0].label, "West");
});

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
    const { groups, misses, liveCatalog } = await getTeamDirectory("nba", standingsGroups);
    const allTeams = groups.flatMap((g) => g.divisions).flatMap((d) => d.teams);
    assert.equal(allTeams.length, 30);
    // Every real team is honestly unresolved with no catalog access — this
    // is exactly what the Owner-only diagnostic banner surfaces.
    assert.equal(misses.length, 30);
    // No live catalog was actually reachable either — the temporary
    // Owner-only diagnostic must never show a fabricated/empty-looking
    // catalog dump when there's genuinely nothing real to show.
    assert.deepEqual(liveCatalog, []);
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
