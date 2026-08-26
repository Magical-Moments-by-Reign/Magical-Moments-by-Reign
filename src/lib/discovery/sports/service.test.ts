import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveWithFailureIsolation, getTeamRoster, resolveFollowedTeamRosters, getLeagueTeamCatalogWithOffSeasonFallback, mergeCatalogWithPriorSeason, getLeagueTeamRosterMap, getNcaafLiveDiagnostic, getLeagueLiveDiagnostic, playerNeedsEnrichment, mergeRosterPlayerFields, getCfpPlayoffBracket, getMarchMadnessPlayoffBracket } from "./service";
import type { SportsTeam, SportsRosterPlayer } from "../providers/sports";

// ── getLeagueTeamCatalogWithOffSeasonFallback: no provider key configured —
// both the current-season and (when retried) prior-season /teams calls
// honestly return [], never a fabricated catalog, whether or not the
// caller says it's an off-season phase.

test("getLeagueTeamCatalogWithOffSeasonFallback: no configured provider — returns [] regardless of isOffSeasonPhase, never throws", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    assert.deepEqual(await getLeagueTeamCatalogWithOffSeasonFallback("nhl", "57", false), []);
    assert.deepEqual(await getLeagueTeamCatalogWithOffSeasonFallback("nhl", "57", true), []);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

// ── getNcaafLiveDiagnostic: TEMPORARY Owner-only diagnostic — with no
// provider key configured, every real-provider-backed field degrades
// honestly (never throws, never fabricates), while the merged-catalog field
// still reflects the real (empty) output of the same production function
// the ncaaf page itself calls.

test("getNcaafLiveDiagnostic: no configured provider — every field degrades honestly, never throws", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await getNcaafLiveDiagnostic("2", false, 1);
    assert.equal(result.configured, false);
    assert.equal(result.league, "2");
    assert.equal(result.leagueDetail.attempted, false);
    assert.deepEqual(result.rawCurrent, { hasResponseField: false, responseIsArray: false, responseLength: 0, pagingPresent: false, pagingCurrent: null, pagingTotal: null, errorsFieldPresent: false, mappedTeamCount: 0 });
    assert.deepEqual(result.rawPrevious, { hasResponseField: false, responseIsArray: false, responseLength: 0, pagingPresent: false, pagingCurrent: null, pagingTotal: null, errorsFieldPresent: false, mappedTeamCount: 0 });
    assert.deepEqual(result.mergedCatalogNames, []);
    assert.equal(result.mergedCatalogCount, 0);
    assert.equal(result.forensicMatches.length, 7);
    for (const m of result.forensicMatches) {
      assert.equal(m.foundInCurrentSeason, false);
      assert.equal(m.fields, null);
    }
    assert.deepEqual(result.shapeSummary, { rowCount: 0, anyRowHasMembershipKey: false, sampleRootKeys: [], sampleTeamKeys: [] });
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

// ── getLeagueLiveDiagnostic: the 5-sport live-verification diagnostic —
// no configured provider (this sandbox's real state) degrades every field
// honestly, same discipline as getNcaafLiveDiagnostic above. Also confirms
// the "no league id at all" branch (ncaabaseball's real unresolved-id
// case, when resolveDefaultLeagueId comes back "") degrades the same way.

test("getLeagueLiveDiagnostic: no configured provider — every field degrades honestly, never throws", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await getLeagueLiveDiagnostic("ncaab", "116");
    assert.equal(result.sport, "ncaab");
    assert.equal(result.configured, false);
    assert.equal(result.configuredLeagueId, "116");
    assert.deepEqual(result.leagueDetail, { attempted: false, matchedId: null, matchedName: null, country: null, type: null, seasons: [] });
    assert.equal(result.teamCount, 0);
    assert.equal(result.gameCount, 0);
    assert.deepEqual(result.distinctStageStrings, []);
    assert.equal(result.postseasonGameCount, 0);
    assert.equal(result.firstPostseasonGame, null);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getLeagueLiveDiagnostic: no league id at all (ncaabaseball's real unresolved case) — degrades the same honest way, never throws", async () => {
  const result = await getLeagueLiveDiagnostic("ncaabaseball", "");
  assert.equal(result.configuredLeagueId, "");
  assert.equal(result.teamCount, 0);
  assert.equal(result.gameCount, 0);
  assert.equal(result.postseasonGameCount, 0);
});

// ── mergeCatalogWithPriorSeason: the real completeness+merge decision,
// tested directly since the network calls around it can't be exercised
// without a live provider key. This is the fix for the confirmed defect
// where "any nonzero count" was previously treated as complete.

function team(id: string, name: string): SportsTeam {
  return { id, name };
}

test("mergeCatalogWithPriorSeason: empty current catalog — prior season fills it in completely", () => {
  const prior = [team("1", "Team A"), team("2", "Team B")];
  assert.deepEqual(mergeCatalogWithPriorSeason([], prior, 2), prior);
});

test("mergeCatalogWithPriorSeason: NBA-shaped partial current catalog (19 of 30) DOES trigger the prior-season completion — merged result reaches the full 30", () => {
  const current: SportsTeam[] = Array.from({ length: 19 }, (_, i) => team(String(i + 1), `Current Team ${i + 1}`));
  const prior: SportsTeam[] = Array.from({ length: 30 }, (_, i) => team(String(i + 1), `Prior Team ${i + 1}`));
  const result = mergeCatalogWithPriorSeason(current, prior, 30);
  assert.equal(result.length, 30);
  // Every id current already had keeps CURRENT's own identity — prior never
  // overwrites a real, already-known-current team.
  for (let i = 1; i <= 19; i++) {
    assert.equal(result.find((t) => t.id === String(i))?.name, `Current Team ${i}`);
  }
  // The 11 ids current was missing get filled in from the real prior season.
  for (let i = 20; i <= 30; i++) {
    assert.equal(result.find((t) => t.id === String(i))?.name, `Prior Team ${i}`);
  }
});

test("mergeCatalogWithPriorSeason: complete current catalog — never touches the prior season at all, even when prior has different/conflicting data", () => {
  const current = [team("1", "Real Current Name")];
  const prior = [team("1", "Stale Prior Name"), team("2", "A Team Current Doesn't Have")];
  assert.deepEqual(mergeCatalogWithPriorSeason(current, prior, 1), current);
});

test("mergeCatalogWithPriorSeason: current-season identity always wins for a shared id — protects expansion/relocation/rebrand entities current already knows about", () => {
  const current = [team("1", "New Franchise Name"), team("2", "Team B")];
  const prior = [team("1", "Old Franchise Name"), team("3", "Team C")];
  const result = mergeCatalogWithPriorSeason(current, prior, 3);
  assert.equal(result.find((t) => t.id === "1")?.name, "New Franchise Name");
  assert.equal(result.find((t) => t.id === "2")?.name, "Team B");
  assert.equal(result.find((t) => t.id === "3")?.name, "Team C");
  assert.equal(result.length, 3);
});

test("mergeCatalogWithPriorSeason: empty prior season too — returns current unchanged, never fabricates a team", () => {
  const current = [team("1", "Team A")];
  assert.deepEqual(mergeCatalogWithPriorSeason(current, [], 30), current);
});

test("mergeCatalogWithPriorSeason: no real gain from merging (prior only repeats ids current already has) — returns current unchanged rather than a same-size reshuffled copy", () => {
  const current = [team("1", "Team A")];
  const prior = [team("1", "Old Team A Name")];
  assert.deepEqual(mergeCatalogWithPriorSeason(current, prior, 30), current);
});

test("mergeCatalogWithPriorSeason: merged SportsTeam rows carry only stable identity fields — no record/roster/standings/schedule data ever appears", () => {
  const result = mergeCatalogWithPriorSeason([], [{ id: "1", name: "Team A", logoUrl: "https://x/a.png", code: "TA" }], 1);
  assert.deepEqual(Object.keys(result[0]).sort(), ["code", "id", "logoUrl", "name"].sort());
});

// ── getLeagueTeamRosterMap: the Standings-logo lookup map, reusing
// getLeagueTeamCatalogWithOffSeasonFallback (see its own doc comment for
// why "any nonzero count" was never a safe completeness check — confirmed
// live via NBA's 19-of-31 pre-season catalog gap). These exercise the real
// exported wiring (no provider key configured, so both the current- and
// prior-season network calls degrade to [] honestly), not a
// reimplementation — the merge decision itself is already covered above.

test("getLeagueTeamRosterMap: no configured provider — returns null for a non-single-league sport, and an empty (never fabricated) map otherwise, at any minimumExpectedCount", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    assert.equal(await getLeagueTeamRosterMap("f1"), null); // not in SINGLE_LEAGUE_SPORTS
    const defaultCount = await getLeagueTeamRosterMap("nba");
    assert.ok(defaultCount);
    assert.equal(defaultCount!.size, 0);
    const higherCount = await getLeagueTeamRosterMap("nba", 31);
    assert.ok(higherCount);
    assert.equal(higherCount!.size, 0);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

// ── getCfpPlayoffBracket / getMarchMadnessPlayoffBracket: no provider key
// configured — both must return null (honest "field not announced yet")
// rather than throwing or fabricating a bracket. This is the SAME real
// degradation path as every other resolver in this file with no live key;
// the round-mapping/no-fabrication behavior itself is covered directly
// against buildCfpBracketData/buildMarchMadnessBracketData in bracket.test.ts,
// since the real network calls here can't be exercised without one.

test("getCfpPlayoffBracket: no configured provider — returns null, never throws, never fabricates a field", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    assert.equal(await getCfpPlayoffBracket(), null);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("getMarchMadnessPlayoffBracket: no configured provider — returns null, never throws, never fabricates a field", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    assert.equal(await getMarchMadnessPlayoffBracket(), null);
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

// ── Regression: followed-team roster/injury enrichment must never take the
// whole Sport page down. resolveWithFailureIsolation is the exact shared
// primitive resolveFollowedTeamRosters and resolveFollowedTeamInjuries
// (service.ts) both build on — these tests exercise the real exported
// function, not a re-implementation of its logic.

interface FakeTeam {
  id: string;
}

interface FakeRosterResult {
  players: { id: string; name: string }[];
  status: "hit" | "empty" | "plan_restricted" | "error" | "not_supported";
}

test("resolveWithFailureIsolation: two teams, one roster succeeds and one throws — the thrown team gets the error fallback, the other keeps its real result", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }];
  const results = await resolveWithFailureIsolation<FakeTeam, FakeRosterResult>(
    teams,
    async (t) => {
      if (t.id === "B") throw new Error("provider outage for team B");
      return { players: [{ id: "p1", name: "Real Player" }], status: "hit" };
    },
    () => ({ players: [], status: "error" })
  );
  assert.deepEqual(results[0], { players: [{ id: "p1", name: "Real Player" }], status: "hit" });
  assert.deepEqual(results[1], { players: [], status: "error" });
});

test("resolveWithFailureIsolation: two teams, one injury lookup succeeds and one throws — the thrown team gets [], the other keeps its real result", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }];
  const results = await resolveWithFailureIsolation(
    teams,
    async (t) => {
      if (t.id === "B") throw new Error("injury feed outage for team B");
      return [{ playerId: "p1", playerName: "Real Player", status: "Questionable" }];
    },
    () => [] as unknown[]
  );
  assert.deepEqual(results[0], [{ playerId: "p1", playerName: "Real Player", status: "Questionable" }]);
  assert.deepEqual(results[1], []);
});

test("resolveWithFailureIsolation: every team's optional call fails — resolves a full, safe array of fallbacks, never rejects", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }, { id: "C" }];
  const results = await resolveWithFailureIsolation<FakeTeam, FakeRosterResult>(
    teams,
    async () => { throw new Error("provider entirely down"); },
    () => ({ players: [], status: "error" })
  );
  assert.equal(results.length, 3);
  for (const r of results) assert.deepEqual(r, { players: [], status: "error" });
});

test("resolveWithFailureIsolation: a genuine 'plan_restricted' or 'empty' status is never converted to 'error' — only an actual thrown rejection is", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }];
  const results = await resolveWithFailureIsolation<FakeTeam, FakeRosterResult>(
    teams,
    async (t) => (t.id === "A" ? { players: [], status: "plan_restricted" } : { players: [], status: "empty" }),
    () => ({ players: [], status: "error" })
  );
  assert.deepEqual(results[0], { players: [], status: "plan_restricted" });
  assert.deepEqual(results[1], { players: [], status: "empty" });
});

test("resolveWithFailureIsolation: preserves the real per-team ordering (a rejection doesn't reorder or drop results)", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }];
  const results = await resolveWithFailureIsolation(
    teams,
    async (t) => { if (t.id === "B" || t.id === "D") throw new Error("down"); return t.id; },
    () => "error"
  );
  assert.deepEqual(results, ["A", "error", "C", "error"]);
});

// ── Regression: the Discovery hub landing page (getSportsLandingGames, via
// getCuratedForYou) must never go down because ONE sport's getGamesByDate
// call throws — this is the exact shape/scenario of that production
// outage: sport A and C return real games, sport B's provider/cache/DB call
// throws, and the whole batch must still resolve with A/C's games intact
// and B contributing none — never an unhandled rejection that 500s the
// page. getSportsLandingGames itself isn't unit-tested here (it's a thin
// DB/provider-backed wrapper) — these tests pin down the exact
// resolveWithFailureIsolation call shape it now uses for both the "today"
// lookup and each day of the 7-day upcoming loop.
interface FakeSport {
  slug: "A" | "B" | "C";
}
interface FakeGamesResult {
  games: { id: string; sport: string }[];
}

test("resolveWithFailureIsolation (today's games-by-date lookup shape): sport B throws, A and C's real games are preserved, function resolves without rejecting", async () => {
  const sports: FakeSport[] = [{ slug: "A" }, { slug: "B" }, { slug: "C" }];
  const results = await resolveWithFailureIsolation<FakeSport, FakeGamesResult>(
    sports,
    async (s) => {
      if (s.slug === "B") throw new Error("provider/cache/DB outage for sport B");
      return { games: [{ id: `${s.slug}-game-1`, sport: s.slug }] };
    },
    (): FakeGamesResult => ({ games: [] })
  );
  const allGames = results.flatMap((r) => r.games);
  assert.deepEqual(allGames, [{ id: "A-game-1", sport: "A" }, { id: "C-game-1", sport: "C" }]);
});

test("resolveWithFailureIsolation (future-day upcoming-games loop shape): same per-sport isolation applies to each day of the 7-day lookahead, not just today", async () => {
  const sports: FakeSport[] = [{ slug: "A" }, { slug: "B" }, { slug: "C" }];
  for (let daysOut = 1; daysOut <= 7; daysOut++) {
    const results = await resolveWithFailureIsolation<FakeSport, FakeGamesResult>(
      sports,
      async (s) => {
        if (s.slug === "B") throw new Error(`provider outage for sport B, day +${daysOut}`);
        return { games: [{ id: `${s.slug}-day${daysOut}`, sport: s.slug }] };
      },
      (): FakeGamesResult => ({ games: [] })
    );
    const allGames = results.flatMap((r) => r.games);
    assert.deepEqual(allGames, [{ id: `A-day${daysOut}`, sport: "A" }, { id: `C-day${daysOut}`, sport: "C" }]);
  }
});

// ── Regression: the Sports landing page (/dashboard/discovery/sports) must
// never go down because ONE optional data source fails — pickFeaturedMatchup
// (per-sport getGamesWithVoteContext calls) and the page's top-level
// Promise.all of independent enrichments (league logos, landing games,
// featured matchup, fantasy leagues, award races, rankings, tracked
// players) both now use the same per-source failure-isolation the rest of
// Sports already relies on. These tests pin the exact shapes/scenarios of
// that page-level regression the owner reported.

interface FakeSportForMatchup {
  slug: "NFL" | "NBA" | "MLB";
}
interface FakeVoteContextResult {
  contexts: { gameId: string; sport: string }[];
}

test("pickFeaturedMatchup shape: NFL and MLB return real contexts, NBA's getGamesWithVoteContext throws — the function still resolves with NFL/MLB's contexts and NBA contributes none", async () => {
  const sports: FakeSportForMatchup[] = [{ slug: "NFL" }, { slug: "NBA" }, { slug: "MLB" }];
  const results = await resolveWithFailureIsolation<FakeSportForMatchup, FakeVoteContextResult>(
    sports,
    async (s) => {
      if (s.slug === "NBA") throw new Error("provider/cache/DB outage for NBA");
      return { contexts: [{ gameId: `${s.slug}-g1`, sport: s.slug }] };
    },
    (): FakeVoteContextResult => ({ contexts: [] })
  );
  const allContexts = results.flatMap((r) => r.contexts);
  assert.deepEqual(allContexts, [{ gameId: "NFL-g1", sport: "NFL" }, { gameId: "MLB-g1", sport: "MLB" }]);
});

// The page's top-level load is a Promise.all of independent optional
// sources, each wrapped in its own .catch(fallback) — not
// resolveWithFailureIsolation (there's no shared "item list" to iterate,
// each source is a distinct feature). These tests exercise that exact
// per-source .catch() shape.
function loadSportsPageData(sources: {
  logos: () => Promise<Record<string, string>>;
  landingGames: () => Promise<{ live: unknown[]; upcoming: unknown[] }>;
  featuredMatchup: () => Promise<unknown | null>;
  fantasyLeagues: () => Promise<unknown[]>;
}) {
  return Promise.all([
    sources.logos().catch(() => ({})),
    sources.landingGames().catch(() => ({ live: [], upcoming: [] })),
    sources.featuredMatchup().catch(() => null),
    sources.fantasyLeagues().catch(() => []),
  ]);
}

test("Sports page top-level load: one optional source (featured matchup) throws — the other real sources are preserved and the failed one gets its documented fallback", async () => {
  const [logos, landingGames, featuredMatchup, fantasyLeagues] = await loadSportsPageData({
    logos: async () => ({ nfl: "https://logo/nfl.png" }),
    landingGames: async () => ({ live: [{ id: "g1" }], upcoming: [] }),
    featuredMatchup: async () => { throw new Error("pickFeaturedMatchup outage"); },
    fantasyLeagues: async () => [{ id: "league-1" }],
  });
  assert.deepEqual(logos, { nfl: "https://logo/nfl.png" });
  assert.deepEqual(landingGames, { live: [{ id: "g1" }], upcoming: [] });
  assert.equal(featuredMatchup, null);
  assert.deepEqual(fantasyLeagues, [{ id: "league-1" }]);
});

test("Sports page top-level load: every optional enrichment source throws — the page's base data still resolves, all sources degrade to their documented fallback, nothing rejects", async () => {
  const [logos, landingGames, featuredMatchup, fantasyLeagues] = await loadSportsPageData({
    logos: async () => { throw new Error("league logo provider down"); },
    landingGames: async () => { throw new Error("landing games provider down"); },
    featuredMatchup: async () => { throw new Error("featured matchup provider down"); },
    fantasyLeagues: async () => { throw new Error("fantasy DB down"); },
  });
  assert.deepEqual(logos, {});
  assert.deepEqual(landingGames, { live: [], upcoming: [] });
  assert.equal(featuredMatchup, null);
  assert.deepEqual(fantasyLeagues, []);
});

// ── playerNeedsEnrichment / mergeRosterPlayerFields: the shared roster
// field-completeness fix. Pure, no network — the real logic under every
// tier's "should I even attempt this?" and "what does merging actually do?"
// decisions in getTeamRoster below.

function player(overrides: Partial<SportsRosterPlayer> & { id: string; name: string }): SportsRosterPlayer {
  return { position: undefined, number: undefined, photoUrl: undefined, ...overrides };
}

test("playerNeedsEnrichment: true when position or number is missing, false when both are present", () => {
  assert.equal(playerNeedsEnrichment(player({ id: "1", name: "A" })), true);
  assert.equal(playerNeedsEnrichment(player({ id: "1", name: "A", position: "G" })), true);
  assert.equal(playerNeedsEnrichment(player({ id: "1", name: "A", number: 5 })), true);
  assert.equal(playerNeedsEnrichment(player({ id: "1", name: "A", position: "G", number: 5 })), false);
});

test("playerNeedsEnrichment: a missing photoUrl alone does NOT trigger enrichment (cost-aware — position/number only)", () => {
  assert.equal(playerNeedsEnrichment(player({ id: "1", name: "A", position: "G", number: 5, photoUrl: undefined })), false);
});

test("mergeRosterPlayerFields: Tier 1 partial roster — Tier 2 fills ONLY the missing fields, never overwrites a real Tier 1 value", () => {
  const base = [
    player({ id: "1", name: "Alice Smith", position: "G" }), // missing number
    player({ id: "2", name: "Bob Jones" }), // missing both
  ];
  const supplement = [
    player({ id: "sdio-1", name: "Alice Smith", position: "F", number: 10 }), // position differs — Tier 1 wins
    player({ id: "sdio-2", name: "Bob Jones", position: "C", number: 22 }),
  ];
  const merged = mergeRosterPlayerFields(base, supplement);
  assert.equal(merged[0].id, "1"); // real Tier 1 id preserved, never swapped for Tier 2's id
  assert.equal(merged[0].position, "G"); // Tier 1's real value wins over a conflicting Tier 2 value
  assert.equal(merged[0].number, 10); // filled from Tier 2, since Tier 1 had none
  assert.equal(merged[1].position, "C");
  assert.equal(merged[1].number, 22);
});

test("mergeRosterPlayerFields: a fully complete Tier 1 roster is untouched — same array reference returned (no-op, cost-aware)", () => {
  const base = [player({ id: "1", name: "Alice Smith", position: "G", number: 5 })];
  const supplement = [player({ id: "sdio-1", name: "Alice Smith", position: "F", number: 99 })];
  const merged = mergeRosterPlayerFields(base, supplement);
  assert.equal(merged, base);
});

test("mergeRosterPlayerFields: never adds a player the base roster doesn't already have", () => {
  const base = [player({ id: "1", name: "Alice Smith" })];
  const supplement = [player({ id: "sdio-1", name: "Alice Smith", position: "G", number: 5 }), player({ id: "sdio-2", name: "Someone Else", position: "F", number: 9 })];
  const merged = mergeRosterPlayerFields(base, supplement);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "Alice Smith");
});

test("mergeRosterPlayerFields: matches players by normalized name across providers (suffix/diacritic-insensitive), never a different real player", () => {
  const base = [player({ id: "1", name: "José Álvarez Jr." })];
  const supplement = [player({ id: "sdio-1", name: "Jose Alvarez", position: "C", number: 44 })];
  const merged = mergeRosterPlayerFields(base, supplement);
  assert.equal(merged[0].position, "C");
  assert.equal(merged[0].number, 44);
});

test("mergeRosterPlayerFields: an empty supplement is a no-op, returns base unchanged", () => {
  const base = [player({ id: "1", name: "Alice Smith" })];
  assert.equal(mergeRosterPlayerFields(base, []), base);
});

// ── getTeamRoster: multi-tier field enrichment + provenance (the shared
// roster architecture fix). Mocks BOTH the API-Sports host
// (v1.american-football.api-sports.io — Tier 1) and the SportsDataIO host
// (api.sportsdata.io — Tier 2's team-identity Standings call + its Players
// roster call) by routing on the request URL, the same pattern already
// used in providers/sports.test.ts and providers/sportsdata.test.ts.

function withProviderKeys<T>(fn: () => Promise<T>): Promise<T> {
  const originalApiSports = process.env.API_SPORTS_KEY;
  const originalSdio = process.env.SPORTSDATAIO_API_KEY;
  process.env.API_SPORTS_KEY = "test-key";
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  return fn().finally(() => {
    if (originalApiSports === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalApiSports;
    if (originalSdio === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalSdio;
  });
}

function mockRosterProviders(): () => void {
  const originalFetch = global.fetch;
  global.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes("v1.american-football.api-sports.io/players")) {
      // Tier 1: real players, real ids — one complete, one missing position/number.
      return new Response(JSON.stringify({
        response: [
          { player: { id: 1, name: "Josh Allen" }, statistics: [{ position: "QB", number: 17 }] },
          { player: { id: 2, name: "Stefon Diggs" } }, // no statistics block — position/number missing
        ],
      }), { status: 200 });
    }
    if (url.includes("api.sportsdata.io") && url.includes("/Standings/")) {
      // Tier 2's team-identity resolver (getSdioTeamDirectory).
      return new Response(JSON.stringify([{ Team: "Buffalo Bills", TeamID: 2, Key: "BUF", Wins: 11, Losses: 6 }]), { status: 200 });
    }
    if (url.includes("api.sportsdata.io") && url.includes("/Players")) {
      // Tier 2's real roster — has the field Tier 1 was missing for Stefon Diggs.
      return new Response(JSON.stringify([
        { PlayerID: 501, Name: "Stefon Diggs", Team: "BUF", TeamID: 2, Position: "WR", Jersey: 14 },
        { PlayerID: 502, Name: "Josh Allen", Team: "BUF", TeamID: 2, Position: "RB", Jersey: 99 }, // conflicting — Tier 1 already had this player complete
      ]), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  return () => { global.fetch = originalFetch; };
}

test("getTeamRoster: Tier 1 fully complete roster renders as-is, sources = [api-sports] only, Tier 2 never even called", () =>
  withProviderKeys(async () => {
    const originalFetch = global.fetch;
    let sdioCalled = false;
    global.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("v1.american-football.api-sports.io/players")) {
        return new Response(JSON.stringify({
          response: [{ player: { id: 1, name: "Josh Allen" }, statistics: [{ position: "QB", number: 17 }] }],
        }), { status: 200 });
      }
      if (url.includes("api.sportsdata.io")) sdioCalled = true;
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
    try {
      const result = await getTeamRoster("nfl", "2", { teamName: "Buffalo Bills", allowSecondarySource: true });
      assert.equal(result.status, "hit");
      assert.equal(result.players[0].position, "QB");
      assert.equal(result.players[0].number, 17);
      assert.deepEqual(result.sources, ["api-sports"]);
      assert.equal(sdioCalled, false, "a fully complete Tier 1 roster must never trigger a Tier 2 call — cost-aware, see CLAUDE.md §18");
      // Diagnostic must reflect "gate open, tier not attempted" (allowed vs
      // attempted are DIFFERENT signals) — this is the exact distinction
      // needed to tell "the gate was closed" apart from "the gate was open
      // but the tier had nothing to do."
      assert.equal(result.diagnostic?.tier1.attempted, true);
      assert.equal(result.diagnostic?.tier1.outcome, "hit");
      assert.equal(result.diagnostic?.tier1.playerCount, 1);
      assert.equal(result.diagnostic?.tier2.allowed, true);
      assert.equal(result.diagnostic?.tier2.attempted, false);
      assert.equal(result.diagnostic?.tier2.outcome, "not_attempted");
      assert.equal(result.diagnostic?.tier3.allowed, false, "allowOpenAiFallback was never passed in this call");
      assert.equal(result.diagnostic?.finalStatus, "hit");
      assert.equal(result.diagnostic?.finalPlayerCount, 1);
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("getTeamRoster: Tier 1 partial roster — Tier 2 enriches the missing fields, Tier 1 identity/ids preserved, sources reflects both tiers", () =>
  withProviderKeys(async () => {
    const restore = mockRosterProviders();
    try {
      const result = await getTeamRoster("nfl", "2", { teamName: "Buffalo Bills", allowSecondarySource: true });
      assert.equal(result.status, "hit");
      const diggs = result.players.find((p) => p.id === "2");
      assert.ok(diggs, "Tier 1's real player id must be preserved, never replaced by Tier 2's own id space");
      assert.equal(diggs?.position, "WR"); // filled from Tier 2
      assert.equal(diggs?.number, 14); // filled from Tier 2
      const allen = result.players.find((p) => p.id === "1");
      assert.equal(allen?.position, "QB"); // Tier 1's real value, NOT Tier 2's conflicting "RB"
      assert.equal(allen?.number, 17); // Tier 1's real value, NOT Tier 2's conflicting 99
      assert.deepEqual(result.sources, ["api-sports", "sportsdataio"]);
      assert.equal(result.diagnostic?.tier1.outcome, "hit");
      assert.equal(result.diagnostic?.tier2.allowed, true);
      assert.equal(result.diagnostic?.tier2.attempted, true, "Tier 1 had a real player still missing fields, so Tier 2 must actually run");
      assert.equal(result.diagnostic?.tier2.outcome, "hit");
      assert.equal(result.diagnostic?.finalSources.length, 2);
    } finally {
      restore();
    }
  }));

test("getTeamRoster: diagnostic distinguishes a CLOSED gate (allowed: false) from an open gate the tier didn't need — the exact signal a real 'why didn't Tier 3 run' investigation needs", () =>
  withProviderKeys(async () => {
    const restore = mockRosterProviders();
    try {
      // allowOpenAiFallback is never passed here — exactly the real gap in
      // resolveFollowedTeamRosters (service.ts), which calls getTeamRoster
      // without ever offering that option at all.
      const result = await getTeamRoster("nfl", "2", { teamName: "Buffalo Bills", allowSecondarySource: true });
      assert.equal(result.diagnostic?.tier3.allowed, false);
      assert.equal(result.diagnostic?.tier3.attempted, false);
      assert.equal(result.diagnostic?.tier3.outcome, "not_attempted");
    } finally {
      restore();
    }
  }));

test("getTeamRoster: diagnostic on total failure (no team id) — no tier claims to have been allowed or attempted", async () => {
  const result = await getTeamRoster("nfl", "");
  assert.equal(result.status, "not_supported");
  assert.equal(result.diagnostic, undefined, "the trivial no-team-id early return never asked any provider anything, so there's nothing to trace");
});

// ── getTeamRoster: OpenAI fallback wiring (Tier 3+4 of the Verified Sports
// Data Source Ladder). These exercise the SERVICE-LEVEL wiring only — the
// resolver's own evidence-validation logic has its own direct tests in
// openai-resolver.test.ts. No API-Sports/SportsDataIO key exists in this
// sandbox, so Tier 1/2 are naturally unconfigured/empty here, isolating
// the OpenAI branch.

function withOpenAIKey<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  return fn().finally(() => {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  });
}

function mockTwoStepOpenAIFetch(citationUrl = "https://www.nba.com/team/x/roster"): () => void {
  const originalFetch = global.fetch;
  global.fetch = (async (_url: any, init: any) => {
    const req = JSON.parse(init.body);
    if (req.tools) {
      return new Response(
        JSON.stringify({
          output: [
            { type: "web_search_call" },
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "five real players",
                  annotations: [{ type: "url_citation", url: citationUrl, title: "Official Roster" }],
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }
    const players = Array.from({ length: 6 }, (_, i) => ({ name: `Player ${i}`, position: "G", number: i }));
    return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ players }) }] }] }), { status: 200 });
  }) as typeof fetch;
  return () => {
    global.fetch = originalFetch;
  };
}

test("getTeamRoster: OpenAI fallback never runs for ncaaf — no verified single-domain trusted source exists for college football (see ROSTER_RESOLVER_LEAGUES in openai-resolver.ts)", async () => {
  const restore = mockTwoStepOpenAIFetch();
  try {
    const result = await withOpenAIKey(() => getTeamRoster("ncaaf", "some-id", { teamName: "Some Team", allowOpenAiFallback: true }));
    assert.equal(result.status, "not_supported");
    assert.equal(result.players.length, 0);
  } finally {
    restore();
  }
});

test("getTeamRoster: OpenAI fallback never runs when allowOpenAiFallback is not set, even for a supported league — opt-in only", async () => {
  const restore = mockTwoStepOpenAIFetch();
  try {
    const result = await withOpenAIKey(() => getTeamRoster("nba", "some-id", { teamName: "Some Team" }));
    assert.equal(result.players.length, 0);
  } finally {
    restore();
  }
});

test("getTeamRoster: NBA + allowOpenAiFallback resolves a validated roster with synthetic stable ids and provenance, once Tier 1/2 have nothing", () =>
  withOpenAIKey(async () => {
    const restore = mockTwoStepOpenAIFetch();
    try {
      const result = await getTeamRoster("nba", "some-id", { teamName: `Test Team ${Date.now()}`, allowOpenAiFallback: true });
      assert.equal(result.status, "hit");
      assert.equal(result.players.length, 6);
      assert.equal(result.players[0].id, "openai:nba:player-0");
      assert.equal(result.provenance?.resolver, "openai_web_search");
      assert.deepEqual(result.sources, ["openai_web_search"]);
    } finally {
      restore();
    }
  }));

test("getTeamRoster: WNBA + allowOpenAiFallback works the same way (generalized fallback, not NBA-only)", () =>
  withOpenAIKey(async () => {
    const restore = mockTwoStepOpenAIFetch("https://www.wnba.com/team/x/roster");
    try {
      const result = await getTeamRoster("wnba", "some-id", { teamName: `Test Team ${Date.now()}`, allowOpenAiFallback: true });
      assert.equal(result.status, "hit");
      assert.equal(result.players.length, 6);
      assert.equal(result.players[0].id, "openai:wnba:player-0");
    } finally {
      restore();
    }
  }));

test("getTeamRoster: NFL + allowOpenAiFallback works the same way (generalized fallback, not NBA-only)", () =>
  withOpenAIKey(async () => {
    const restore = mockTwoStepOpenAIFetch("https://www.nfl.com/team/x/roster");
    try {
      const result = await getTeamRoster("nfl", "some-id", { teamName: `Test Team ${Date.now()}`, allowOpenAiFallback: true });
      assert.equal(result.status, "hit");
      assert.equal(result.players.length, 6);
      assert.equal(result.players[0].id, "openai:nfl:player-0");
    } finally {
      restore();
    }
  }));

// ── resolveFollowedTeamRosters: confirmed defect fix — this "My Teams"
// surface previously had no way to request Tier 3 at all, so the SAME
// real team could get a different real fallback capability depending on
// which UI surface asked for its roster (TeamRosterPanel's API route
// already passed allowOpenAiFallback; this one silently never did).
// These prove BOTH call paths now receive equivalent Owner-gated
// permission for the identical team/options.

test("resolveFollowedTeamRosters: WITHOUT allowOpenAiFallback passed, Tier 3 never runs even for a supported league — the confirmed pre-fix gap, still reproducible if the option is simply omitted", () =>
  withOpenAIKey(async () => {
    const restore = mockTwoStepOpenAIFetch();
    try {
      const map = await resolveFollowedTeamRosters("nba", [{ followId: "f1", teamExternalId: null, teamName: "Some Team" }], false);
      assert.equal(map.get("f1")?.players.length, 0);
    } finally {
      restore();
    }
  }));

test("resolveFollowedTeamRosters: passing allowOpenAiFallback now reaches Tier 3, identically to the TeamRosterPanel/API-route path for the same team/options", () =>
  withOpenAIKey(async () => {
    const restore = mockTwoStepOpenAIFetch();
    try {
      const teamName = `Test Team ${Date.now()}`;
      const [directResult, followedMap] = await Promise.all([
        getTeamRoster("nba", "some-id", { teamName, allowOpenAiFallback: true }),
        resolveFollowedTeamRosters("nba", [{ followId: "f1", teamExternalId: "some-id", teamName }], false, true),
      ]);
      const followedResult = followedMap.get("f1");
      assert.equal(directResult.status, "hit");
      assert.equal(followedResult?.status, "hit");
      assert.equal(directResult.players.length, followedResult?.players.length);
      assert.deepEqual(directResult.sources, followedResult?.sources);
    } finally {
      restore();
    }
  }));
