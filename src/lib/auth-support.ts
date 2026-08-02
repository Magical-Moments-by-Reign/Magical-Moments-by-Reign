// ── Auth support — pure, testable security helpers ──────────────
// The decision logic behind the authentication UI: password strength,
// safe post-login redirects, login-attempt rate limiting, the account-status
// resolver that decides what a login attempt is allowed to do (and the exact,
// privacy-safe message to show), and single-use hashed auth tokens for email
// verification + password reset.
//
// Everything here is a pure function of its inputs — no I/O, no globals — so it
// is fully unit-tested (see auth-support.test.ts). The DB/cookie wiring lives in
// src/lib/auth-session.ts and src/lib/auth-service.ts.

import { randomBytes, createHash } from "node:crypto";

// ── Single-use, hashed auth tokens (verify email / reset password) ──
export type AuthTokenPurpose = "verify_email" | "password_reset";

export const AUTH_TOKEN_TTL_HOURS: Record<AuthTokenPurpose, number> = {
  verify_email: 48,   // 2 days
  password_reset: 1,  // 1 hour — short-lived on purpose
};

const HOUR_MS = 60 * 60 * 1000;

/** A cryptographically-random opaque token for a verification/reset link. */
export function newAuthToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Store ONLY this hash — never the raw token. Purpose-scoped so a leaked
 *  verify token can't be replayed as a reset token. */
export function hashAuthToken(purpose: AuthTokenPurpose, token: string): string {
  return createHash("sha256").update(`mmr-${purpose}:${token}`).digest("hex");
}

export function authTokenExpiry(purpose: AuthTokenPurpose, nowISO: string): string {
  return new Date(new Date(nowISO).getTime() + AUTH_TOKEN_TTL_HOURS[purpose] * HOUR_MS).toISOString();
}

export interface AuthTokenState {
  expiresAt: string;
  usedAt?: string | null;
}
export type AuthTokenCheck = "ok" | "expired" | "used";

/** A token is usable only if it hasn't been used and hasn't expired. */
export function checkAuthToken(state: AuthTokenState, nowISO: string): AuthTokenCheck {
  if (state.usedAt) return "used";
  if (new Date(nowISO).getTime() > new Date(state.expiresAt).getTime()) return "expired";
  return "ok";
}

// ── Password strength ───────────────────────────────────────────
export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordStrength {
  ok: boolean;              // meets the minimum policy
  score: 0 | 1 | 2 | 3 | 4; // for a strength meter
  label: "too short" | "weak" | "fair" | "good" | "strong";
  issues: string[];         // human-readable, actionable
}

/**
 * Enforce a real minimum policy (length + variety) without being hostile.
 * Returns a score for the meter and specific issues to fix.
 */
export function passwordStrength(password: string): PasswordStrength {
  const pw = password || "";
  const issues: string[] = [];
  if (pw.length < MIN_PASSWORD_LENGTH) issues.push(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (variety < 3) issues.push("Mix uppercase, lowercase, numbers, and symbols");
  if (/^(.)\1+$/.test(pw)) issues.push("Avoid repeating a single character");

  // Score: length tiers + variety, clamped 0–4.
  let raw = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) raw += 1;
  if (pw.length >= 14) raw += 1;
  if (variety >= 3) raw += 1;
  if (variety >= 4 && pw.length >= 12) raw += 1;
  const score = Math.max(0, Math.min(4, raw)) as 0 | 1 | 2 | 3 | 4;

  const ok = pw.length >= MIN_PASSWORD_LENGTH && variety >= 3 && !/^(.)\1+$/.test(pw);
  const label: PasswordStrength["label"] =
    pw.length < MIN_PASSWORD_LENGTH ? "too short" :
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";
  return { ok, score, label, issues };
}

// ── Safe redirect (open-redirect prevention) ────────────────────
/**
 * Only allow same-origin, path-only redirects. Anything absolute, protocol-
 * relative (`//evil.com`), or backslash-tricked falls back to `fallback`.
 */
export function safeRedirect(target: string | null | undefined, fallback = "/account"): string {
  const t = (target || "").trim();
  if (!t) return fallback;
  if (!t.startsWith("/")) return fallback;   // must be a path
  if (t.startsWith("//")) return fallback;   // protocol-relative
  if (t.includes("\\")) return fallback;     // backslash trick
  if (t.includes("://")) return fallback;    // embedded scheme
  return t;
}

// ── Login rate limiting (per key = email/ip) ────────────────────
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const LOGIN_LOCK_MS = 15 * 60 * 1000;   // lockout duration

export interface RateLimitResult {
  locked: boolean;
  remaining: number;       // attempts left before lock
  retryAfterMs: number;    // when locked, how long until unlock
}

export interface WindowOpts { max: number; windowMs: number; lockMs?: number }

/**
 * The core sliding-window decision, generalized so every action type (login,
 * password reset, verification resend, …) shares one tested implementation.
 * Given the timestamps (ms) of recent hits and `now`, decide whether the key is
 * locked. Hits outside the window are ignored. This is what makes the durable
 * PostgreSQL limiter instance-independent: any instance reading the same shared
 * hit list reaches the same verdict.
 */
export function evaluateWindow(hitsMs: number[], nowMs: number, opts: WindowOpts): RateLimitResult {
  const lockMs = opts.lockMs ?? opts.windowMs;
  const recent = hitsMs.filter((t) => nowMs - t < opts.windowMs);
  const locked = recent.length >= opts.max;
  if (locked) {
    const oldest = Math.min(...recent);
    const retryAfterMs = Math.max(0, lockMs - (nowMs - oldest));
    return { locked: retryAfterMs > 0, remaining: 0, retryAfterMs };
  }
  return { locked: false, remaining: Math.max(0, opts.max - recent.length), retryAfterMs: 0 };
}

/**
 * Given the timestamps (ms) of recent failed login attempts and `now`, decide
 * whether this key is currently locked. Thin wrapper over evaluateWindow using
 * the login defaults (kept for the existing callers/tests).
 */
export function rateLimit(failedAtMs: number[], nowMs: number): RateLimitResult {
  return evaluateWindow(failedAtMs, nowMs, { max: LOGIN_MAX_ATTEMPTS, windowMs: LOGIN_WINDOW_MS, lockMs: LOGIN_LOCK_MS });
}

// ── Login outcome resolver ──────────────────────────────────────
// One place decides what a login attempt results in and the exact message the
// user sees. Privacy rule: we NEVER reveal whether an email exists when the
// password is wrong or the account is missing — both return the same generic
// "invalid credentials" message.
export type AccountStatusLike =
  | "ACTIVE" | "PAYMENT_DUE" | "PAST_DUE" | "PAYMENT_PLAN_ACTIVE"
  | "PAYMENT_METHOD_FAILED" | "UNDER_REVIEW" | "CHARGEBACK_REVIEW"
  | "PURCHASE_RESTRICTED" | "FINANCING_RESTRICTED" | "CLOSED";

export interface LoginContext {
  accountFound: boolean;
  passwordOk: boolean;
  status: AccountStatusLike;
  emailVerified: boolean;
  guardianPending: boolean;   // minor awaiting guardian approval
  vendorInactive?: boolean;   // vendor whose membership lapsed
  locked?: boolean;           // rate-limit lockout
}

export type LoginOutcomeCode =
  | "ok"
  | "invalid_credentials"
  | "locked"
  | "email_unverified"
  | "guardian_pending"
  | "suspended"
  | "vendor_inactive"
  | "closed";

export interface LoginOutcome {
  code: LoginOutcomeCode;
  ok: boolean;
  message: string;
  /** UI hint: which recovery/next action to surface. */
  action?: "resend_verification" | "contact_support" | "reset_password" | "vendor_renew";
}

const GENERIC_INVALID = "That email or password doesn't match our records. Please try again.";

/**
 * Decide the login outcome. Order matters: lockout first (before any credential
 * hint), then the generic invalid-credentials wall, then status gates. The
 * missing-account and wrong-password cases are indistinguishable by design.
 */
export function loginOutcome(ctx: LoginContext): LoginOutcome {
  if (ctx.locked) {
    return {
      code: "locked", ok: false, action: "reset_password",
      message: "Too many attempts. For your security, please wait a few minutes before trying again — or reset your password.",
    };
  }
  if (!ctx.accountFound || !ctx.passwordOk) {
    return { code: "invalid_credentials", ok: false, message: GENERIC_INVALID };
  }
  // Credentials are valid from here — now safe to explain account state.
  if (ctx.status === "CLOSED") {
    return {
      code: "closed", ok: false, action: "contact_support",
      message: "This account is closed. Please contact support if you believe this is a mistake.",
    };
  }
  if (ctx.status === "UNDER_REVIEW" || ctx.status === "CHARGEBACK_REVIEW") {
    return {
      code: "suspended", ok: false, action: "contact_support",
      message: "Your account is temporarily under review. Please contact support and we'll help you right away.",
    };
  }
  if (ctx.guardianPending) {
    return {
      code: "guardian_pending", ok: false, action: "contact_support",
      message: "Your account is waiting for a parent or guardian to approve it. We'll email you the moment it's approved.",
    };
  }
  if (!ctx.emailVerified) {
    return {
      code: "email_unverified", ok: false, action: "resend_verification",
      message: "Please verify your email to finish setting up your account. We can send you a new verification link.",
    };
  }
  if (ctx.vendorInactive) {
    return {
      code: "vendor_inactive", ok: false, action: "vendor_renew",
      message: "Your vendor membership is inactive. Renew or update your credentials to restore your listing.",
    };
  }
  return { code: "ok", ok: true, message: "Welcome back." };
}

// ── Invitation display expiry check (pure) ──────────────────────
export function invitationExpired(expiresAtISO: string, nowISO: string): boolean {
  return new Date(nowISO).getTime() > new Date(expiresAtISO).getTime();
}
