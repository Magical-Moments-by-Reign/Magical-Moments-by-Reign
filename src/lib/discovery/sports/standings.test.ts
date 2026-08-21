import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStandingsBySport } from "./standings";
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
