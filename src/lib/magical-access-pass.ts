// ── Magical Access Pass™ — recipient-bound private sharing ───────
// "Easy for the invited person. Useless to anyone else. Fully controlled by
// the owner."
//
// A Magical Access Pass binds ONE Experience · ONE owner · ONE recipient · ONE
// verified email/phone · ONE permission set · ONE expiration policy. A guest
// only gets in by entering a one-time code sent to the owner-specified contact,
// so forwarding the URL alone grants nothing. Every protected request is
// re-checked server-side (revocation, expiry, limits) — never by hidden buttons.
//
// This module is the server-side domain authority: token/code crypto,
// verification decisions, status resolution, view-limit logic, Privacy Score,
// the (versioned) sharing acknowledgment, watermark labels, and the honest
// screenshot disclaimer. Sending the code (email/SMS), storage, and watermark
// rendering are integration seams — nothing here fabricates a delivery or a
// verification. Pure decision functions are separated from crypto so they stay
// deterministic and testable.

import { createHash, randomBytes, randomInt } from "node:crypto";
import { maskEmail, maskPhone, canonicalEmail, normalizePhone } from "@/lib/account-identity";
import { isShareablePermission, type SharePermission } from "@/lib/guest-sharing";

// ── Recipient binding ───────────────────────────────────────────
export type RecipientChannel = "email" | "phone";

export interface Recipient {
  name: string;
  channel: RecipientChannel;
  /** The raw destination (email or phone) — stored normalized, shown masked. */
  destination: string;
}

/** Normalized destination used for binding/lookup (never shown to anyone). */
export function normalizedDestination(r: Pick<Recipient, "channel" | "destination">): string {
  return r.channel === "email" ? canonicalEmail(r.destination) : normalizePhone(r.destination);
}

/** Masked destination shown on the verification screen. */
export function maskedDestination(r: Pick<Recipient, "channel" | "destination">): string {
  return r.channel === "email" ? maskEmail(r.destination) : maskPhone(r.destination);
}

// ── Content permissions (reuse the shareable catalog + downloads) ─
export type PassPermission = SharePermission | "download";

/** Drop any private / non-shareable id; "download" is the one pass-only extra. */
export function sanitizePassPermissions(enabled: string[]): PassPermission[] {
  const out: PassPermission[] = [];
  for (const id of enabled) {
    if (id === "download" || isShareablePermission(id)) out.push(id as PassPermission);
  }
  return out;
}

// ── Secure tokens & one-time codes ──────────────────────────────
// The URL carries ONLY an opaque token. Identifiers, emails, phones, account
// ids, and permissions are NEVER placed in readable URL params. Tokens and
// codes are stored HASHED; the plaintext exists only in transit.
export function generatePassToken(): string {
  return randomBytes(24).toString("base64url"); // ~32 url-safe chars, ample entropy
}

export function hashToken(token: string): string {
  return createHash("sha256").update(`mmr-pass-token:${token}`).digest("hex");
}

/** 6-digit numeric one-time code (uniform, no modulo bias). */
export function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code: string, passId: string): string {
  return createHash("sha256").update(`mmr-pass-code:${passId}:${code}`).digest("hex");
}

/** Constant-ish comparison for hashed values. */
export function tokenMatches(candidateToken: string, storedHash: string): boolean {
  const h = hashToken(candidateToken);
  return h.length === storedHash.length && timingSafeEqualHex(h, storedHash);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Access duration ─────────────────────────────────────────────
export type AccessDurationPolicy =
  | { kind: "until_closed" }
  | { kind: "one_time" }
  | { kind: "days"; days: 1 | 3 | 7 | 30 }
  | { kind: "custom_date"; date: string } // ISO
  | { kind: "until_event" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Compute the concrete expiry (null = open until manually closed). */
export function computeExpiry(policy: AccessDurationPolicy, now: Date, eventEndsAt?: Date | null): Date | null {
  switch (policy.kind) {
    case "until_closed":
    case "one_time":
      return null;
    case "days":
      return new Date(now.getTime() + policy.days * DAY_MS);
    case "custom_date": {
      const d = new Date(policy.date);
      return isNaN(d.getTime()) ? null : d;
    }
    case "until_event":
      return eventEndsAt ?? null;
  }
}

// ── View limits ─────────────────────────────────────────────────
export type ViewLimitPolicy =
  | { kind: "unlimited" }
  | { kind: "one_view" }
  | { kind: "max_views"; max: number }
  | { kind: "max_sessions"; max: number };

/** Has the view/session allowance been exhausted? */
export function viewLimitReached(policy: ViewLimitPolicy, counts: { views: number; sessions: number }): boolean {
  switch (policy.kind) {
    case "unlimited": return false;
    case "one_view": return counts.views >= 1;
    case "max_views": return counts.views >= Math.max(1, policy.max);
    case "max_sessions": return counts.sessions >= Math.max(1, policy.max);
  }
}

// ── Status resolution (revocation checked on every request) ─────
export type OwnerPassState = "active" | "paused" | "closed" | "revoked";
export type EffectivePassStatus = "active" | "paused" | "closed" | "revoked" | "expired" | "used";

export interface PassRuntime {
  ownerState: OwnerPassState;
  expiresAt: Date | null;
  usedAt: Date | null;      // set once a one-view/limited pass is consumed
  views: number;
  sessions: number;
  viewLimit: ViewLimitPolicy;
}

/** Effective status now. Hard states win over derived ones. */
export function resolveStatus(rt: PassRuntime, now: Date): EffectivePassStatus {
  if (rt.ownerState === "revoked") return "revoked";
  if (rt.ownerState === "closed") return "closed";
  if (rt.ownerState === "paused") return "paused";
  if (rt.usedAt) return "used";
  if (rt.expiresAt && now > rt.expiresAt) return "expired";
  if (viewLimitReached(rt.viewLimit, { views: rt.views, sessions: rt.sessions })) return "used";
  return "active";
}

/** Content may open only when the pass is active AND the guest has verified. */
export function canOpenContent(rt: PassRuntime, now: Date, verified: boolean): boolean {
  return verified && resolveStatus(rt, now) === "active";
}

// One-view: the verification screen never counts; the view begins only when
// protected content opens successfully. A short grace period absorbs accidental
// refreshes / dropped connections before the pass is marked used.
export const ONE_VIEW_GRACE_MS = 3 * 60 * 1000;

export function oneViewSessionExpired(openedAt: Date, now: Date): boolean {
  return now.getTime() - openedAt.getTime() > ONE_VIEW_GRACE_MS;
}

// ── Verification (one-time code, rate-limited) ──────────────────
export const MAX_VERIFICATION_ATTEMPTS = 5;
export const CODE_TTL_MS = 10 * 60 * 1000;

export interface VerificationState {
  codeHash: string | null;
  codeExpiresAt: Date | null;
  attempts: number;
}

export type VerifyReason = "no_code" | "expired" | "locked" | "incorrect";
export type VerifyResult = { ok: true } | { ok: false; reason: VerifyReason };

/**
 * Check a submitted code. The caller increments `attempts` and records the
 * outcome; this function only decides. Locks out after MAX_VERIFICATION_ATTEMPTS.
 */
export function verifyCode(state: VerificationState, submitted: string, passId: string, now: Date): VerifyResult {
  if (!state.codeHash) return { ok: false, reason: "no_code" };
  if (state.attempts >= MAX_VERIFICATION_ATTEMPTS) return { ok: false, reason: "locked" };
  if (state.codeExpiresAt && now > state.codeExpiresAt) return { ok: false, reason: "expired" };
  const h = hashCode((submitted || "").trim(), passId);
  if (!timingSafeEqualHex(h, state.codeHash)) return { ok: false, reason: "incorrect" };
  return { ok: true };
}

// ── Device controls (secondary to email/phone verification) ─────
export type DevicePolicy =
  | { kind: "verify_every_visit" }            // highly sensitive: Verify Every Time
  | { kind: "this_browser_only" }
  | { kind: "remember_hours"; hours: number } // Quick Access
  | { kind: "until_expiration" };

export function hashDevice(fingerprint: string): string {
  return createHash("sha256").update(`mmr-pass-device:${fingerprint}`).digest("hex");
}

/**
 * Whether a returning device may skip re-verification. Device recognition is
 * NEVER the only control — a mismatch simply requires verifying again, it does
 * not grant access, and legitimate device changes fall back to verification.
 */
export function deviceAllowsReturn(
  policy: DevicePolicy,
  known: { deviceHash: string | null; verifiedAt: Date | null } | null,
  requestDeviceHash: string | null,
  now: Date,
): boolean {
  if (policy.kind === "verify_every_visit") return false;
  if (!known || !known.deviceHash || !requestDeviceHash) return false;
  if (known.deviceHash !== requestDeviceHash) return false;
  if (policy.kind === "remember_hours") {
    if (!known.verifiedAt) return false;
    return now.getTime() - known.verifiedAt.getTime() <= policy.hours * 60 * 60 * 1000;
  }
  return true; // this_browser_only / until_expiration
}

// ── Privacy Score™ ──────────────────────────────────────────────
export interface PassPrivacySettings {
  verificationRequired: boolean;
  downloadsEnabled: boolean;
  watermarkEnabled: boolean;
  limitedViewing: boolean;   // one-view / max-views / short window
  expirationEnabled: boolean;
  publicAccess: boolean;     // owner explicitly chose a public link
}

export type PrivacyScoreLevel = "green" | "yellow" | "red";

export interface PrivacyScoreResult {
  level: PrivacyScoreLevel;
  label: string;
  reasons: string[];
  warn: boolean; // true → show a warning before allowing (public access)
}

export function privacyScore(s: PassPrivacySettings): PrivacyScoreResult {
  if (s.publicAccess) {
    return { level: "red", label: "🔴 Public Access", warn: true, reasons: ["Anyone with the link may view."] };
  }
  const maxPrivacy =
    s.verificationRequired && !s.downloadsEnabled && s.watermarkEnabled && s.limitedViewing && s.expirationEnabled;
  if (maxPrivacy) {
    return {
      level: "green", label: "🟢 Maximum Privacy", warn: false,
      reasons: ["Recipient verification required", "Downloads disabled", "Recipient watermark enabled", "Limited viewing", "Expiration enabled"],
    };
  }
  return {
    level: "yellow", label: "🟡 Standard Privacy", warn: false,
    reasons: [
      s.verificationRequired ? "Recipient verification" : "No recipient verification",
      s.downloadsEnabled ? "Downloads allowed" : "Downloads disabled",
      s.expirationEnabled ? "Expiration enabled" : "No expiration",
    ],
  };
}

// ── Sharing acknowledgment (versioned) ──────────────────────────
export const SHARING_NOTICE_VERSION = "SHARING_NOTICE_V1";
export const RECIPIENT_AGREEMENT_VERSION = "RECIPIENT_AGREEMENT_V1";

export const SHARING_NOTICE = {
  title: "Private Sharing Notice",
  body:
    "At Magical Moments, protecting your memories is one of our highest priorities. Every Magical Access Pass gives you control over who may view your content, what they may access, how long they have access, whether downloads are allowed, and when access automatically expires.\n\n" +
    "While Magical Moments provides powerful privacy controls, no digital platform can completely prevent an authorized viewer from taking screenshots, screen recordings, photographs with another device, or otherwise capturing visible content after access has been granted.\n\n" +
    "Please share your Magical Moments only with people you know and trust. By continuing, you acknowledge that you understand these limitations. Magical Moments by Reign is not responsible for screenshots, recordings, photographs, or redistribution made by an authorized recipient after you have granted access.",
  requiredCheckbox: "I understand that an authorized viewer may still capture or share visible content, and I accept responsibility for choosing who receives access.",
  optionalCheckbox: "Don't show this notice again on this account.",
  primary: "I Understand — Continue Sharing",
  secondary: "Cancel",
} as const;

export const SHARING_SHORT_REMINDER =
  "Recipients may still capture visible content through screenshots, screen recording, or another device.";

export const OWNER_SHARE_REMINDER =
  "Your Magical Moments are private by default. You decide exactly who can experience them.";

export const SCREENSHOT_DISCLAIMER =
  "Magical Moments can restrict access, downloads, forwarding, and viewing duration. An authorized viewer may still be able to capture visible content using screenshots, screen recording, or another device.";

export const GUEST_NOTICE =
  "This content was shared privately with you. Please respect the owner's privacy and do not copy, record, or redistribute it without permission.";

export const RECIPIENT_AGREEMENT_TEXT =
  "I agree not to download, record, screenshot, copy, or redistribute this private content without the owner's permission.";

export interface AcknowledgmentRecord {
  version: string;
  acceptedAt: Date;
  dontShowAgain: boolean;
}

/**
 * Does the owner need to see the FULL notice before this share? Yes when there
 * is no acknowledgment, when they did not select "don't show again", or when the
 * accepted version no longer matches the current notice version.
 */
export function needsFullNotice(ack: AcknowledgmentRecord | null, currentVersion: string = SHARING_NOTICE_VERSION): boolean {
  if (!ack) return true;
  if (!ack.dontShowAgain) return true;
  return ack.version !== currentVersion;
}

// ── Failed / unauthorized access (reveal nothing) ───────────────
export const FAILED_ACCESS_MESSAGE = "This Magical Access Pass is private. Verification is required to continue.";
export const ALREADY_USED_MESSAGE = "This Magical Access Pass has already been viewed. Please contact the sender if you need access again.";
export const CLOSED_WHILE_VIEWING_MESSAGE = "This Magical Moment is no longer available through this pass.";

/** The ONLY thing an unauthorized/failed request may see — no titles, names, thumbnails, or details. */
export function failedAccessPayload(): { message: string } {
  return { message: FAILED_ACCESS_MESSAGE };
}

// ── Recipient watermark (labels only — never alters originals) ──
/** A personalized overlay label. Applied at view/download time; originals are untouched. */
export function watermarkLabel(recipient: Pick<Recipient, "name" | "channel" | "destination">): string {
  const who = recipient.name?.trim() || "a guest";
  return `Shared privately with ${who}\n${maskedDestination(recipient)}\nMagical Access Pass`;
}

// ── Audit events ────────────────────────────────────────────────
export const PASS_AUDIT_EVENTS = [
  "pass_created", "pass_sent", "verification_requested", "verification_succeeded",
  "verification_failed", "content_opened", "upload_submitted", "guestbook_signed",
  "download_completed", "permission_changed", "pass_paused", "pass_reopened",
  "pass_revoked", "pass_expired", "recipient_agreement_accepted",
] as const;
export type PassAuditEvent = (typeof PASS_AUDIT_EVENTS)[number];

// ── Premium creation copy ───────────────────────────────────────
export const CREATION_STEPS = [
  "Preparing your shared memories",
  "Applying your privacy settings",
  "Protecting your content",
  "Creating secure access",
  "Almost ready…",
] as const;

export const RECIPIENT_WELCOME = {
  title: "You've been invited to view a Magical Moment.",
  body: "This Magical Access Pass was privately shared with you. After verification, you'll be able to enjoy the memories selected by the sender.",
  cta: "Continue",
} as const;
