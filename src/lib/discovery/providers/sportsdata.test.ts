import { test } from "node:test";
import assert from "node:assert/strict";
import { toSdioGame, fetchNbaFirstGame, toSdioStandingRow, fetchGamesByDate, fetchStandings, toSdioInjury, toSdioRanking, toPlayer, fetchPlayerSeasonStats, looksLikeScrambledStats } from "./sportsdata";

test("toSdioGame maps a real SportsDataIO Games row", () => {
  const g = toSdioGame({ GameID: 501, DateTime: "2026-10-03T19:30:00", HomeTeamName: "Toronto Raptors", AwayTeamName: "Miami Heat", Status: "Scheduled", Channel: "NBA TV" });
  assert.deepEqual(g, {
    externalId: "501",
    homeTeam: "Toronto Raptors",
    awayTeam: "Miami Heat",
    startsAt: new Date("2026-10-03T19:30:00").toISOString(),
    status: "Scheduled",
    channel: "NBA TV",
  });
});

test("toSdioGame returns null when a required field is missing or the date can't be parsed", () => {
  assert.equal(toSdioGame({ DateTime: "2026-10-03T19:30:00", HomeTeamName: "Raptors", AwayTeamName: "Heat" }), null);
  assert.equal(toSdioGame({ GameID: 1, HomeTeamName: "Raptors", AwayTeamName: "Heat" }), null);
  assert.equal(toSdioGame({ GameID: 1, DateTime: "not-a-date", HomeTeamName: "Raptors", AwayTeamName: "Heat" }), null);
});

test("fetchNbaFirstGame picks the earliest not-yet-started, non-canceled game", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const soon = new Date(Date.now() + 86_400_000).toISOString();
  const later = new Date(Date.now() + 2 * 86_400_000).toISOString();
  global.fetch = (async () =>
    new Response(
      JSON.stringify([
        { GameID: 1, DateTime: past, HomeTeamName: "Past Home", AwayTeamName: "Past Away" },
        { GameID: 2, DateTime: soon, HomeTeamName: "Raptors", AwayTeamName: "Heat", Status: "Canceled" },
        { GameID: 3, DateTime: later, HomeTeamName: "Celtics", AwayTeamName: "Knicks" },
      ]),
      { status: 200 },
    )) as typeof fetch;
  try {
    const game = await fetchNbaFirstGame("2026PRE");
    assert.equal(game?.externalId, "3");
    assert.equal(game?.homeTeam, "Celtics");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("fetchNbaFirstGame returns null when unconfigured or the provider has nothing", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    assert.equal(await fetchNbaFirstGame("2026PRE"), null);
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("toSdioStandingRow maps a real Standings row and rejects one missing wins/losses", () => {
  assert.deepEqual(toSdioStandingRow({ Name: "Boston Celtics", TeamID: 2, Wins: 12, Losses: 3 }), { team: "Boston Celtics", teamId: "2", wins: 12, losses: 3 });
  assert.equal(toSdioStandingRow({ Name: "Boston Celtics" }), null);
  assert.equal(toSdioStandingRow({ Wins: 12, Losses: 3 }), null);
});

test("fetchGamesByDate and fetchStandings return null when unconfigured", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    assert.equal(await fetchGamesByDate("nba", "2026-10-03"), null);
    assert.equal(await fetchStandings("nba", 2026), null);
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("fetchStandings maps a real response and drops unusable rows, for any league", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify([
      { Name: "Boston Celtics", TeamID: 2, Wins: 12, Losses: 3 },
      { Name: "No Record Team" },
    ]), { status: 200 })) as typeof fetch;
  try {
    const nbaRows = await fetchStandings("nba", 2026);
    assert.deepEqual(nbaRows, [{ team: "Boston Celtics", teamId: "2", wins: 12, losses: 3 }]);
    const nflRows = await fetchStandings("nfl", 2026);
    assert.deepEqual(nflRows, [{ team: "Boston Celtics", teamId: "2", wins: 12, losses: 3 }]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("toSdioInjury maps a real InjuredPlayers row and rejects one missing an id/name", () => {
  assert.deepEqual(
    toSdioInjury({ PlayerID: 9, Name: "Test Player", Team: "BOS", Position: "G", InjuryStatus: "Questionable", InjuryBodyPart: "Ankle" }),
    { playerId: "9", playerName: "Test Player", team: "BOS", position: "G", status: "Questionable", bodyPart: "Ankle", practiceStatus: undefined, updated: undefined },
  );
  assert.equal(toSdioInjury({ Team: "BOS" }), null);
});

test("toSdioRanking maps a real Rankings row and rejects one missing a rank/team", () => {
  assert.deepEqual(
    toSdioRanking({ Rank: 3, School: "Georgia", TeamID: 55, Poll: "AP Top 25", Points: 1400 }),
    { rank: 3, team: "Georgia", teamId: "55", poll: "AP Top 25", points: 1400, previousRank: undefined },
  );
  assert.equal(toSdioRanking({ School: "Georgia" }), null);
});

test("toPlayer reads the extended bio/draft fields defensively, including a feet-inches height string", () => {
  const p = toPlayer("nfl", {
    PlayerID: 9, Name: "Test Player", Team: "NE", Position: "QB", Jersey: 13, Status: "Active",
    Height: "6'2\"", Weight: 215, BirthCity: "Austin", BirthState: "TX", HighSchool: "Test High",
    College: "Syracuse", CollegeDraftYear: 2024, CollegeDraftRound: 3, CollegeDraftPick: 88, CollegeDraftTeam: "Giants",
  });
  assert.equal(p?.heightInches, 74);
  assert.equal(p?.weightLbs, 215);
  assert.equal(p?.birthCity, "Austin");
  assert.equal(p?.birthState, "TX");
  assert.equal(p?.highSchool, "Test High");
  assert.equal(p?.draftYear, 2024);
  assert.equal(p?.draftRound, 3);
  assert.equal(p?.draftPick, 88);
  assert.equal(p?.draftTeam, "Giants");
});

test("toPlayer leaves extended fields undefined rather than guessing when the shape is unrecognized", () => {
  const p = toPlayer("nfl", { PlayerID: 1, Name: "No Extras" });
  assert.equal(p?.heightInches, undefined);
  assert.equal(p?.weightLbs, undefined);
  assert.equal(p?.draftYear, undefined);
});

test("fetchPlayerSeasonStats returns [] when unconfigured", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    assert.deepEqual(await fetchPlayerSeasonStats("nfl", "9", 2026), []);
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("fetchPlayerSeasonStats keeps only known numeric fields from a real response, and reads the row's Team", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify([{ PassingYards: 3842, PassingTouchdowns: 31, Team: "NE", TeamName: "not a stat" }]), { status: 200 })) as typeof fetch;
  try {
    const stats = await fetchPlayerSeasonStats("nfl", "9", 2026);
    assert.deepEqual(stats, [{ team: "NE", stats: { PassingYards: 3842, PassingTouchdowns: 31 } }]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("looksLikeScrambledStats flags fractional receptions/yards/TDs — real completed-game counting stats are never decimals", () => {
  // Mack Hollins' real 2025 line (46 rec, 550 yds, 2 TD) reported as a
  // scrambled trial-data decimal — this is the exact shape that must be
  // rejected rather than rendered as if it were real.
  assert.equal(looksLikeScrambledStats("nfl", { Receptions: 60.6, ReceivingYards: 724.9, ReceivingTouchdowns: 3.5 }), true);
  assert.equal(looksLikeScrambledStats("nfl", { Games: 15.2 }), true);
});

test("looksLikeScrambledStats does not flag real fractional sack/tackle-for-loss stats — those are legitimately scored in halves", () => {
  assert.equal(looksLikeScrambledStats("nfl", { Sacks: 2.5, TacklesForLoss: 1.5, Tackles: 4.5, Receptions: 46, ReceivingYards: 550, ReceivingTouchdowns: 2 }), false);
});

test("looksLikeScrambledStats does not flag real rate/percentage fields", () => {
  assert.equal(looksLikeScrambledStats("nfl", { PassingCompletionPercentage: 67.3, RushingYardsPerAttempt: 4.8, ReceivingYardsPerReception: 12.0, Receptions: 46 }), false);
});

test("fetchPlayerSeasonStats rejects a row with scrambled/projected-looking counting stats rather than displaying it", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify([{ Receptions: 60.6, ReceivingYards: 724.9, ReceivingTouchdowns: 3.5, Team: "NE" }]), { status: 200 })) as typeof fetch;
  try {
    const stats = await fetchPlayerSeasonStats("nfl", "9", 2025);
    assert.deepEqual(stats, []);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("fetchPlayerSeasonStats preserves two real per-team rows for a mid-season trade, keying each by its own Team", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify([
      { Team: "PHI", Receptions: 20, ReceivingYards: 240, ReceivingTouchdowns: 1 },
      { Team: "MIA", Receptions: 26, ReceivingYards: 310, ReceivingTouchdowns: 1 },
    ]), { status: 200 })) as typeof fetch;
  try {
    const stats = await fetchPlayerSeasonStats("nfl", "9", 2019);
    assert.deepEqual(stats, [
      { team: "PHI", stats: { Receptions: 20, ReceivingYards: 240, ReceivingTouchdowns: 1 } },
      { team: "MIA", stats: { Receptions: 26, ReceivingYards: 310, ReceivingTouchdowns: 1 } },
    ]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});
