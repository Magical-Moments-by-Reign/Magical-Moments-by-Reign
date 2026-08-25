import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlayerName } from "./player-name";

test("normalizePlayerName: identical names normalize identically", () => {
  assert.equal(normalizePlayerName("Josh Allen"), normalizePlayerName("Josh Allen"));
});

test("normalizePlayerName: case-insensitive", () => {
  assert.equal(normalizePlayerName("JOSH ALLEN"), normalizePlayerName("josh allen"));
});

test("normalizePlayerName: strips a trailing generational suffix (Jr./Sr./II/III/IV/V)", () => {
  assert.equal(normalizePlayerName("Marvin Harrison Jr."), normalizePlayerName("Marvin Harrison"));
  assert.equal(normalizePlayerName("Robert Griffin III"), normalizePlayerName("Robert Griffin"));
  assert.equal(normalizePlayerName("Odell Beckham Jr"), normalizePlayerName("Odell Beckham"));
});

test("normalizePlayerName: strips diacritics so accented and plain spellings match", () => {
  assert.equal(normalizePlayerName("José Álvarez"), normalizePlayerName("Jose Alvarez"));
});

test("normalizePlayerName: strips punctuation (periods, apostrophes)", () => {
  assert.equal(normalizePlayerName("D.K. Metcalf"), normalizePlayerName("DK Metcalf"));
  assert.equal(normalizePlayerName("O'Neal"), normalizePlayerName("ONeal"));
});

test("normalizePlayerName: collapses internal whitespace differences", () => {
  assert.equal(normalizePlayerName("Josh   Allen"), normalizePlayerName("Josh Allen"));
});

test("normalizePlayerName: never conflates two genuinely different names", () => {
  assert.notEqual(normalizePlayerName("Josh Allen"), normalizePlayerName("John Allen"));
  assert.notEqual(normalizePlayerName("Mike Williams"), normalizePlayerName("Mike Evans"));
});
