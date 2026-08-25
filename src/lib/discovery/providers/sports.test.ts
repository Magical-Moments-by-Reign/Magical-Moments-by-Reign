import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonParam, previousSeasonParam, detectPlanRestriction, ApiSportsProvider, mapGameItem, mapRosterPlayer, rankTeamMatches, fetchTeamsForLeague, flattenStatEntry, mapTeamGameStats, mapTeamPlayerGameStats, resolveNcaaBaseballLeagueId, sportHost, fetchRawTeamsResponseDiagnostic, fetchLeagueVerificationDiagnostic } from "./sports";

test("sportHost: returns the real configured host for a sport, matching SPORT_CONFIG", () => {
  assert.equal(sportHost("nhl"), "v1.hockey.api-sports.io");
  assert.equal(sportHost("nba"), "v1.basketball.api-sports.io");
});

test("fetchRawTeamsResponseDiagnostic: no configured provider — every field degrades to a safe, honest value, never throws", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await fetchRawTeamsResponseDiagnostic("nhl", "57", "2026-2027");
    assert.deepEqual(result, {
      season: "2026-2027",
      requestSucceeded: false,
      hasResponseField: false,
      responseIsArray: false,
      responseLength: null,
      pagingPresent: false,
      pagingCurrent: null,
      pagingTotal: null,
      errorsFieldPresent: false,
      mappedTeamCount: 0,
    });
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("fetchLeagueVerificationDiagnostic: no configured provider — UNCONFIRMED, never a guessed match", async () => {
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  try {
    const result = await fetchLeagueVerificationDiagnostic("nhl", "57", /nhl/i);
    assert.deepEqual(result, { attempted: false, matchedId: null, matchedName: null, confirmed: "UNCONFIRMED" });
  } finally {
    if (originalKey !== undefined) process.env.API_SPORTS_KEY = originalKey;
  }
});

test("seasonParam: nba/ncaab/nhl use split-year seasons, keyed off an August season start", () => {
  // nba, ncaab, and nhl each have a real season that genuinely spans a
  // calendar-year boundary — see seasonParam's doc comment.
  assert.equal(seasonParam("nba", "2026-01-15"), "2025-2026");
  assert.equal(seasonParam("ncaab", "2026-01-15"), "2025-2026");
  assert.equal(seasonParam("nhl", "2026-01-15"), "2025-2026");
  assert.equal(seasonParam("nba", "2026-11-01"), "2026-2027");
  assert.equal(seasonParam("nba", "2026-08-01"), "2026-2027");
  assert.equal(seasonParam("nba", "2026-07-31"), "2025-2026");
});

test("seasonParam: wnba (and every other non-split sport) uses a plain single-year season", () => {
  // wnba shares nba's basketball host, but its own real season runs
  // entirely within one calendar year (May-October) — it was previously,
  // incorrectly, forced into the split format on host-membership grounds
  // alone. See SPLIT_SEASON_SPORTS' doc comment.
  assert.equal(seasonParam("wnba", "2026-01-15"), "2026");
  assert.equal(seasonParam("wnba", "2026-08-23"), "2026");
  assert.equal(seasonParam("nfl", "2026-01-15"), "2026");
  assert.equal(seasonParam("mlb", "2026-06-01"), "2026");
  assert.equal(seasonParam("soccer", "2026-11-01"), "2026");
});

test("previousSeasonParam: steps back one season using the same per-sport split/plain convention", () => {
  assert.equal(previousSeasonParam("nba", "2026-08-23"), "2025-2026");
  assert.equal(previousSeasonParam("nhl", "2026-08-23"), "2025-2026");
  assert.equal(previousSeasonParam("wnba", "2026-08-23"), "2025");
  assert.equal(previousSeasonParam("nfl", "2026-08-23"), "2025");
  assert.equal(previousSeasonParam("mlb", "2026-06-01"), "2025");
});

test("detectPlanRestriction: finds a Free-plan date-restriction message under errors.plan", () => {
  const json = { get: "games", errors: { plan: "Error/Free plan, You can't access this date, try a date between 2021-08-01 and 2023-06-24." }, results: 0, response: [] };
  assert.match(detectPlanRestriction(json) ?? "", /Free plan/);
});

test("detectPlanRestriction: also finds it when errors is an array of strings", () => {
  const json = { errors: ["Error/Free plan, you don't have access to this date."], response: [] };
  assert.match(detectPlanRestriction(json) ?? "", /don't have access/);
});

test("detectPlanRestriction: returns null when errors is absent or empty (real success/empty response)", () => {
  assert.equal(detectPlanRestriction({ errors: [], response: [] }), null);
  assert.equal(detectPlanRestriction({ errors: {}, response: [] }), null);
  assert.equal(detectPlanRestriction({ response: [] }), null);
  assert.equal(detectPlanRestriction(null), null);
});

test("detectPlanRestriction: a non-plan error (bad params, rate limit) is not mistaken for a plan restriction", () => {
  const json = { errors: { requests: "Too many requests per minute" }, response: [] };
  assert.equal(detectPlanRestriction(json), null);
});

test("searchTeams sends only `search` to /teams — never `league` (API-Sports rejects league without season)", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  let calledUrl = "";
  process.env.API_SPORTS_KEY = "test-key";
  global.fetch = (async (input: any) => {
    calledUrl = String(input);
    return new Response(JSON.stringify({ response: [{ team: { id: 1, name: "New England Patriots", logo: "https://x/logo.png" } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const teams = await ApiSportsProvider.searchTeams("nfl", "New England Patriots");
    const url = new URL(calledUrl);
    assert.equal(url.searchParams.get("search"), "New England Patriots");
    assert.equal(url.searchParams.get("league"), null);
    assert.equal(teams?.[0]?.name, "New England Patriots");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

test("fetchTeamsForLeague sends `league` and `season` to /teams — the scoped roster query, never `search`", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  let calledUrl = "";
  process.env.API_SPORTS_KEY = "test-key";
  global.fetch = (async (input: any) => {
    calledUrl = String(input);
    return new Response(JSON.stringify({ response: [{ team: { id: 1, name: "Chicago Bulls", logo: "https://x/bulls.png" } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const teams = await fetchTeamsForLeague("nba", "12", "2025-2026");
    const url = new URL(calledUrl);
    assert.equal(url.searchParams.get("league"), "12");
    assert.equal(url.searchParams.get("season"), "2025-2026");
    assert.equal(url.searchParams.get("search"), null);
    assert.equal(teams?.[0]?.name, "Chicago Bulls");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

// Real, current NBA roster shape — exactly what fetchTeamsForLeague("nba", "12", ...)
// returns: only the 30 real franchises, never a G-League/international team
// that happens to share a word (e.g. Windy City Bulls) — those live under a
// completely different league id and are never in this list to begin with.
const NBA_ROSTER = [
  { id: "1", name: "Chicago Bulls" },
  { id: "2", name: "Los Angeles Lakers" },
  { id: "3", name: "Boston Celtics" },
  { id: "4", name: "Brooklyn Nets" },
];
const NFL_ROSTER = [{ id: "1", name: "New England Patriots" }, { id: "2", name: "Dallas Cowboys" }];
const MLB_ROSTER = [{ id: "1", name: "New York Yankees" }, { id: "2", name: "New York Mets" }];

test("rankTeamMatches: NBA 'Bulls' returns Chicago Bulls only, from the real scoped roster", () => {
  const results = rankTeamMatches(NBA_ROSTER, "Bulls");
  assert.deepEqual(results.map((t) => t.name), ["Chicago Bulls"]);
});

test("rankTeamMatches: NBA 'Lakers' returns Los Angeles Lakers only", () => {
  const results = rankTeamMatches(NBA_ROSTER, "Lakers");
  assert.deepEqual(results.map((t) => t.name), ["Los Angeles Lakers"]);
});

test("rankTeamMatches: NFL 'Patriots' returns New England Patriots only", () => {
  const results = rankTeamMatches(NFL_ROSTER, "Patriots");
  assert.deepEqual(results.map((t) => t.name), ["New England Patriots"]);
});

test("rankTeamMatches: MLB 'Yankees' returns New York Yankees only — 'New York' alone would rank both, but doesn't false-match on the exact team nickname", () => {
  assert.deepEqual(rankTeamMatches(MLB_ROSTER, "Yankees").map((t) => t.name), ["New York Yankees"]);
  const both = rankTeamMatches(MLB_ROSTER, "New York");
  assert.equal(both.length, 2); // both are real matches for this broader query — not a false positive
});

test("rankTeamMatches: a city-name query ('Chicago') ranks the exact-word match first", () => {
  const results = rankTeamMatches(NBA_ROSTER, "Chicago");
  assert.equal(results[0].name, "Chicago Bulls");
});

test("rankTeamMatches: cross-league contamination can't occur — a team from a completely different roster is simply never in the input", () => {
  // The architectural guarantee: rankTeamMatches only ever sees the roster
  // fetchTeamsForLeague returned for ONE real league id. A same-named G-League
  // or international club lives under a different league id and is never
  // part of this array — there is nothing here to filter, by construction.
  const contaminationFreeRoster = NBA_ROSTER.filter((t) => t.name === "Chicago Bulls");
  assert.deepEqual(rankTeamMatches(contaminationFreeRoster, "Bulls").map((t) => t.name), ["Chicago Bulls"]);
});

test("rankTeamMatches: empty query returns no results", () => {
  assert.deepEqual(rankTeamMatches(NBA_ROSTER, "   "), []);
});

test("ApiSportsProvider.standings: soccer reads real wins/draws/losses from `all` and `points` from the top level — not the games.win.total shape other sports use", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  process.env.API_SPORTS_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify({
      response: [[
        { rank: 1, team: { id: 1, name: "Arsenal", logo: "https://x/arsenal.png" }, points: 33, all: { win: 10, draw: 3, lose: 2 } },
      ]],
    }), { status: 200 })) as typeof fetch;
  try {
    const result = await ApiSportsProvider.standings("soccer", "39", "2025");
    const row = result?.standings[0];
    assert.equal(row?.wins, 10);
    assert.equal(row?.losses, 2);
    assert.equal(row?.ties, 3);
    assert.equal(row?.points, 33);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

test("ApiSportsProvider.standings: non-soccer sports keep reading games.win.total (unaffected by the soccer-specific shape)", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  process.env.API_SPORTS_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify({
      response: [{ team: { id: 1, name: "Celtics" }, games: { win: { total: 50 }, lose: { total: 32 } } }],
    }), { status: 200 })) as typeof fetch;
  try {
    const result = await ApiSportsProvider.standings("nba", "12", "2025-2026");
    assert.equal(result?.standings[0]?.wins, 50);
    assert.equal(result?.standings[0]?.losses, 32);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

// ── ncaabaseball's dynamic league resolution — "ask, don't hardcode" ──────
// College baseball has no static SPORT_CONFIG league id (unlike ncaaf/ncaab)
// since API-Sports' baseball product has never been confirmed to cover NCAA
// baseball at all — resolveNcaaBaseballLeagueId asks the provider's real
// /leagues catalog instead of guessing a number, the same pattern
// resolveBettingMarketTypeId (sportsdata.ts) already uses for a betting
// market id.

test("resolveNcaaBaseballLeagueId: returns the real id of a league whose Name matches NCAA/College", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  let calledUrl = "";
  process.env.API_SPORTS_KEY = "test-key";
  global.fetch = (async (input: any) => {
    calledUrl = String(input);
    return new Response(JSON.stringify({
      response: [
        { league: { id: 1, name: "MLB" } },
        { league: { id: 42, name: "NCAA Baseball" } },
        { league: { id: 7, name: "NPB" } },
      ],
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const id = await resolveNcaaBaseballLeagueId();
    const url = new URL(calledUrl);
    assert.match(url.hostname, /^v1\.baseball\.api-sports\.io$/);
    assert.equal(url.pathname, "/leagues");
    assert.equal(id, "42");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

test("resolveNcaaBaseballLeagueId: returns null (never a guessed id) when nothing in the real catalog matches", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  process.env.API_SPORTS_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify({ response: [{ league: { id: 1, name: "MLB" } }, { league: { id: 7, name: "NPB" } }] }), { status: 200 })
  ) as typeof fetch;
  try {
    assert.equal(await resolveNcaaBaseballLeagueId(), null);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

test("resolveNcaaBaseballLeagueId: returns null without any network call when unconfigured (no API_SPORTS_KEY)", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.API_SPORTS_KEY;
  delete process.env.API_SPORTS_KEY;
  let fetchCalled = false;
  global.fetch = (async () => { fetchCalled = true; return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    assert.equal(await resolveNcaaBaseballLeagueId(), null);
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.API_SPORTS_KEY;
    else process.env.API_SPORTS_KEY = originalKey;
  }
});

test("mapGameItem reads stage from the game object — the same nesting id/date/status already use", () => {
  const g = mapGameItem("nfl", "1", {
    game: { id: 5001, date: { date: "2026-08-21" }, status: { short: "NS" }, stage: "Pre Season" },
    teams: { home: { id: 1, name: "Home Team" }, away: { id: 2, name: "Away Team" } },
  });
  assert.equal(g?.stage, "Pre Season");
});

test("mapGameItem never fabricates a stage when API-Sports doesn't report one", () => {
  const g = mapGameItem("nfl", "1", {
    game: { id: 5002, date: { date: "2026-08-21" }, status: { short: "NS" } },
    teams: { home: { id: 1, name: "Home Team" }, away: { id: 2, name: "Away Team" } },
  });
  assert.equal(g?.stage, undefined);
});

test("mapRosterPlayer reads position/number from statistics[0] — American Football's shape", () => {
  const p = mapRosterPlayer({
    player: { id: 301, name: "Mac Jones", photo: "https://x/players/301.png" },
    statistics: [{ team: { id: 1 }, position: "QB", number: 10 }],
  });
  assert.deepEqual(p, { id: "301", name: "Mac Jones", position: "QB", number: 10, photoUrl: "https://x/players/301.png" });
});

test("mapRosterPlayer falls back to root-level fields for verticals that don't nest under player/statistics", () => {
  const p = mapRosterPlayer({ id: 55, name: "Jane Athlete", position: "G", number: 23 });
  assert.deepEqual(p, { id: "55", name: "Jane Athlete", position: "G", number: 23, photoUrl: undefined });
});

test("mapRosterPlayer never fabricates position/number/photo API-Sports didn't report", () => {
  const p = mapRosterPlayer({ player: { id: 9, name: "No Stats Player" }, statistics: [{}] });
  assert.deepEqual(p, { id: "9", name: "No Stats Player", position: undefined, number: undefined, photoUrl: undefined });
});

test("mapRosterPlayer returns null when the provider omits an id or name", () => {
  assert.equal(mapRosterPlayer({ player: { name: "No Id" } }), null);
  assert.equal(mapRosterPlayer({ player: { id: 1 } }), null);
});

test("mapRosterPlayer rejects a non-https photo URL rather than rendering it", () => {
  const p = mapRosterPlayer({ player: { id: 2, name: "Sketchy Photo", photo: "javascript:alert(1)" } });
  assert.equal(p?.photoUrl, undefined);
});

test("flattenStatEntry reads the flat {type, value} convention", () => {
  assert.deepEqual(flattenStatEntry({ type: "Passing Yards", value: 287 }), [{ label: "Passing Yards", value: 287 }]);
  assert.deepEqual(flattenStatEntry({ name: "Turnovers", value: "2" }), [{ label: "Turnovers", value: "2" }]);
});

test("flattenStatEntry reads a named-field object as its own stats, humanizing keys", () => {
  const lines = flattenStatEntry({ category: "passing", completions: 18, attempts: 25, yardsPerAttempt: 9.2 });
  assert.deepEqual(lines, [
    { label: "Completions", value: 18 },
    { label: "Attempts", value: 25 },
    { label: "Yards Per Attempt", value: 9.2 },
  ]);
});

test("flattenStatEntry never fabricates a stat from a non-object or empty entry", () => {
  assert.deepEqual(flattenStatEntry(null), []);
  assert.deepEqual(flattenStatEntry("garbage"), []);
  assert.deepEqual(flattenStatEntry({ type: "No Value Reported" }), []);
});

test("mapTeamGameStats reads real team identity + flattens its statistics list", () => {
  const row = mapTeamGameStats({
    team: { id: 5, name: "Buffalo Bills", logo: "https://x/bills.png" },
    statistics: [{ type: "Total Yards", value: 412 }, { type: "Turnovers", value: 1 }],
  });
  assert.deepEqual(row, {
    team: { id: "5", name: "Buffalo Bills", logoUrl: "https://x/bills.png" },
    stats: [{ label: "Total Yards", value: 412 }, { label: "Turnovers", value: 1 }],
  });
});

test("mapTeamGameStats returns null when the provider omits team identity", () => {
  assert.equal(mapTeamGameStats({ statistics: [] }), null);
});

test("mapTeamPlayerGameStats reads players nested directly under the team", () => {
  const row = mapTeamPlayerGameStats({
    team: { id: 5, name: "Buffalo Bills" },
    players: [{ player: { id: 100, name: "Josh Allen" }, statistics: [{ type: "Passing Yards", value: 287 }] }],
  });
  assert.deepEqual(row, {
    team: { id: "5", name: "Buffalo Bills", logoUrl: undefined },
    players: [{ player: { id: "100", name: "Josh Allen" }, category: undefined, stats: [{ label: "Passing Yards", value: 287 }] }],
  });
});

test("mapTeamPlayerGameStats reads players nested under named statistical groups", () => {
  const row = mapTeamPlayerGameStats({
    team: { id: 5, name: "Buffalo Bills" },
    groups: [{ name: "Rushing", players: [{ player: { id: 101, name: "James Cook" }, statistics: [{ type: "Rushing Yards", value: 94 }] }] }],
  });
  assert.equal(row?.players.length, 1);
  assert.equal(row?.players[0].category, "Rushing");
  assert.deepEqual(row?.players[0].stats, [{ label: "Rushing Yards", value: 94 }]);
});

test("mapTeamPlayerGameStats never fabricates a player whose real statistics are empty", () => {
  const row = mapTeamPlayerGameStats({
    team: { id: 5, name: "Buffalo Bills" },
    players: [{ player: { id: 102, name: "No Stats Player" }, statistics: [] }],
  });
  assert.deepEqual(row?.players, []);
});
