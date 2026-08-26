import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNflBracketData, classifyNflPostseasonStage, formatRecord, buildCfpBracketData, classifyCfpPostseasonStage, buildMarchMadnessBracketData, classifyMarchMadnessPostseasonStage, type NflBracketSeedInput, type NflBracketRealGame, type BracketRealGame } from "./bracket";

function seed(seed: number, teamId: string, wins: number, losses: number, clinched = true): NflBracketSeedInput {
  return { teamId, teamName: `Team ${teamId}`, seed, wins, losses, isDivisionWinner: seed <= 4, clinched };
}

const afcSeeds: NflBracketSeedInput[] = [1, 2, 3, 4, 5, 6, 7].map((n) => seed(n, `afc-${n}`, 14 - n, n));
const nfcSeeds: NflBracketSeedInput[] = [1, 2, 3, 4, 5, 6, 7].map((n) => seed(n, `nfc-${n}`, 14 - n, n));

test("formatRecord includes ties only when present", () => {
  assert.equal(formatRecord(11, 3), "11-3");
  assert.equal(formatRecord(11, 3, 1), "11-3-1");
});

test("classifyNflPostseasonStage recognizes every real round, case/spacing-insensitive", () => {
  assert.equal(classifyNflPostseasonStage("Wild Card"), "wildcard");
  assert.equal(classifyNflPostseasonStage("wildcard round"), "wildcard");
  assert.equal(classifyNflPostseasonStage("Divisional Round"), "divisional");
  assert.equal(classifyNflPostseasonStage("AFC Championship"), "conference");
  assert.equal(classifyNflPostseasonStage("Conference Championship"), "conference");
  assert.equal(classifyNflPostseasonStage("Super Bowl"), "superbowl");
  assert.equal(classifyNflPostseasonStage("Regular Season"), "unknown");
});

test("projected mode builds the real 2v7/3v6/4v5 Wild Card pairing with the #1 seed on a bye, and never fabricates later rounds", () => {
  const data = buildNflBracketData({ seasonLabel: "2026", mode: "projected", afcSeeds, nfcSeeds, postseasonGames: [] });
  const wildcard = data.rounds.find((r) => r.id === "wildcard")!;
  const afcRows = wildcard.matchups.filter((m) => m.confLabel === "AFC");
  assert.equal(afcRows.length, 4); // bye + 3 matchups
  const bye = afcRows.find((m) => m.isBye)!;
  assert.equal(bye.top.team?.teamId, "afc-1");
  assert.equal(bye.bottom.team, null);

  const pairSeeds = (m: (typeof afcRows)[number]) => [m.top.team?.seed, m.bottom.team?.seed].sort();
  const matchupSeedPairs = afcRows.filter((m) => !m.isBye).map(pairSeeds);
  assert.deepEqual(matchupSeedPairs.sort(), [[2, 7], [3, 6], [4, 5]]);

  // Higher seed hosts (real NFL rule) — the home slot (bottom) is always the lower seed number.
  for (const m of afcRows.filter((mm) => !mm.isBye)) {
    assert.ok((m.bottom.team!.seed as number) < (m.top.team!.seed as number));
  }

  // Every later round is TBD/placeholder-only — never a guessed winner.
  const divisional = data.rounds.find((r) => r.id === "divisional")!;
  for (const m of divisional.matchups) {
    if (m.top.team) assert.equal(m.top.team.seed, 1); // only the real, known #1 seed may appear
    else assert.ok(m.top.placeholderLabel);
    if (!m.bottom.team) assert.ok(m.bottom.placeholderLabel);
  }
  const superBowl = data.rounds.find((r) => r.id === "superbowl")!;
  assert.equal(superBowl.matchups[0].top.team, null);
  assert.equal(superBowl.matchups[0].top.placeholderLabel, "AFC Champion");
  assert.equal(superBowl.matchups[0].bottom.placeholderLabel, "NFC Champion");
});

test("projected mode badges every non-clinched seed 'projected', never presenting a tiebreaker as certain", () => {
  const uncertainSeeds = afcSeeds.map((s, i) => ({ ...s, clinched: i === 0 })); // only the #1 seed clinched
  const data = buildNflBracketData({ seasonLabel: "2026", mode: "projected", afcSeeds: uncertainSeeds, nfcSeeds, postseasonGames: [] });
  const wildcard = data.rounds.find((r) => r.id === "wildcard")!;
  const bye = wildcard.matchups.find((m) => m.confLabel === "AFC" && m.isBye)!;
  assert.equal(bye.top.team?.badge, "clinched");
  const twoSeedRow = wildcard.matchups.find((m) => m.confLabel === "AFC" && !m.isBye && (m.top.team?.seed === 7 || m.bottom.team?.seed === 2))!;
  const twoSeedSlot = twoSeedRow.bottom.team?.seed === 2 ? twoSeedRow.bottom : twoSeedRow.top;
  assert.equal(twoSeedSlot.team?.badge, "projected");
});

test("official mode with a real Wild Card schedule uses the real pairing verbatim, not the projected 2v7/3v6/4v5 guess", () => {
  const realGame: NflBracketRealGame = {
    externalId: "g1",
    gameId: "local-1",
    stage: "Wild Card",
    status: "final",
    startsAt: "2026-01-10T18:00:00Z",
    homeTeam: { id: "afc-3", name: "Team afc-3" }, // a real, non-projected pairing (3 vs 4, not the projected 3v6)
    awayTeam: { id: "afc-4", name: "Team afc-4" },
    homeScore: 24,
    awayScore: 20,
  };
  const data = buildNflBracketData({ seasonLabel: "2026", mode: "official", afcSeeds, nfcSeeds, postseasonGames: [realGame] });
  const wildcard = data.rounds.find((r) => r.id === "wildcard")!;
  const afcMatchups = wildcard.matchups.filter((m) => m.confLabel === "AFC" && !m.isBye);
  assert.equal(afcMatchups.length, 1);
  assert.equal(afcMatchups[0].bottom.team?.teamId, "afc-3");
  assert.equal(afcMatchups[0].top.team?.teamId, "afc-4");
  assert.equal(afcMatchups[0].status, "final");
  assert.equal(afcMatchups[0].bottomScore, 24);
  assert.equal(afcMatchups[0].gameId, "local-1");
  // Official mode: no "projected"/"clinched" caveat on a real seed anymore.
  assert.equal(afcMatchups[0].top.team?.badge, null);
});

test("a game with an unrecognized stage is never silently mis-bucketed into a round", () => {
  const mystery: NflBracketRealGame = {
    externalId: "g2", gameId: null, stage: "Regular Season", status: "final", startsAt: "2026-01-01T00:00:00Z",
    homeTeam: { id: "afc-1", name: "Team afc-1" }, awayTeam: { id: "afc-2", name: "Team afc-2" }, homeScore: 30, awayScore: 10,
  };
  const data = buildNflBracketData({ seasonLabel: "2026", mode: "official", afcSeeds, nfcSeeds, postseasonGames: [mystery] });
  const wildcard = data.rounds.find((r) => r.id === "wildcard")!;
  // Falls back to the projected pairing structure since no real Wild Card game was recognized.
  assert.equal(wildcard.matchups.filter((m) => m.confLabel === "AFC" && !m.isBye).length, 3);
});

// ── CFP (College Football Playoff) ──────────────────────────────────────
// No seed-based projection exists for this bracket at all (see
// buildCfpBracketData's own doc comment) — every test here works from real
// games only, confirming rounds map correctly and nothing is ever
// fabricated before real games exist.

function cfpGame(stage: string, homeId: string, awayId: string, startsAt: string, opts: Partial<BracketRealGame> = {}): BracketRealGame {
  return {
    externalId: `${homeId}-${awayId}`,
    gameId: null,
    stage,
    status: "scheduled",
    startsAt,
    homeTeam: { id: homeId, name: `Team ${homeId}` },
    awayTeam: { id: awayId, name: `Team ${awayId}` },
    ...opts,
  };
}

test("classifyCfpPostseasonStage recognizes every real CFP round, case/spacing-insensitive", () => {
  assert.equal(classifyCfpPostseasonStage("First Round"), "firstround");
  assert.equal(classifyCfpPostseasonStage("first round"), "firstround");
  assert.equal(classifyCfpPostseasonStage("Quarterfinal"), "quarterfinal");
  assert.equal(classifyCfpPostseasonStage("CFP Quarterfinal"), "quarterfinal");
  assert.equal(classifyCfpPostseasonStage("Semifinal"), "semifinal");
  assert.equal(classifyCfpPostseasonStage("National Championship"), "championship");
  assert.equal(classifyCfpPostseasonStage("Regular Season"), "unknown");
});

test("buildCfpBracketData: real postseason games map to the correct round, and never touch a round they don't belong to", () => {
  const games: BracketRealGame[] = [
    cfpGame("First Round", "team-5", "team-12", "2025-12-19T00:00:00Z"),
    cfpGame("First Round", "team-6", "team-11", "2025-12-19T20:00:00Z"),
    cfpGame("Quarterfinal — Sugar Bowl", "team-1", "team-8", "2025-12-31T00:00:00Z"),
  ];
  const data = buildCfpBracketData({ seasonLabel: "2025", postseasonGames: games });
  const firstRound = data.rounds.find((r) => r.id === "firstround")!;
  const quarterfinal = data.rounds.find((r) => r.id === "quarterfinal")!;
  const semifinal = data.rounds.find((r) => r.id === "semifinal")!;
  const championship = data.rounds.find((r) => r.id === "championship")!;
  assert.equal(firstRound.matchups.length, 2);
  assert.equal(quarterfinal.matchups.length, 1);
  assert.equal(semifinal.matchups.length, 0); // no real semifinal game yet — empty, not guessed
  assert.equal(championship.matchups.length, 0);
  assert.equal(quarterfinal.matchups[0].top.team?.teamId, "team-8");
  assert.equal(quarterfinal.matchups[0].bottom.team?.teamId, "team-1");
  // No seed data exists for this bracket — never a fabricated seed number or badge.
  assert.equal(quarterfinal.matchups[0].top.team?.seed, undefined);
  assert.equal(quarterfinal.matchups[0].top.team?.badge, null);
  assert.equal(data.mode, "official");
});

test("buildCfpBracketData: with zero real games, every round is honestly empty — never a placeholder/projected field", () => {
  const data = buildCfpBracketData({ seasonLabel: "2025", postseasonGames: [] });
  for (const round of data.rounds) assert.equal(round.matchups.length, 0);
});

test("buildCfpBracketData: the bracket advances as results arrive — a final score and real game id flow through untouched", () => {
  const game = cfpGame("National Championship", "team-1", "team-3", "2026-01-19T00:00:00Z", {
    gameId: "local-cfp-nc",
    status: "final",
    homeScore: 27,
    awayScore: 24,
  });
  const data = buildCfpBracketData({ seasonLabel: "2025", postseasonGames: [game] });
  const championship = data.rounds.find((r) => r.id === "championship")!;
  assert.equal(championship.matchups.length, 1);
  assert.equal(championship.matchups[0].status, "final");
  assert.equal(championship.matchups[0].bottomScore, 27);
  assert.equal(championship.matchups[0].topScore, 24);
  assert.equal(championship.matchups[0].gameId, "local-cfp-nc");
});

// ── NCAA Tournament ("March Madness") ───────────────────────────────────

function mmGame(stage: string, homeId: string, awayId: string, startsAt: string, opts: Partial<BracketRealGame> = {}): BracketRealGame {
  return cfpGame(stage, homeId, awayId, startsAt, opts);
}

test("classifyMarchMadnessPostseasonStage recognizes every real NCAA Tournament round, case/spacing-insensitive", () => {
  assert.equal(classifyMarchMadnessPostseasonStage("First Four"), "firstfour");
  assert.equal(classifyMarchMadnessPostseasonStage("First Round"), "firstround");
  assert.equal(classifyMarchMadnessPostseasonStage("Second Round"), "secondround");
  assert.equal(classifyMarchMadnessPostseasonStage("Sweet 16"), "sweet16");
  assert.equal(classifyMarchMadnessPostseasonStage("sweet sixteen"), "sweet16");
  assert.equal(classifyMarchMadnessPostseasonStage("Elite Eight"), "eliteeight");
  assert.equal(classifyMarchMadnessPostseasonStage("Elite 8"), "eliteeight");
  assert.equal(classifyMarchMadnessPostseasonStage("Final Four"), "finalfour");
  assert.equal(classifyMarchMadnessPostseasonStage("National Championship"), "championship");
  assert.equal(classifyMarchMadnessPostseasonStage("Regular Season"), "unknown");
});

test("classifyMarchMadnessPostseasonStage never confuses First Four with First Round, or Final Four with the Finals/Championship", () => {
  assert.equal(classifyMarchMadnessPostseasonStage("First Four"), "firstfour");
  assert.notEqual(classifyMarchMadnessPostseasonStage("First Four"), "firstround");
  assert.equal(classifyMarchMadnessPostseasonStage("Final Four"), "finalfour");
  assert.notEqual(classifyMarchMadnessPostseasonStage("Final Four"), "championship");
});

test("buildMarchMadnessBracketData: every real round is recognized and correctly bucketed", () => {
  const games: BracketRealGame[] = [
    mmGame("First Four", "t-a", "t-b", "2026-03-17T00:00:00Z"),
    mmGame("First Round", "t-1", "t-16", "2026-03-19T00:00:00Z"),
    mmGame("Second Round", "t-1", "t-9", "2026-03-21T00:00:00Z"),
    mmGame("Sweet 16", "t-1", "t-5", "2026-03-26T00:00:00Z"),
    mmGame("Elite Eight", "t-1", "t-2", "2026-03-28T00:00:00Z"),
    mmGame("Final Four", "t-1", "t-3", "2026-04-04T00:00:00Z"),
    mmGame("National Championship", "t-1", "t-4", "2026-04-06T00:00:00Z"),
  ];
  const data = buildMarchMadnessBracketData({ seasonLabel: "2026", postseasonGames: games });
  const byId = new Map(data.rounds.map((r) => [r.id, r]));
  assert.equal(byId.get("firstfour")!.matchups.length, 1);
  assert.equal(byId.get("firstround")!.matchups.length, 1);
  assert.equal(byId.get("secondround")!.matchups.length, 1);
  assert.equal(byId.get("sweet16")!.matchups.length, 1);
  assert.equal(byId.get("eliteeight")!.matchups.length, 1);
  assert.equal(byId.get("finalfour")!.matchups.length, 1);
  assert.equal(byId.get("championship")!.matchups.length, 1);
  assert.equal(data.mode, "official");
});

test("buildMarchMadnessBracketData: with zero real games, every round is honestly empty — never a derived-from-standings field", () => {
  const data = buildMarchMadnessBracketData({ seasonLabel: "2026", postseasonGames: [] });
  for (const round of data.rounds) assert.equal(round.matchups.length, 0);
  assert.equal(data.rounds.length, 7);
});

test("buildMarchMadnessBracketData: a game with an unrecognized stage is never silently mis-bucketed into a round", () => {
  const mystery = mmGame("Regular Season", "t-1", "t-2", "2026-01-01T00:00:00Z");
  const data = buildMarchMadnessBracketData({ seasonLabel: "2026", postseasonGames: [mystery] });
  for (const round of data.rounds) assert.equal(round.matchups.length, 0);
});
