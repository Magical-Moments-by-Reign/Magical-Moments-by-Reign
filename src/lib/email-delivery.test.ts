// Tests for the pure email-delivery core: From-address resolution (incl. missing
// RESEND_FROM_EMAIL), preflight when RESEND_API_KEY is missing, interpreting an
// unverified-domain response and a generic Resend rejection, a successful send,
// the verification audit entry (proving the token is NOT rolled back on failure),
// and redaction (proving no secret values reach a log or audit row).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveFrom, preflight, interpretResendResponse, isUnverifiedDomainError,
  verificationAuditEntry, redact, DEFAULT_FROM,
} from "./email-delivery";

// ── From-address resolution ─────────────────────────────────────
test("resolveFrom prefers RESEND_FROM_EMAIL", () => {
  const r = resolveFrom({ RESEND_FROM_EMAIL: "Reign <hi@magicalmomentsbyreign.com>", MAIL_FROM: "old@x.com" });
  assert.equal(r.from, "Reign <hi@magicalmomentsbyreign.com>");
  assert.equal(r.source, "RESEND_FROM_EMAIL");
});

test("resolveFrom falls back to MAIL_FROM when RESEND_FROM_EMAIL is missing", () => {
  const r = resolveFrom({ MAIL_FROM: "Legacy <legacy@magicalmomentsbyreign.com>" });
  assert.equal(r.from, "Legacy <legacy@magicalmomentsbyreign.com>");
  assert.equal(r.source, "MAIL_FROM");
});

test("resolveFrom falls back to the default when both are missing/blank", () => {
  assert.deepEqual(resolveFrom({}), { from: DEFAULT_FROM, source: "default" });
  assert.deepEqual(resolveFrom({ RESEND_FROM_EMAIL: "   ", MAIL_FROM: "" }), { from: DEFAULT_FROM, source: "default" });
});

// ── Preflight (missing RESEND_API_KEY) ──────────────────────────
test("preflight blocks the send when RESEND_API_KEY is missing or blank", () => {
  assert.deepEqual(preflight({}), { canSend: false, reason: "missing_api_key" });
  assert.deepEqual(preflight({ RESEND_API_KEY: "  " }), { canSend: false, reason: "missing_api_key" });
});

test("preflight allows the send when RESEND_API_KEY is present", () => {
  assert.deepEqual(preflight({ RESEND_API_KEY: "re_test_123" }), { canSend: true });
});

// ── Interpreting Resend responses ───────────────────────────────
test("unverified sending domain is a failure with a clear, detectable reason", () => {
  const res = interpretResendResponse({
    ok: false, status: 403,
    body: { statusCode: 403, name: "validation_error", message: "The magicalmomentsbyreign.com domain is not verified. Please verify it in the dashboard." },
  });
  assert.equal(res.sent, false);
  assert.match(res.error ?? "", /not verified/i);
  assert.equal(isUnverifiedDomainError(res), true);
});

test("a generic Resend rejection (bad key) is a failure, not a success", () => {
  const res = interpretResendResponse({ ok: false, status: 401, body: { name: "restricted_api_key", message: "Invalid API key" } });
  assert.equal(res.sent, false);
  assert.equal(res.error, "Invalid API key");
  assert.equal(isUnverifiedDomainError(res), false);
});

test("a rejection with no body still fails with an HTTP-status message", () => {
  const res = interpretResendResponse({ ok: false, status: 500, body: undefined });
  assert.equal(res.sent, false);
  assert.match(res.error ?? "", /HTTP 500/);
});

test("a successful send returns sent:true with the message id", () => {
  const res = interpretResendResponse({ ok: true, status: 200, body: { id: "3f8a-msg-id" } });
  assert.deepEqual(res, { sent: true, id: "3f8a-msg-id" });
});

// ── Verification audit entry (token preserved on failure) ───────
test("audit entry for a successful send records the id, not a rollback", () => {
  const e = verificationAuditEntry({ sent: true, id: "abc123" });
  assert.equal(e.action, "verification_email_sent");
  assert.match(e.detail, /abc123/);
});

test("audit entry for a skipped send (missing key) is a FAILED audit — token stays stored", () => {
  const e = verificationAuditEntry({ sent: false, skipped: true, error: "RESEND_API_KEY not set" });
  assert.equal(e.action, "verification_email_failed");
  assert.match(e.detail, /skipped/i);
});

test("audit entry for a rejected send is a FAILED audit — token stays stored", () => {
  const e = verificationAuditEntry({ sent: false, error: "domain is not verified" });
  assert.equal(e.action, "verification_email_failed");
  assert.match(e.detail, /error/i);
});

// ── Redaction (no secret values logged) ─────────────────────────
test("redact scrubs Resend API keys and bearer tokens", () => {
  assert.equal(redact("boom key=re_abc123DEF_ghi failed"), "boom key=re_*** failed");
  assert.equal(redact("Authorization: Bearer re_secret_value"), "Authorization: Bearer ***");
});

test("verification audit detail never leaks a secret even if the provider echoes one", () => {
  const e = verificationAuditEntry({ sent: false, error: "rejected for key re_live_TOPSECRET1234" });
  assert.doesNotMatch(e.detail, /re_live_TOPSECRET1234/);
  assert.match(e.detail, /re_\*\*\*/);
});
