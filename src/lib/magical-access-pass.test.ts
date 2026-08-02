// Unit tests for the Magical Access Pass domain library.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizedDestination, maskedDestination, sanitizePassPermissions,
  generatePassToken, hashToken, tokenMatches, generateVerificationCode, hashCode,
  computeExpiry, viewLimitReached, resolveStatus, canOpenContent, oneViewSessionExpired,
  verifyCode, deviceAllowsReturn, hashDevice, privacyScore, needsFullNotice,
  failedAccessPayload, watermarkLabel, MAX_VERIFICATION_ATTEMPTS,
  SHARING_NOTICE_VERSION, FAILED_ACCESS_MESSAGE,
  type PassRuntime, type VerificationState,
} from "./magical-access-pass.ts";

const NOW = new Date("2026-08-02T12:00:00Z");

// ── Recipient binding ──────────────────────────────────────────
test("normalized destination collapses email/phone; masked hides it", () => {
  assert.equal(normalizedDestination({ channel: "email", destination: "Ta.b+x@Gmail.com" }), "tab@gmail.com");
  assert.equal(normalizedDestination({ channel: "phone", destination: "+1 (214) 555-4821" }), "2145554821");
  assert.ok(maskedDestination({ channel: "email", destination: "tabitha@email.com" }).includes("•"));
  assert.equal(maskedDestination({ channel: "phone", destination: "214-555-4821" }), "•••-•••-4821");
});

// ── Permissions sanitize (private ids can't ride in) ───────────
test("sanitizePassPermissions keeps shareable + download, drops private", () => {
  const out = sanitizePassPermissions(["view_hero", "download", "billing", "Magical Moments Library", "rsvp"]);
  assert.deepEqual(out.sort(), ["download", "rsvp", "view_hero"].sort());
});

// ── Tokens & codes ─────────────────────────────────────────────
test("token round-trips through hash and matches; wrong token fails", () => {
  const t = generatePassToken();
  const h = hashToken(t);
  assert.ok(t.length >= 24);
  assert.equal(tokenMatches(t, h), true);
  assert.equal(tokenMatches(generatePassToken(), h), false);
});
test("verification codes are 6 digits and hash deterministically per pass", () => {
  const code = generateVerificationCode();
  assert.match(code, /^\d{6}$/);
  assert.equal(hashCode("123456", "pass_1"), hashCode("123456", "pass_1"));
  assert.notEqual(hashCode("123456", "pass_1"), hashCode("123456", "pass_2"));
});

// ── Expiry ─────────────────────────────────────────────────────
test("computeExpiry honors each duration policy", () => {
  assert.equal(computeExpiry({ kind: "until_closed" }, NOW), null);
  assert.equal(computeExpiry({ kind: "one_time" }, NOW), null);
  assert.equal(computeExpiry({ kind: "days", days: 7 }, NOW)!.getTime(), NOW.getTime() + 7 * 86400000);
  assert.equal(computeExpiry({ kind: "custom_date", date: "2026-09-01T00:00:00Z" }, NOW)!.toISOString(), "2026-09-01T00:00:00.000Z");
  const eventEnd = new Date("2026-08-10T00:00:00Z");
  assert.equal(computeExpiry({ kind: "until_event" }, NOW, eventEnd)!.getTime(), eventEnd.getTime());
  assert.equal(computeExpiry({ kind: "until_event" }, NOW, null), null);
});

// ── View limits ────────────────────────────────────────────────
test("viewLimitReached across policies", () => {
  assert.equal(viewLimitReached({ kind: "unlimited" }, { views: 99, sessions: 99 }), false);
  assert.equal(viewLimitReached({ kind: "one_view" }, { views: 0, sessions: 0 }), false);
  assert.equal(viewLimitReached({ kind: "one_view" }, { views: 1, sessions: 0 }), true);
  assert.equal(viewLimitReached({ kind: "max_views", max: 3 }, { views: 3, sessions: 0 }), true);
  assert.equal(viewLimitReached({ kind: "max_sessions", max: 2 }, { views: 9, sessions: 2 }), true);
});

// ── Status resolution ──────────────────────────────────────────
const rt = (over: Partial<PassRuntime> = {}): PassRuntime => ({
  ownerState: "active", expiresAt: null, usedAt: null, views: 0, sessions: 0, viewLimit: { kind: "unlimited" }, ...over,
});
test("hard owner states win over derived", () => {
  assert.equal(resolveStatus(rt({ ownerState: "revoked", expiresAt: new Date("2020-01-01") }), NOW), "revoked");
  assert.equal(resolveStatus(rt({ ownerState: "closed" }), NOW), "closed");
  assert.equal(resolveStatus(rt({ ownerState: "paused" }), NOW), "paused");
});
test("used and expired are derived", () => {
  assert.equal(resolveStatus(rt({ usedAt: NOW }), NOW), "used");
  assert.equal(resolveStatus(rt({ expiresAt: new Date("2026-08-01T00:00:00Z") }), NOW), "expired");
  assert.equal(resolveStatus(rt({ viewLimit: { kind: "one_view" }, views: 1 }), NOW), "used");
  assert.equal(resolveStatus(rt(), NOW), "active");
});
test("content opens only when active AND verified", () => {
  assert.equal(canOpenContent(rt(), NOW, true), true);
  assert.equal(canOpenContent(rt(), NOW, false), false);           // not verified
  assert.equal(canOpenContent(rt({ ownerState: "paused" }), NOW, true), false);
});
test("one-view grace absorbs quick refreshes", () => {
  const opened = new Date(NOW.getTime() - 60 * 1000);
  assert.equal(oneViewSessionExpired(opened, NOW), false);
  const old = new Date(NOW.getTime() - 5 * 60 * 1000);
  assert.equal(oneViewSessionExpired(old, NOW), true);
});

// ── Verification decisions ─────────────────────────────────────
const vstate = (over: Partial<VerificationState> = {}): VerificationState => ({
  codeHash: hashCode("123456", "p1"), codeExpiresAt: new Date(NOW.getTime() + 60000), attempts: 0, ...over,
});
test("correct code passes; wrong code is incorrect", () => {
  assert.deepEqual(verifyCode(vstate(), "123456", "p1", NOW), { ok: true });
  assert.deepEqual(verifyCode(vstate(), "000000", "p1", NOW), { ok: false, reason: "incorrect" });
});
test("expired code and lockout and no-code", () => {
  assert.deepEqual(verifyCode(vstate({ codeExpiresAt: new Date(NOW.getTime() - 1) }), "123456", "p1", NOW), { ok: false, reason: "expired" });
  assert.deepEqual(verifyCode(vstate({ attempts: MAX_VERIFICATION_ATTEMPTS }), "123456", "p1", NOW), { ok: false, reason: "locked" });
  assert.deepEqual(verifyCode(vstate({ codeHash: null }), "123456", "p1", NOW), { ok: false, reason: "no_code" });
});

// ── Device controls (never the only control) ───────────────────
test("verify-every-visit never allows a device shortcut", () => {
  const known = { deviceHash: hashDevice("dev1"), verifiedAt: NOW };
  assert.equal(deviceAllowsReturn({ kind: "verify_every_visit" }, known, hashDevice("dev1"), NOW), false);
});
test("remembered device allowed only within window and on match", () => {
  const known = { deviceHash: hashDevice("dev1"), verifiedAt: new Date(NOW.getTime() - 2 * 3600000) };
  assert.equal(deviceAllowsReturn({ kind: "remember_hours", hours: 24 }, known, hashDevice("dev1"), NOW), true);
  assert.equal(deviceAllowsReturn({ kind: "remember_hours", hours: 1 }, known, hashDevice("dev1"), NOW), false); // window passed
  assert.equal(deviceAllowsReturn({ kind: "remember_hours", hours: 24 }, known, hashDevice("other"), NOW), false); // mismatch
});

// ── Privacy Score ──────────────────────────────────────────────
test("public access is red and warns", () => {
  const r = privacyScore({ verificationRequired: false, downloadsEnabled: true, watermarkEnabled: false, limitedViewing: false, expirationEnabled: false, publicAccess: true });
  assert.equal(r.level, "red");
  assert.equal(r.warn, true);
});
test("maximum privacy is green", () => {
  const r = privacyScore({ verificationRequired: true, downloadsEnabled: false, watermarkEnabled: true, limitedViewing: true, expirationEnabled: true, publicAccess: false });
  assert.equal(r.level, "green");
});
test("mixed settings are yellow", () => {
  const r = privacyScore({ verificationRequired: true, downloadsEnabled: true, watermarkEnabled: false, limitedViewing: false, expirationEnabled: true, publicAccess: false });
  assert.equal(r.level, "yellow");
});

// ── Versioned acknowledgment ───────────────────────────────────
test("full notice needed when missing, not-dont-show, or version bumped", () => {
  assert.equal(needsFullNotice(null), true);
  assert.equal(needsFullNotice({ version: SHARING_NOTICE_VERSION, acceptedAt: NOW, dontShowAgain: false }), true);
  assert.equal(needsFullNotice({ version: "SHARING_NOTICE_V0", acceptedAt: NOW, dontShowAgain: true }), true);
  assert.equal(needsFullNotice({ version: SHARING_NOTICE_VERSION, acceptedAt: NOW, dontShowAgain: true }), false);
});

// ── Failed access & watermark ──────────────────────────────────
test("failed access reveals nothing but the notice", () => {
  const p = failedAccessPayload();
  assert.deepEqual(Object.keys(p), ["message"]);
  assert.equal(p.message, FAILED_ACCESS_MESSAGE);
});
test("watermark label uses name + masked destination, never the raw contact", () => {
  const w = watermarkLabel({ name: "Taylor", channel: "email", destination: "taylor@email.com" });
  assert.ok(w.includes("Taylor"));
  assert.ok(w.includes("•"));
  assert.ok(!w.includes("taylor@email.com"));
});
