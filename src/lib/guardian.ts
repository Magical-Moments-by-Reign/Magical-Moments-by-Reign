// ── Parent / guardian approval for minors ───────────────────────
// Minor (teen/child) accounts cannot use the platform until a parent or
// guardian approves them. This is the PURE decision layer: it decides when a
// minor is usable, what a guardian may do, and the safe, restricted default
// permissions a minor starts with. It reuses the family-command permission set
// (no duplication) and the platform role model.
//
// Guardrails baked in: a minor is restricted by default, a guardian can view
// and set every permission, minors' notifications stay in-app only, and there
// is NEVER any location tracking or hidden monitoring — this module records
// approvals and permissions only.

import { randomBytes, createHash } from "node:crypto";
import { defaultPermissions, type PermissionSet, type PermissionKey } from "@/lib/family-command";
import { isChildRole, type PlatformRole } from "@/lib/roles";

export type GuardianApprovalStatus = "pending" | "approved" | "declined" | "expired";

export const GUARDIAN_APPROVAL_TTL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function newGuardianToken(): string {
  return randomBytes(24).toString("base64url");
}
export function hashGuardianToken(token: string): string {
  return createHash("sha256").update(`mmr-guardian:${token}`).digest("hex");
}
export function guardianApprovalExpiry(nowISO: string, days = GUARDIAN_APPROVAL_TTL_DAYS): string {
  return new Date(new Date(nowISO).getTime() + days * DAY_MS).toISOString();
}

/** Whether a role must go through guardian approval before it can be used. */
export function needsGuardianApproval(role: PlatformRole): boolean {
  return isChildRole(role); // teen + child
}

// ── Restricted default permissions for a minor ──────────────────
// Start from the family-command defaults for the exact role (teen vs child),
// which are already the safe, age-appropriate sets. A guardian expands from
// here; nothing is opened without a guardian's explicit choice.
export function minorDefaultPermissions(role: PlatformRole): PermissionSet {
  if (role === "child") return defaultPermissions("child");
  if (role === "teen") return defaultPermissions("teen");
  return defaultPermissions("child"); // safest fallback
}

// ── Approval gate ───────────────────────────────────────────────
export interface MinorAccessState {
  role: PlatformRole;
  approvalStatus: GuardianApprovalStatus | null; // null = no record yet
}
export type MinorAccessDecision =
  | { canUse: true }
  | { canUse: false; reason: "pending" | "declined" | "expired" | "missing" };

/** Can this minor use the platform right now? Adults always can (not our concern). */
export function minorAccessDecision(state: MinorAccessState): MinorAccessDecision {
  if (!needsGuardianApproval(state.role)) return { canUse: true };
  switch (state.approvalStatus) {
    case "approved": return { canUse: true };
    case "declined": return { canUse: false, reason: "declined" };
    case "expired": return { canUse: false, reason: "expired" };
    case "pending": return { canUse: false, reason: "pending" };
    default: return { canUse: false, reason: "missing" };
  }
}

// ── Guardian decision on a pending request ──────────────────────
export interface GuardianDecisionInput {
  status: GuardianApprovalStatus; // current record status
  expiresAtISO: string;
  nowISO: string;
  choice: "approve" | "decline";
}
export type GuardianDecisionResult =
  | { ok: true; newStatus: "approved" | "declined" }
  | { ok: false; reason: "already_decided" | "expired" };

/** Validate a guardian's approve/decline action against the record's state. */
export function applyGuardianDecision(i: GuardianDecisionInput): GuardianDecisionResult {
  if (i.status === "approved" || i.status === "declined") return { ok: false, reason: "already_decided" };
  if (i.status === "expired") return { ok: false, reason: "expired" };
  if (new Date(i.nowISO).getTime() > new Date(i.expiresAtISO).getTime()) return { ok: false, reason: "expired" };
  return { ok: true, newStatus: i.choice === "approve" ? "approved" : "declined" };
}

// ── What a guardian may control (for the parent dashboard) ──────
// A parent/guardian can view and set each of these for a minor. These are the
// family-command permission keys, surfaced with plain-language labels. There is
// deliberately NO "location" or "monitoring" control.
export const GUARDIAN_CONTROLLED_PERMISSIONS: { key: PermissionKey; label: string; help: string }[] = [
  { key: "view_calendar", label: "See the family calendar", help: "View shared family dates and Moments." },
  { key: "receive_reminders", label: "Receive reminders", help: "Get reminders for tasks and events." },
  { key: "view_celebrations", label: "See celebrations", help: "View family birthdays and celebrations." },
  { key: "send_messages", label: "Send messages", help: "Message other family members." },
  { key: "receive_messages", label: "Receive messages", help: "Receive messages from the family." },
  { key: "view_chores", label: "See chores", help: "View assigned chores." },
  { key: "mark_tasks_complete", label: "Complete tasks", help: "Mark tasks and chores done." },
  { key: "view_checklists", label: "See checklists", help: "View shared checklists." },
];

/** Suspend or revoke are separate from permissions — expose them explicitly. */
export const GUARDIAN_CONTROLS = [
  { id: "set_permissions", label: "Set permissions", help: "Choose exactly what your child can see and do." },
  { id: "suspend", label: "Temporarily pause", help: "Pause access without deleting anything." },
  { id: "revoke", label: "Remove access", help: "Remove the account's access to the family space." },
] as const;
