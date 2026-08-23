import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNflBracketData, classifyNflPostseasonStage, formatRecord, type NflBracketSeedInput, type NflBracketRealGame } from "./bracket";

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
