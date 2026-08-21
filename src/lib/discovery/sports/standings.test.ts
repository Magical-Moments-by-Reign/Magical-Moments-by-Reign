import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStandingsBySport, determineSeasonPhase, formatSeasonLabel } from "./standings";
import type { SportsStanding } from "../providers/sports";

function team(id: string, name: string): SportsStanding["team"] {
  return { id, name };
}

test("returns [] for empty input", () => {
  assert.deepEqual(normalizeStandingsBySport("nba", []), []);
});

test("NBA groups by conference only (no division split), ranked by real win%", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Nets"), wins: 20, losses: 62, group: "east" },
    { team: team("2", "Pistons"), wins: 60, losses: 22, group: "east" },
    { team: team("3", "Celtics"), wins: 56, losses: 26, group: "east" },
    { team: team("4", "Lakers"), wins: 50, losses: 32, group: "west" },
  ];
  const groups = normalizeStandingsBySport("nba", rows);
  assert.equal(groups.length, 2);
  const east = groups.find((g) => g.label === "east")!;
  assert.equal(east.divisions.length, 1);
  assert.equal(east.divisions[0].label, "");
  assert.deepEqual(east.divisions[0].rows.map((r) => r.team.name), ["Pistons", "Celtics", "Nets"]);
  assert.equal(east.divisions[0].rows[0].displayRank, 1);
  assert.equal(east.divisions[0].rows[0].gb, 0);
  assert.equal(east.divisions[0].rows[2].gb, 40); // Nets vs. Pistons leader: ((60-20)+(62-22))/2 = 40
});

test("MLB derives American/National League from division prefix and splits by division", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Yankees"), wins: 95, losses: 67, division: "AL East" },
    { team: team("2", "Red Sox"), wins: 80, losses: 82, division: "AL East" },
    { team: team("3", "Astros"), wins: 90, losses: 72, division: "AL West" },
    { team: team("4", "Dodgers"), wins: 100, losses: 62, division: "NL West" },
  ];
  const groups = normalizeStandingsBySport("mlb", rows);
  const al = groups.find((g) => g.label === "American League")!;
  const nl = groups.find((g) => g.label === "National League")!;
  assert.ok(al && nl);
  assert.equal(al.divisions.length, 2);
  const alEast = al.divisions.find((d) => d.label === "AL East")!;
  assert.deepEqual(alEast.rows.map((r) => r.team.name), ["Yankees", "Red Sox"]);
  assert.equal(alEast.rows[0].displayRank, 1);
  assert.equal(nl.divisions[0].rows[0].team.name, "Dodgers");
});

test("NFL groups two levels deep when both conference and division are present", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Bills"), wins: 11, losses: 6, group: "AFC", division: "AFC East" },
    { team: team("2", "Dolphins"), wins: 8, losses: 9, group: "AFC", division: "AFC East" },
    { team: team("3", "Chiefs"), wins: 12, losses: 5, group: "AFC", division: "AFC West" },
  ];
  const groups = normalizeStandingsBySport("nfl", rows);
  const afc = groups.find((g) => g.label === "AFC")!;
  assert.equal(afc.divisions.length, 2);
  assert.ok(afc.divisions.some((d) => d.label === "AFC East"));
  assert.ok(afc.divisions.some((d) => d.label === "AFC West"));
});

test("ungrouped win-loss sport (e.g. WNBA with no conference data) still ranks by real win%", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Sky"), wins: 10, losses: 20 },
    { team: team("2", "Aces"), wins: 25, losses: 5 },
  ];
  const groups = normalizeStandingsBySport("wnba", rows);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "");
  assert.deepEqual(groups[0].divisions[0].rows.map((r) => r.team.name), ["Aces", "Sky"]);
});

test("points-based sport (soccer) is left in provider order/rank, never re-sorted by win%", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Team A"), wins: 5, losses: 10, rank: 1 },
    { team: team("2", "Team B"), wins: 20, losses: 2, rank: 2 },
  ];
  const groups = normalizeStandingsBySport("soccer", rows);
  assert.deepEqual(groups[0].divisions[0].rows.map((r) => r.team.name), ["Team A", "Team B"]);
  assert.equal(groups[0].divisions[0].rows[0].displayRank, 1);
  assert.equal(groups[0].divisions[0].rows[0].gb, null);
});

test("NHL with real points data ranks by points (2/1/0), not win% — a team with more OT losses ranks correctly above a team with fewer points despite an equal or higher win%", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Team A"), wins: 40, losses: 30, points: 90, group: "Atlantic" }, // more wins, fewer real points
    { team: team("2", "Team B"), wins: 38, losses: 28, points: 92, group: "Atlantic" }, // fewer wins, more real points (more OT losses)
  ];
  const groups = normalizeStandingsBySport("nhl", rows);
  const rowsOut = groups[0].divisions[0].rows;
  assert.deepEqual(rowsOut.map((r) => r.team.name), ["Team B", "Team A"]);
  assert.equal(rowsOut[0].gb, null); // points tables don't compute a win-loss games-behind
});

test("NHL with no points data on the response falls back to win%-based ranking rather than a flat 0-way tie", () => {
  const rows: SportsStanding[] = [
    { team: team("1", "Team A"), wins: 20, losses: 40 },
    { team: team("2", "Team B"), wins: 45, losses: 15 },
  ];
  const groups = normalizeStandingsBySport("nhl", rows);
  assert.deepEqual(groups[0].divisions[0].rows.map((r) => r.team.name), ["Team B", "Team A"]);
});

test("soccer standings carry real points through to the ranked row when the provider returns one", () => {
  const rows: SportsStanding[] = [{ team: team("1", "Team A"), wins: 10, losses: 2, ties: 3, points: 33, rank: 1 }];
  const groups = normalizeStandingsBySport("soccer", rows);
  assert.equal(groups[0].divisions[0].rows[0].points, 33);
});

test("determineSeasonPhase: before this season's schedule exists at all -> preseason (last completed season is what's shown)", () => {
  const now = +new Date("2026-08-21");
  assert.equal(determineSeasonPhase({ now }), "preseason");
});

test("determineSeasonPhase: preseason opener has passed, regular season hasn't -> preseason", () => {
  const now = +new Date("2026-10-10");
  assert.equal(determineSeasonPhase({ now, preseasonGameStartsAt: "2026-10-03T00:00:00Z", regularGameStartsAt: "2026-10-21T00:00:00Z" }), "preseason");
});

test("determineSeasonPhase: regular season opener has passed, postseason hasn't -> regular", () => {
  const now = +new Date("2026-11-01");
  assert.equal(determineSeasonPhase({ now, preseasonGameStartsAt: "2026-10-03T00:00:00Z", regularGameStartsAt: "2026-10-21T00:00:00Z" }), "regular");
});

test("determineSeasonPhase: postseason opener has passed -> postseason", () => {
  const now = +new Date("2027-05-01");
  assert.equal(determineSeasonPhase({ now, regularGameStartsAt: "2026-10-21T00:00:00Z", postseasonGameStartsAt: "2027-04-15T00:00:00Z" }), "postseason");
});

test("formatSeasonLabel: split-season string formats as en-dash short year, phase drives Final vs in-progress wording", () => {
  assert.equal(formatSeasonLabel("2025-2026", "preseason"), "2025–26 Final Regular Season Standings");
  assert.equal(formatSeasonLabel("2025-2026", "regular"), "2025–26 Regular Season Standings");
  assert.equal(formatSeasonLabel("2025-2026", "postseason"), "2025–26 Final Regular Season Standings");
});

test("formatSeasonLabel: plain single-year season (NFL/MLB-style) is left as-is; null with no season", () => {
  assert.equal(formatSeasonLabel("2026", "regular"), "2026 Regular Season Standings");
  assert.equal(formatSeasonLabel(undefined, "regular"), null);
});
