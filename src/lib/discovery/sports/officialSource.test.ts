import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOfficialDate, getKnownDateFact, type SourceAttempt } from "./officialSource";

test("getKnownDateFact returns the confirmed NBA dates and null for an unconfigured sport/kind", () => {
  assert.equal(getKnownDateFact("nba", "preseason_opener_date")?.dateOnly, "2026-10-03");
  assert.equal(getKnownDateFact("nba", "regular_season_opener_date")?.dateOnly, "2026-10-20");
  assert.equal(getKnownDateFact("mlb", "preseason_opener_date"), null);
});

test("resolveOfficialDate falls through to the known-fact tier and logs both attempts", async () => {
  const log: SourceAttempt[] = [];
  const date = await resolveOfficialDate("nba", "preseason_opener_date", log);
  assert.equal(date, "2026-10-03");
  assert.deepEqual(log, [
    { tier: "official-feed", outcome: "unconfigured" },
    { tier: "known-fact", outcome: "hit" },
  ]);
});

test("resolveOfficialDate returns null and logs empty when no tier has the fact", async () => {
  const log: SourceAttempt[] = [];
  const date = await resolveOfficialDate("mlb", "preseason_opener_date", log);
  assert.equal(date, null);
  assert.deepEqual(log, [
    { tier: "official-feed", outcome: "unconfigured" },
    { tier: "known-fact", outcome: "empty" },
  ]);
});
