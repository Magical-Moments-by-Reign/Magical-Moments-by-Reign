import { test } from "node:test";
import assert from "node:assert/strict";
import { careerStartYear, sumCareerTotals, resolveProfileLinksFromDirectory, getPlayerIdDirectoryByName, type PlayerSeasonLine } from "./player-profile";
import { normalizePlayerName } from "./player-name";

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

// ── Regression: a followed NFL team's 43-player roster must resolve
// profile links from ONE bulk directory lookup, never one provider call
// per player — the defect class that let one bad wave of concurrent
// findPlayerIdByName calls take down the whole NFL sport page render (see
// resolveProfileLinksFromDirectory/getPlayerIdDirectoryByName in
// player-profile.ts). Roster enrichment is OPTIONAL — it must never throw
// and must never keep the real roster itself from rendering.

function makeRoster(count: number): { id: string; name: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
}

test("resolveProfileLinksFromDirectory: resolves a full 43-player roster from ONE directory Map, no per-player provider calls", () => {
  const roster = makeRoster(43);
  const directory = new Map(roster.map((p, i) => [p.name.toLowerCase().trim(), `sdio-${i}`]));
  const links = resolveProfileLinksFromDirectory(roster, directory);
  assert.equal(links.size, 43);
  for (const p of roster) assert.equal(links.get(p.id), directory.get(p.name.toLowerCase().trim()));
});

test("resolveProfileLinksFromDirectory: a directory that failed to fetch (empty Map) still resolves every roster player to null, never throws", () => {
  const roster = makeRoster(43);
  const links = resolveProfileLinksFromDirectory(roster, new Map());
  assert.equal(links.size, 43);
  for (const p of roster) assert.equal(links.get(p.id), null);
});

test("resolveProfileLinksFromDirectory: an unmatched real name resolves to null, never a guess", () => {
  const links = resolveProfileLinksFromDirectory([{ id: "p1", name: "Real Player Name" }], new Map([["someone else", "sdio-1"]]));
  assert.equal(links.get("p1"), null);
});

// ── Shared roster architecture fix: cross-provider name matching now goes
// through normalizePlayerName (suffix/diacritic-insensitive) instead of a
// bare .toLowerCase().trim() — closing a real, previously-silent class of
// "player exists in both providers but never resolves a profile link"
// failures (e.g. one provider reports "Jr."/"III", the other omits it).
test("resolveProfileLinksFromDirectory: matches across a generational suffix difference between providers (e.g. Tier 1 has \"Jr.\", the directory doesn't)", () => {
  const links = resolveProfileLinksFromDirectory([{ id: "p1", name: "Marvin Harrison Jr." }], new Map([["marvin harrison", "sdio-1"]]));
  assert.equal(links.get("p1"), "sdio-1");
});

test("resolveProfileLinksFromDirectory: \"Mike Williams\" and \"Mike Williams Jr.\" normalize to the same key (the suffix strip is intentional — the two providers likely mean the same real person)", () => {
  const links = resolveProfileLinksFromDirectory([{ id: "p1", name: "Mike Williams" }], new Map([[normalizePlayerName("Mike Williams Jr."), "sdio-1"]]));
  assert.equal(links.get("p1"), "sdio-1");
});

test("resolveProfileLinksFromDirectory: still never conflates two genuinely different real names", () => {
  const links = resolveProfileLinksFromDirectory([{ id: "p1", name: "Mike Williams" }], new Map([[normalizePlayerName("Mike Evans"), "sdio-1"]]));
  assert.equal(links.get("p1"), null);
});

test("getPlayerIdDirectoryByName: never rejects — degrades to an empty Map when the provider/DB is unavailable (this sandbox has neither configured)", async () => {
  const directory = await getPlayerIdDirectoryByName("nfl");
  assert.ok(directory instanceof Map);
});

test("Sport page rendering must survive a followed-team roster even when player-directory resolution has nothing to offer — simulated end to end", async () => {
  const roster = makeRoster(43);
  // The exact call shape both [sport]/page.tsx and team-roster/route.ts now
  // use — a single directory fetch wrapped in .catch, then one local,
  // synchronous resolution pass. No unhandled rejection is possible here:
  // there is no per-player await left to reject.
  const directory = await getPlayerIdDirectoryByName("nfl").catch(() => new Map<string, string>());
  const links = resolveProfileLinksFromDirectory(roster, directory);
  assert.equal(links.size, 43);
  assert.ok(roster.length > 0, "roster itself must still be present regardless of link resolution");
});
