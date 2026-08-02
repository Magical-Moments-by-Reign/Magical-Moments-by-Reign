// ── Authentication & sessions ───────────────────────────────────
// The shared auth mechanics for the platform, built on the existing Account
// cluster (Account.passwordHash / googleSub / appleSub) and the identity
// duplicate-prevention library. It does NOT rebuild identity logic — sign-up
// reuses account-identity's duplicate detection (recover-before-duplicate) and
// verification gates, and roles come from src/lib/roles.ts.
//
// Real, testable crypto: scrypt password hashing (salted, timing-safe) and
// opaque session tokens stored HASHED. Email/SMS verification delivery and the
// login/social OAuth wiring are seams — nothing here logs anyone in without a
// real password/session.

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import {
  findProbableMatches, recoveryDecision, missingRequiredFields, purchasingEnabled,
  type IdentitySnapshot, type AccountInput, type VerificationState, type RecoveryDecision,
} from "@/lib/account-identity";
import { requiresGuardian, type PlatformRole } from "@/lib/roles";

// ── Password hashing (scrypt) ───────────────────────────────────
const SCRYPT_KEYLEN = 64;

/** Hash a password as `salt:derivedKey` (hex). Never store plaintext. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${dk}`;
}

/** Verify a password against a stored `salt:dk` hash (timing-safe). */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, dk] = (stored || "").split(":");
  if (!salt || !dk) return false;
  const expected = Buffer.from(dk, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── Sessions (opaque token, stored hashed) ──────────────────────
export const SESSION_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(`mmr-session:${token}`).digest("hex");
}
export function sessionExpiry(nowISO: string, days = SESSION_TTL_DAYS): string {
  return new Date(new Date(nowISO).getTime() + days * DAY_MS).toISOString();
}
export function sessionValid(session: { expiresAt: string; revokedAt?: string | null }, nowISO: string): boolean {
  if (session.revokedAt) return false;
  return new Date(nowISO).getTime() < new Date(session.expiresAt).getTime();
}

// ── Social sign-in (subject-id only; no tokens stored) ──────────
export type SocialProvider = "google" | "apple";
export function socialSubjectField(provider: SocialProvider): "googleSub" | "appleSub" {
  return provider === "google" ? "googleSub" : "appleSub";
}

// ── Sign-up decision (recover-before-duplicate + safeguards) ────
export interface SignupInput extends AccountInput {
  role: PlatformRole;
  guardianAccountId?: string; // required for a minor
}

export type SignupDecision =
  | { ok: true; verificationRequired: true }
  | { ok: false; reason: "missing_fields"; missing: string[] }
  | { ok: false; reason: "recover_existing"; recovery: RecoveryDecision }
  | { ok: false; reason: "guardian_required" };

/**
 * Decide whether a sign-up may proceed. Order: required fields → existing-account
 * recovery (never create a duplicate) → child accounts must have a guardian. On
 * success, email + phone verification are still required before purchasing.
 */
export function signupDecision(input: SignupInput, existing: IdentitySnapshot[]): SignupDecision {
  const missing = missingRequiredFields(input);
  if (missing.length) return { ok: false, reason: "missing_fields", missing };

  const candidate: IdentitySnapshot = {
    firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone, address: input.address,
  };
  const matches = findProbableMatches(candidate, existing);
  const rec = recoveryDecision(matches);
  if (rec.action === "recover") return { ok: false, reason: "recover_existing", recovery: rec };

  if (requiresGuardian(input.role) && !input.guardianAccountId) {
    return { ok: false, reason: "guardian_required" };
  }
  return { ok: true, verificationRequired: true };
}

/** Purchasing/payment-plan privileges stay off until email AND phone are verified. */
export function canPurchaseAfterSignup(v: VerificationState): boolean {
  return purchasingEnabled(v);
}
