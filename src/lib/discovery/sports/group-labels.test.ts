import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGroupLabel, groupCollectiveNoun } from "./group-labels";

test("formatGroupLabel: recognized major college conferences get their short/common name", () => {
  assert.equal(formatGroupLabel("Southeastern Conference"), "SEC");
  assert.equal(formatGroupLabel("Atlantic Coast Conference"), "ACC");
  assert.equal(formatGroupLabel("American Athletic Conference"), "AAC");
  assert.equal(formatGroupLabel("Conference USA"), "C-USA");
  assert.equal(formatGroupLabel("Mid-American Conference"), "MAC");
  assert.equal(formatGroupLabel("Big Ten Conference"), "Big Ten");
  assert.equal(formatGroupLabel("Big 12 Conference"), "Big 12");
  assert.equal(formatGroupLabel("Mountain West Conference"), "Mountain West");
  assert.equal(formatGroupLabel("Pac-12 Conference"), "Pac-12");
  assert.equal(formatGroupLabel("Sun Belt Conference"), "Sun Belt");
});

test("formatGroupLabel: matches case-insensitively but requires the full real label, never a substring", () => {
  assert.equal(formatGroupLabel("southeastern conference"), "SEC");
  assert.equal(formatGroupLabel("SOUTHEASTERN CONFERENCE"), "SEC");
  // A conference this map doesn't recognize falls through to plain
  // title-casing rather than being guessed at.
  assert.equal(formatGroupLabel("Ivy League"), "Ivy League");
});

test("formatGroupLabel: existing casing overrides and known abbreviations are unchanged", () => {
  assert.equal(formatGroupLabel("east"), "Eastern Conference");
  assert.equal(formatGroupLabel("west"), "Western Conference");
  assert.equal(formatGroupLabel("afc"), "AFC");
  assert.equal(formatGroupLabel("nfc"), "NFC");
  assert.equal(formatGroupLabel("al"), "AL");
  assert.equal(formatGroupLabel("nl"), "NL");
  assert.equal(formatGroupLabel("american league"), "American League");
  assert.equal(formatGroupLabel("national league"), "National League");
});

test("groupCollectiveNoun: real conference labels resolve to Conferences", () => {
  assert.equal(groupCollectiveNoun(["Southeastern Conference", "Atlantic Coast Conference", "Big Ten Conference"]), "Conferences");
});

test("groupCollectiveNoun: real league labels resolve to Leagues, never called Conferences", () => {
  assert.equal(groupCollectiveNoun(["American League", "National League"]), "Leagues");
});

test("groupCollectiveNoun: real division labels resolve to Divisions", () => {
  assert.equal(groupCollectiveNoun(["Atlantic Division", "Central Division"]), "Divisions");
});

test("groupCollectiveNoun: labels with no recognizable category word fall back to the honest neutral term", () => {
  assert.equal(groupCollectiveNoun(["east", "west"]), "Groups");
});
