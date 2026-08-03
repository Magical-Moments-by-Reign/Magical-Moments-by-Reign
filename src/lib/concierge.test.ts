// Unit tests for the personal-concierge pure helpers (no database).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateConciergeName,
  conciergeDisplayName,
  needsWelcome,
  hasNamedConcierge,
  shouldNudgeForName,
  DEFAULT_CONCIERGE_NAME,
  CONCIERGE_NAME_MAX,
  type ConciergeState,
} from "./concierge.ts";

const NUL = String.fromCharCode(0);
const BELL = String.fromCharCode(7);

// ── validateConciergeName ──────────────────────────────────────
test("accepts a normal name and trims surrounding whitespace", () => {
  const r = validateConciergeName("  Journey  ");
  assert.deepEqual(r, { ok: true, value: "Journey" });
});

test("collapses internal whitespace", () => {
  const r = validateConciergeName("Fairy   God   Mother");
  assert.deepEqual(r, { ok: true, value: "Fairy God Mother" });
});

test("keeps letters, digits, apostrophes, hyphens and emoji", () => {
  assert.deepEqual(validateConciergeName("Grace-Anne"), { ok: true, value: "Grace-Anne" });
  assert.deepEqual(validateConciergeName("D'Artagnan"), { ok: true, value: "D'Artagnan" });
  assert.deepEqual(validateConciergeName("Nova 2"), { ok: true, value: "Nova 2" });
  assert.deepEqual(validateConciergeName("Sparkles ✨"), { ok: true, value: "Sparkles ✨" });
});

test("strips angle brackets so a name cannot carry markup", () => {
  const r = validateConciergeName("<b>Atlas</b>");
  assert.deepEqual(r, { ok: true, value: "bAtlas/b" });
});

test("strips control characters", () => {
  const r = validateConciergeName("Gra" + NUL + "ce" + BELL);
  assert.deepEqual(r, { ok: true, value: "Grace" });
});

test("rejects an empty or whitespace-only name", () => {
  assert.equal(validateConciergeName("").ok, false);
  assert.equal(validateConciergeName("     ").ok, false);
  assert.equal(validateConciergeName("<>").ok, false);
  assert.equal(validateConciergeName(NUL + BELL).ok, false);
});

test("rejects a name longer than the max", () => {
  const tooLong = "a".repeat(CONCIERGE_NAME_MAX + 1);
  assert.equal(validateConciergeName(tooLong).ok, false);
});

test("accepts a name exactly at the max length", () => {
  const exact = "a".repeat(CONCIERGE_NAME_MAX);
  assert.deepEqual(validateConciergeName(exact), { ok: true, value: exact });
});

// ── conciergeDisplayName ───────────────────────────────────────
test("display name is the chosen name when set", () => {
  assert.equal(conciergeDisplayName({ name: "Grace", welcomedAt: new Date() }), "Grace");
});

test("display name falls back to Magical when unnamed, skipped, or absent", () => {
  assert.equal(conciergeDisplayName(null), DEFAULT_CONCIERGE_NAME);
  assert.equal(conciergeDisplayName({ name: null, welcomedAt: new Date() }), DEFAULT_CONCIERGE_NAME);
  assert.equal(conciergeDisplayName({ name: "   ", welcomedAt: new Date() }), DEFAULT_CONCIERGE_NAME);
});

// ── lifecycle predicates ───────────────────────────────────────
const NEVER_MET: ConciergeState | null = null;
const SKIPPED: ConciergeState = { name: null, welcomedAt: new Date() };
const NAMED: ConciergeState = { name: "Journey", welcomedAt: new Date() };

test("needsWelcome only before the first introduction", () => {
  assert.equal(needsWelcome(NEVER_MET), true);
  assert.equal(needsWelcome(SKIPPED), false);
  assert.equal(needsWelcome(NAMED), false);
});

test("hasNamedConcierge only once a real name is chosen", () => {
  assert.equal(hasNamedConcierge(NEVER_MET), false);
  assert.equal(hasNamedConcierge(SKIPPED), false);
  assert.equal(hasNamedConcierge(NAMED), true);
});

test("gentle name nudge only for people who met their concierge but skipped naming", () => {
  assert.equal(shouldNudgeForName(NEVER_MET), false); // they'll get the full welcome instead
  assert.equal(shouldNudgeForName(SKIPPED), true);
  assert.equal(shouldNudgeForName(NAMED), false);
});
