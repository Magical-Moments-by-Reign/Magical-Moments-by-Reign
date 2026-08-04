import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_KINDS, kindMeta, isVaultVisibility, releaseState, isDueForRelease,
  canAccessVault, parseRecipients, validateItem,
} from "./legacy-vault.ts";

const T0 = new Date("2026-08-04T00:00:00Z");

test("kind taxonomy is complete and resolvable", () => {
  assert.ok(LEGACY_KINDS.length >= 9);
  assert.equal(kindMeta("letter")?.label, "Letter");
  assert.equal(kindMeta("nope"), undefined);
});

test("visibility guard", () => {
  for (const v of ["private", "scheduled", "milestone", "shared"]) assert.ok(isVaultVisibility(v));
  assert.equal(isVaultVisibility("public"), false);
});

test("release state: private is always sealed", () => {
  assert.equal(releaseState({ visibility: "private" }, T0), "sealed");
});

test("release state: scheduled opens on/after the date", () => {
  const future = new Date("2044-01-01T00:00:00Z");
  const past = new Date("2020-01-01T00:00:00Z");
  assert.equal(releaseState({ visibility: "scheduled", releaseAt: future }, T0), "scheduled");
  assert.equal(releaseState({ visibility: "scheduled", releaseAt: past }, T0), "released");
  assert.equal(releaseState({ visibility: "scheduled", releaseAt: future, releasedAt: past }, T0), "released");
});

test("release state: milestone needs an explicit release, shared is shared", () => {
  assert.equal(releaseState({ visibility: "milestone" }, T0), "sealed");
  assert.equal(releaseState({ visibility: "milestone", releasedAt: T0 }, T0), "released");
  assert.equal(releaseState({ visibility: "shared" }, T0), "shared");
});

test("isDueForRelease only fires for past-due, un-released scheduled items", () => {
  assert.equal(isDueForRelease({ visibility: "scheduled", releaseAt: new Date("2020-01-01") }, T0), true);
  assert.equal(isDueForRelease({ visibility: "scheduled", releaseAt: new Date("2044-01-01") }, T0), false);
  assert.equal(isDueForRelease({ visibility: "scheduled", releaseAt: new Date("2020-01-01"), releasedAt: T0 }, T0), false);
  assert.equal(isDueForRelease({ visibility: "private" }, T0), false);
});

test("vault access is Lifetime-gated", () => {
  assert.equal(canAccessVault(true), true);
  assert.equal(canAccessVault(false), false);
});

test("recipients parse safely", () => {
  assert.deepEqual(parseRecipients('["mom","dad"]'), ["mom", "dad"]);
  assert.deepEqual(parseRecipients("not json"), []);
  assert.deepEqual(parseRecipients(null), []);
  assert.deepEqual(parseRecipients('[1,2,"ok"]'), ["ok"]);
});

test("validation catches missing/incoherent fields", () => {
  assert.match(validateItem({ kind: "x", title: "t", visibility: "private" }) ?? "", /kind/i);
  assert.match(validateItem({ kind: "letter", title: "", visibility: "private" }) ?? "", /title/i);
  assert.match(validateItem({ kind: "letter", title: "A", visibility: "scheduled" }) ?? "", /date/i);
  assert.match(validateItem({ kind: "letter", title: "A", visibility: "milestone" }) ?? "", /milestone/i);
  assert.equal(validateItem({ kind: "letter", title: "A", visibility: "private" }), null);
  assert.equal(validateItem({ kind: "letter", title: "A", visibility: "scheduled", releaseAt: "2044-01-01" }), null);
});
