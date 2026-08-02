// ── Secure invitations ──────────────────────────────────────────
// One shared invitation mechanism for the whole platform: invite family members
// (incl. minors via a guardian), guests to a Magical Moment, vendors, and
// collaborators. Tokens are cryptographically random and stored HASHED; the URL
// carries only the opaque token. Targets (email/phone) are shown masked until
// accepted. Reuses account-identity masking and the platform role model.

import { randomBytes, createHash } from "node:crypto";
import { maskEmail, maskPhone, canonicalEmail, normalizePhone } from "@/lib/account-identity";
import { requiresGuardian, type PlatformRole } from "@/lib/roles";

export type InviteKind = "family_member" | "guest" | "vendor" | "collaborator";
export const INVITE_TTL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(`mmr-invite:${token}`).digest("hex");
}
export function inviteExpiry(nowISO: string, days = INVITE_TTL_DAYS): string {
  return new Date(new Date(nowISO).getTime() + days * DAY_MS).toISOString();
}

// ── Build an invitation (returns the record shape + the raw token to send) ──
export interface InviteInput {
  kind: InviteKind;
  role: PlatformRole;
  inviterAccountId: string;
  channel: "email" | "phone";
  target: string;            // email or phone (stored normalized, shown masked)
  familyId?: string;
  experienceId?: string;
  vendorId?: string;
  nowISO: string;
}

export interface InvitationRecord {
  kind: InviteKind;
  role: PlatformRole;
  inviterAccountId: string;
  tokenHash: string;
  targetNormalized: string;  // for matching the accepter (never displayed)
  targetMasked: string;      // shown on the invite screen
  familyId: string | null;
  experienceId: string | null;
  vendorId: string | null;
  guardianRequired: boolean; // true when inviting a minor
  status: "pending";
  expiresAt: string;
}

export function buildInvitation(i: InviteInput): { record: InvitationRecord; token: string } {
  const token = newInviteToken();
  const normalized = i.channel === "email" ? canonicalEmail(i.target) : normalizePhone(i.target);
  const masked = i.channel === "email" ? maskEmail(i.target) : maskPhone(i.target);
  return {
    token,
    record: {
      kind: i.kind, role: i.role, inviterAccountId: i.inviterAccountId,
      tokenHash: hashInviteToken(token), targetNormalized: normalized, targetMasked: masked,
      familyId: i.familyId ?? null, experienceId: i.experienceId ?? null, vendorId: i.vendorId ?? null,
      guardianRequired: requiresGuardian(i.role),
      status: "pending", expiresAt: inviteExpiry(i.nowISO),
    },
  };
}

// ── Accept decision ─────────────────────────────────────────────
export interface InviteState {
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  guardianRequired: boolean;
}
export interface AcceptContext {
  nowISO: string;
  guardianAccountId?: string; // required when guardianRequired
}
export type AcceptDecision =
  | { ok: true; role: PlatformRole }
  | { ok: false; reason: "revoked" | "expired" | "already_accepted" | "guardian_required" };

/** Whether an invitation may be accepted right now (assigning its role). */
export function acceptInvitation(state: InviteState, role: PlatformRole, ctx: AcceptContext): AcceptDecision {
  if (state.status === "revoked") return { ok: false, reason: "revoked" };
  if (state.status === "accepted") return { ok: false, reason: "already_accepted" };
  if (new Date(ctx.nowISO).getTime() > new Date(state.expiresAt).getTime()) return { ok: false, reason: "expired" };
  if (state.guardianRequired && !ctx.guardianAccountId) return { ok: false, reason: "guardian_required" };
  return { ok: true, role };
}

/** Confirm the accepter matches the invited contact (normalized). */
export function targetMatches(invitedNormalized: string, submittedChannel: "email" | "phone", submitted: string): boolean {
  const norm = submittedChannel === "email" ? canonicalEmail(submitted) : normalizePhone(submitted);
  return !!norm && norm === invitedNormalized;
}
