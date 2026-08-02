// Tests for the auth-activation pure logic: password strength, safe redirects,
// login rate limiting, the login-outcome resolver, single-use hashed tokens,
// and the guardian-approval decision layer. Pure functions only — no I/O.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  passwordStrength, MIN_PASSWORD_LENGTH,
  safeRedirect, rateLimit, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS,
  evaluateWindow,
  loginOutcome, type LoginContext,
  newAuthToken, hashAuthToken, authTokenExpiry, checkAuthToken,
  invitationExpired,
} from "./auth-support";
import {
  needsGuardianApproval, minorAccessDecision, applyGuardianDecision,
  minorDefaultPermissions, hashGuardianToken, newGuardianToken, guardianApprovalExpiry,
} from "./guardian";
import { rateBucket, limitFor, RATE_DEFAULTS } from "./rate-limit-core";
import { legacyRole, resolveBridge, shouldBackfill } from "./dashboard-bridge";

// ── Password strength ───────────────────────────────────────────
test("passwordStrength: rejects short passwords", () => {
  const r = passwordStrength("aB3!");
  assert.equal(r.ok, false);
  assert.equal(r.label, "too short");
  assert.ok(r.issues.some((i) => i.includes(String(MIN_PASSWORD_LENGTH))));
});

test("passwordStrength: rejects low-variety passwords", () => {
  const r = passwordStrength("aaaaaaaaaaaa"); // long but 1 char class + repeat
  assert.equal(r.ok, false);
});

test("passwordStrength: accepts a strong password", () => {
  const r = passwordStrength("Lavender-Gold-91");
  assert.equal(r.ok, true);
  assert.ok(r.score >= 3);
  assert.equal(r.issues.length, 0);
});

// ── Safe redirect ───────────────────────────────────────────────
test("safeRedirect: allows same-origin paths", () => {
  assert.equal(safeRedirect("/notifications"), "/notifications");
  assert.equal(safeRedirect("/account/security"), "/account/security");
});

test("safeRedirect: blocks open-redirects", () => {
  assert.equal(safeRedirect("https://evil.com"), "/account");
  assert.equal(safeRedirect("//evil.com"), "/account");
  assert.equal(safeRedirect("/\\evil.com"), "/account");
  assert.equal(safeRedirect("javascript:alert(1)"), "/account");
  assert.equal(safeRedirect(""), "/account");
  assert.equal(safeRedirect(null), "/account");
  assert.equal(safeRedirect("/ok", "/home"), "/ok");
  assert.equal(safeRedirect("bad", "/home"), "/home");
});

// ── Rate limiting ───────────────────────────────────────────────
test("rateLimit: unlocked below threshold", () => {
  const now = 1_000_000;
  const r = rateLimit([now - 1000, now - 2000], now);
  assert.equal(r.locked, false);
  assert.equal(r.remaining, LOGIN_MAX_ATTEMPTS - 2);
});

test("rateLimit: locks at threshold within window", () => {
  const now = 1_000_000;
  const attempts = Array.from({ length: LOGIN_MAX_ATTEMPTS }, (_, i) => now - i * 1000);
  const r = rateLimit(attempts, now);
  assert.equal(r.locked, true);
  assert.ok(r.retryAfterMs > 0);
});

test("rateLimit: old attempts outside the window don't count", () => {
  const now = 1_000_000;
  const old = Array.from({ length: LOGIN_MAX_ATTEMPTS }, () => now - LOGIN_WINDOW_MS - 1000);
  const r = rateLimit(old, now);
  assert.equal(r.locked, false);
  assert.equal(r.remaining, LOGIN_MAX_ATTEMPTS);
});

// ── Login outcome resolver ──────────────────────────────────────
const baseCtx: LoginContext = {
  accountFound: true, passwordOk: true, status: "ACTIVE",
  emailVerified: true, guardianPending: false,
};

test("loginOutcome: happy path", () => {
  assert.equal(loginOutcome(baseCtx).code, "ok");
  assert.equal(loginOutcome(baseCtx).ok, true);
});

test("loginOutcome: missing account and wrong password are indistinguishable", () => {
  const missing = loginOutcome({ ...baseCtx, accountFound: false });
  const wrong = loginOutcome({ ...baseCtx, passwordOk: false });
  assert.equal(missing.code, "invalid_credentials");
  assert.equal(wrong.code, "invalid_credentials");
  assert.equal(missing.message, wrong.message); // no email-existence leak
});

test("loginOutcome: lockout takes priority over credential hints", () => {
  const r = loginOutcome({ ...baseCtx, accountFound: false, passwordOk: false, locked: true });
  assert.equal(r.code, "locked");
});

test("loginOutcome: unverified email only after valid credentials", () => {
  const r = loginOutcome({ ...baseCtx, emailVerified: false });
  assert.equal(r.code, "email_unverified");
  assert.equal(r.action, "resend_verification");
  // But a wrong password on an unverified account still hides existence:
  const hidden = loginOutcome({ ...baseCtx, emailVerified: false, passwordOk: false });
  assert.equal(hidden.code, "invalid_credentials");
});

test("loginOutcome: guardian-pending, suspended, closed, vendor-inactive", () => {
  assert.equal(loginOutcome({ ...baseCtx, guardianPending: true }).code, "guardian_pending");
  assert.equal(loginOutcome({ ...baseCtx, status: "UNDER_REVIEW" }).code, "suspended");
  assert.equal(loginOutcome({ ...baseCtx, status: "CLOSED" }).code, "closed");
  assert.equal(loginOutcome({ ...baseCtx, vendorInactive: true }).code, "vendor_inactive");
});

// ── Auth tokens ─────────────────────────────────────────────────
test("auth tokens: hashing is purpose-scoped and never the raw token", () => {
  const t = newAuthToken();
  const vh = hashAuthToken("verify_email", t);
  const rh = hashAuthToken("password_reset", t);
  assert.notEqual(vh, t);
  assert.notEqual(vh, rh); // same token can't cross purposes
  assert.equal(hashAuthToken("verify_email", t), vh); // deterministic
});

test("auth tokens: expiry + single-use checks", () => {
  const now = "2026-01-01T00:00:00.000Z";
  const exp = authTokenExpiry("password_reset", now);
  assert.equal(checkAuthToken({ expiresAt: exp }, now), "ok");
  const later = "2026-01-01T02:00:00.000Z"; // past the 1h reset TTL
  assert.equal(checkAuthToken({ expiresAt: exp }, later), "expired");
  assert.equal(checkAuthToken({ expiresAt: exp, usedAt: now }, now), "used");
});

test("invitationExpired: compares timestamps", () => {
  assert.equal(invitationExpired("2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z"), false);
  assert.equal(invitationExpired("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"), true);
});

// ── Guardian approval ───────────────────────────────────────────
test("needsGuardianApproval: only minors", () => {
  assert.equal(needsGuardianApproval("child"), true);
  assert.equal(needsGuardianApproval("teen"), true);
  assert.equal(needsGuardianApproval("parent"), false);
  assert.equal(needsGuardianApproval("family_owner"), false);
});

test("minorAccessDecision: gated until approved", () => {
  assert.deepEqual(minorAccessDecision({ role: "parent", approvalStatus: null }), { canUse: true });
  assert.deepEqual(minorAccessDecision({ role: "child", approvalStatus: "approved" }), { canUse: true });
  assert.deepEqual(minorAccessDecision({ role: "child", approvalStatus: "pending" }), { canUse: false, reason: "pending" });
  assert.deepEqual(minorAccessDecision({ role: "teen", approvalStatus: null }), { canUse: false, reason: "missing" });
  assert.deepEqual(minorAccessDecision({ role: "teen", approvalStatus: "declined" }), { canUse: false, reason: "declined" });
});

test("minorDefaultPermissions: restricted by default (no savings goals for child)", () => {
  const child = minorDefaultPermissions("child");
  assert.equal(child.view_savings_goals, false);
  assert.equal(child.view_calendar, true);
});

test("applyGuardianDecision: approve/decline valid pending records", () => {
  const now = "2026-01-01T00:00:00Z";
  const exp = guardianApprovalExpiry(now);
  assert.deepEqual(applyGuardianDecision({ status: "pending", expiresAtISO: exp, nowISO: now, choice: "approve" }), { ok: true, newStatus: "approved" });
  assert.deepEqual(applyGuardianDecision({ status: "pending", expiresAtISO: exp, nowISO: now, choice: "decline" }), { ok: true, newStatus: "declined" });
});

test("applyGuardianDecision: rejects already-decided or expired", () => {
  const now = "2026-01-01T00:00:00Z";
  const exp = guardianApprovalExpiry(now);
  assert.deepEqual(applyGuardianDecision({ status: "approved", expiresAtISO: exp, nowISO: now, choice: "approve" }), { ok: false, reason: "already_decided" });
  const late = "2026-02-01T00:00:00Z";
  assert.deepEqual(applyGuardianDecision({ status: "pending", expiresAtISO: exp, nowISO: late, choice: "approve" }), { ok: false, reason: "expired" });
});

test("guardian tokens: hashed, deterministic, not the raw token", () => {
  const t = newGuardianToken();
  const h = hashGuardianToken(t);
  assert.notEqual(h, t);
  assert.equal(hashGuardianToken(t), h);
});

// ── Durable rate limiter (pure core) ────────────────────────────
test("evaluateWindow: threshold + retry-after per config", () => {
  const now = 1_000_000;
  const cfg = { max: 3, windowMs: 10_000 };
  assert.equal(evaluateWindow([now - 1, now - 2], now, cfg).locked, false);
  const three = [now - 1, now - 2, now - 3];
  const r = evaluateWindow(three, now, cfg);
  assert.equal(r.locked, true);
  assert.ok(r.retryAfterMs > 0 && r.retryAfterMs <= 10_000);
});

test("evaluateWindow: hits outside the window reset the counter", () => {
  const now = 1_000_000;
  const cfg = { max: 3, windowMs: 10_000 };
  const old = [now - 20_000, now - 30_000, now - 40_000];
  assert.equal(evaluateWindow(old, now, cfg).locked, false);
  assert.equal(evaluateWindow(old, now, cfg).remaining, 3);
});

test("rate limiter: shared store is instance-independent", () => {
  // Two 'server instances' reading the same shared hit list reach the SAME
  // verdict — this is exactly what the PostgreSQL-backed store guarantees.
  const now = 5_000_000;
  const cfg = limitFor("login");
  const shared = Array.from({ length: cfg.max }, (_, i) => now - i * 1000);
  const instanceA = evaluateWindow(shared, now, cfg);
  const instanceB = evaluateWindow(shared, now, cfg);
  assert.equal(instanceA.locked, true);
  assert.deepEqual(instanceA, instanceB);
});

test("rate limiter: action buckets are isolated + no raw email", () => {
  const parts = { ip: "203.0.113.5", email: "Test.User+x@Gmail.com", accountId: "acc_1" };
  const login = rateBucket("login", parts);
  const reset = rateBucket("password_reset", parts);
  assert.notEqual(login, reset);                       // separate buckets per action
  assert.equal(rateBucket("login", parts), login);     // deterministic
  assert.ok(!login.includes("gmail"));                 // hashed — no raw email
  assert.ok(!login.includes("Test"));
  // Same person, different IP → different bucket (per-IP isolation).
  assert.notEqual(login, rateBucket("login", { ...parts, ip: "198.51.100.9" }));
});

test("rate limiter: sane defaults for every action", () => {
  for (const action of Object.keys(RATE_DEFAULTS) as (keyof typeof RATE_DEFAULTS)[]) {
    const cfg = limitFor(action);
    assert.ok(cfg.max >= 1 && cfg.windowMs >= 60_000);
  }
});

// ── Dashboard identity bridge (pure decisions) ──────────────────
test("legacyRole: staff maps to ADMIN, others USER", () => {
  assert.equal(legacyRole("admin"), "ADMIN");
  assert.equal(legacyRole("family_owner"), "USER");
  assert.equal(legacyRole("child"), "USER");
});

test("resolveBridge: one User per Account, prevents duplicates", () => {
  // Already linked → reuse (never create a second).
  assert.deepEqual(resolveBridge({ legacyUserId: "u1", matchedUserId: "u2" }), { mode: "existing_link", userId: "u1" });
  // Verified email match → link the existing User + backfill.
  const m = resolveBridge({ matchedUserId: "u2" });
  assert.deepEqual(m, { mode: "email_match", userId: "u2" });
  assert.equal(shouldBackfill(m), true);
  // No link, no match → create; no backfill needed.
  const c = resolveBridge({});
  assert.deepEqual(c, { mode: "create" });
  assert.equal(shouldBackfill(c), false);
});
