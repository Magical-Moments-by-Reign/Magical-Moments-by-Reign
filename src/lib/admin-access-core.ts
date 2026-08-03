// ── Admin access — pure decision core ───────────────────────────
// The server-side authorization decision for the admin surface, expressed as a
// pure function so every case is unit-tested. Grants admin access only to an
// active, email-verified Account that is either platformRole=admin or carries
// approved staffRoles — or, temporarily, via the legacy shared-password bridge.
// Fabricated role strings can never grant access (parseStaffRoles drops them).
//
// No I/O here; the DB/cookie gathering lives in src/lib/admin-access.ts.

import { parseStaffRoles, type AdminRole } from "@/lib/admin-roles";

// Admin sessions are shorter-lived than customer sessions: an mmr_session older
// than this can still browse customer areas but must re-authenticate for admin.
export const ADMIN_SESSION_MAX_HOURS = 8;

export type AdminVia = "account_roles" | "platform_admin" | "bootstrap_email" | "legacy_password";

export interface AdminAccessInput {
  accountFound: boolean;
  status?: string;                 // AccountStatus (default ACTIVE)
  emailVerified?: boolean;
  platformRole?: string;
  staffRolesJson?: string | null;
  sessionAgeHours?: number | null; // null when unknown/not applicable
  bootstrapMatch?: boolean;        // account email === ADMIN_OWNER_EMAIL
  legacyPasswordValid?: boolean;   // legacy ADMIN_PASSWORD cookie present/valid
}

export type AdminAccessResult =
  | { allowed: true; roles: AdminRole[]; via: AdminVia }
  | { allowed: false; reason: "no_account" | "not_admin" | "inactive" | "unverified" | "session_expired" };

export function adminAccess(i: AdminAccessInput): AdminAccessResult {
  if (i.accountFound) {
    let roles = parseStaffRoles(i.staffRolesJson);
    let via: AdminVia = "account_roles";
    if (roles.length === 0 && i.platformRole === "admin") { roles = ["owner"]; via = "platform_admin"; }
    if (roles.length === 0 && i.bootstrapMatch) { roles = ["owner"]; via = "bootstrap_email"; }

    if (roles.length > 0) {
      if ((i.status ?? "ACTIVE") !== "ACTIVE") return { allowed: false, reason: "inactive" };
      if (!i.emailVerified) return { allowed: false, reason: "unverified" };
      if (i.sessionAgeHours != null && i.sessionAgeHours > ADMIN_SESSION_MAX_HOURS) return { allowed: false, reason: "session_expired" };
      return { allowed: true, roles, via };
    }
    // A signed-in account that is NOT an admin: the legacy shared password may
    // still bridge access during the transition; otherwise it's a denied user.
    if (i.legacyPasswordValid) return { allowed: true, roles: ["owner"], via: "legacy_password" };
    return { allowed: false, reason: "not_admin" };
  }

  if (i.legacyPasswordValid) return { allowed: true, roles: ["owner"], via: "legacy_password" };
  return { allowed: false, reason: "no_account" };
}

// ── Owner bootstrap decision ────────────────────────────────────
export interface BootstrapInput { accountFound: boolean; emailVerified: boolean; ownerAlreadyExists: boolean }
export type BootstrapResult = { ok: true } | { ok: false; reason: "owner_exists" | "account_not_found" | "not_verified" };

/** Promote the first Owner only once, only for a real verified account. */
export function bootstrapDecision(i: BootstrapInput): BootstrapResult {
  if (i.ownerAlreadyExists) return { ok: false, reason: "owner_exists" };
  if (!i.accountFound) return { ok: false, reason: "account_not_found" };
  if (!i.emailVerified) return { ok: false, reason: "not_verified" };
  return { ok: true };
}
