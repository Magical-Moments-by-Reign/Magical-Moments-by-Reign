import { test } from "node:test";
import assert from "node:assert/strict";
import { careerStartYear, sumCareerTotals, type PlayerSeasonLine } from "./player-profile";

test("careerStartYear: a real draft year is authoritative — Mack Hollins entered the NFL in 2017", () => {
  assert.equal(careerStartYear({ draftYear: 2017 }, 2026), 2017);
});

test("careerStartYear: falls back to a real experience-season count when no draft year is known", () => {
  assert.equal(careerStartYear({ experienceYears: 5 }, 2026), 2022);
});

test("careerStartYear: draft year wins over experience count when both are present", () => {
  assert.equal(careerStartYear({ draftYear: 2017, experienceYears: 3 }, 2026), 2017);
});

test("careerStartYear: falls back to the generous MAX_SEASON_LOOKBACK bound when neither signal exists — never refuses to look", () => {
  assert.equal(careerStartYear({}, 2026), 2007);
});

test("careerStartYear: ignores a nonsensical/placeholder draft year", () => {
  assert.equal(careerStartYear({ draftYear: 0, experienceYears: 4 }, 2026), 2023);
});

test("sumCareerTotals: sums real additive fields across every season line, matching Mack Hollins' verified career totals", () => {
  const lines: PlayerSeasonLine[] = [
    { season: 2024, team: "Buffalo Bills", stats: { Games: 17, Receptions: 26, ReceivingYards: 299, ReceivingTouchdowns: 7 } },
    { season: 2025, team: "New England Patriots", stats: { Games: 15, Receptions: 46, ReceivingYards: 550, ReceivingTouchdowns: 2 } },
  ];
  assert.deepEqual(sumCareerTotals(lines), { Games: 32, Receptions: 72, ReceivingYards: 849, ReceivingTouchdowns: 9 });
});

test("sumCareerTotals: sums both real team-rows of a split season (mid-season trade) into career totals, not just one", () => {
  const lines: PlayerSeasonLine[] = [
    { season: 2019, team: "Philadelphia Eagles", stats: { Games: 8, Receptions: 20, ReceivingYards: 240, ReceivingTouchdowns: 1 } },
    { season: 2019, team: "Miami Dolphins", stats: { Games: 8, Receptions: 26, ReceivingYards: 310, ReceivingTouchdowns: 1 } },
  ];
  assert.deepEqual(sumCareerTotals(lines), { Games: 16, Receptions: 46, ReceivingYards: 550, ReceivingTouchdowns: 2 });
});

test("sumCareerTotals: excludes rate/percentage fields rather than publishing a misleading sum", () => {
  const lines: PlayerSeasonLine[] = [
    { season: 2024, stats: { Receptions: 26, ReceivingYardsPerReception: 11.5 } },
    { season: 2025, stats: { Receptions: 46, ReceivingYardsPerReception: 12.0 } },
  ];
  const totals = sumCareerTotals(lines);
  assert.equal(totals?.Receptions, 72);
  assert.equal("ReceivingYardsPerReception" in (totals ?? {}), false);
});

test("sumCareerTotals: returns undefined for an empty career (no real season lines)", () => {
  assert.equal(sumCareerTotals([]), undefined);
});
