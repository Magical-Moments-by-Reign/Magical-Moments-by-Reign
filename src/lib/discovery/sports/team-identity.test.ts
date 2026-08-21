import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSdioTeamId, getSdioTeamDirectory } from "./team-identity";

function mockStandings(rows: { Name: string; TeamID: number; Key: string; Wins?: number; Losses?: number }[]) {
  return (async () =>
    new Response(JSON.stringify(rows.map((r) => ({ Name: r.Name, TeamID: r.TeamID, Key: r.Key, Wins: r.Wins ?? 0, Losses: r.Losses ?? 0 }))), { status: 200 })) as typeof fetch;
}

const NBA_STANDINGS = [
  { Name: "Boston Celtics", TeamID: 2, Key: "BOS" },
  { Name: "Chicago Bulls", TeamID: 5, Key: "CHI" },
  { Name: "Los Angeles Lakers", TeamID: 14, Key: "LAL" },
];
const NFL_STANDINGS = [{ Name: "New England Patriots", TeamID: 21, Key: "NE" }];

test("resolveSdioTeamId: Boston Celtics resolves to its real TeamID, not by comparing the full name to the team code", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NBA_STANDINGS);
  try {
    assert.equal(await resolveSdioTeamId("nba", "Boston Celtics"), "2");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("resolveSdioTeamId: Chicago Bulls resolves to its real TeamID (real CHI code)", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NBA_STANDINGS);
  try {
    assert.equal(await resolveSdioTeamId("nba", "Chicago Bulls"), "5");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("resolveSdioTeamId: Los Angeles Lakers resolves to its real TeamID", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NBA_STANDINGS);
  try {
    assert.equal(await resolveSdioTeamId("nba", "Los Angeles Lakers"), "14");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("resolveSdioTeamId: New England Patriots resolves to its real TeamID (real NE code)", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NFL_STANDINGS);
  try {
    assert.equal(await resolveSdioTeamId("nfl", "New England Patriots"), "21");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("resolveSdioTeamId: a real team code (e.g. 'BOS') also resolves via the verified secondary key match", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NBA_STANDINGS);
  try {
    assert.equal(await resolveSdioTeamId("nba", "BOS"), "2");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("resolveSdioTeamId: a team from a different league's directory can never leak in — it simply isn't in the list", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NBA_STANDINGS); // no Patriots here
  try {
    assert.equal(await resolveSdioTeamId("nba", "New England Patriots"), null);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("resolveSdioTeamId: returns null when unconfigured or the provider has nothing", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    assert.equal(await resolveSdioTeamId("nba", "Boston Celtics"), null);
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getSdioTeamDirectory: returns every real team's TeamID/Key/full name from Standings", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = mockStandings(NBA_STANDINGS);
  try {
    const directory = await getSdioTeamDirectory("nba");
    assert.deepEqual(directory, [
      { teamId: "2", key: "BOS", fullName: "Boston Celtics" },
      { teamId: "5", key: "CHI", fullName: "Chicago Bulls" },
      { teamId: "14", key: "LAL", fullName: "Los Angeles Lakers" },
    ]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});
