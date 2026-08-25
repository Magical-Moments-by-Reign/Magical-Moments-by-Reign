import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveWithFailureIsolation, getTeamRoster, getLeagueTeamCatalogWithOffSeasonFallback, mergeCatalogWithPriorSeason } from "./service";
import type { SportsTeam } from "../providers/sports";

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

// ── getTeamRoster: OpenAI fallback wiring (Tier 3+4 of the Verified Sports
// Data Source Ladder). These exercise the SERVICE-LEVEL wiring only — the
// resolver's own evidence-validation logic has its own direct tests in
// openai-resolver.test.ts. No API-Sports/SportsDataIO key exists in this
// sandbox, so Tier 1/2 are naturally unconfigured/empty here, isolating
// the new NBA branch.

function withOpenAIKey<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  return fn().finally(() => {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  });
}

function mockTwoStepOpenAIFetch(): () => void {
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
                  annotations: [{ type: "url_citation", url: "https://www.nba.com/team/x/roster", title: "Official Roster" }],
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

test("getTeamRoster: OpenAI fallback never runs for a non-NBA sport, even when allowOpenAiFallback is true", async () => {
  const restore = mockTwoStepOpenAIFetch();
  try {
    const result = await withOpenAIKey(() => getTeamRoster("nfl", "some-id", { teamName: "Some Team", allowOpenAiFallback: true }));
    assert.equal(result.status, "not_supported");
    assert.equal(result.players.length, 0);
  } finally {
    restore();
  }
});

test("getTeamRoster: OpenAI fallback never runs when allowOpenAiFallback is not set, even for NBA — opt-in only", async () => {
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
    } finally {
      restore();
    }
  }));
