// ── Admin access (server) ───────────────────────────────────────
// Account-based, role-scoped admin authorization built on the SAME Account +
// mmr_session foundation (no second login/cookie/user table). During the
// transition it also honors the legacy shared ADMIN_PASSWORD gate so current
// admin access never breaks — that legacy path is treated as an Owner and is
// meant to be retired once a real Owner account exists.
//
// Owner bootstrap: the account whose VERIFIED primary email equals
// ADMIN_BOOTSTRAP_EMAIL is treated as Owner (and can be persisted via
// bootstrapOwner()), so the first Owner can be established without a shared
// password.
//
// SERVER ONLY.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentAccount, type CurrentAccount } from "@/lib/auth-session";
import { isAdmin as legacyPasswordAdmin } from "@/lib/admin-auth";
import { canonicalEmail } from "@/lib/account-identity";
import { parseStaffRoles, hasCapability, type AdminRole, type AdminCapability } from "@/lib/admin-roles";

// Shorter admin sessions than customer sessions are expected; enforced when the
// admin session layer lands. Documented here as the intended policy.
export const ADMIN_SESSION_MAX_HOURS = 8;
// High-risk actions (role changes, removals, finance) should re-authenticate.
// Seam: wire a reauth challenge + MFA before enabling those in production.
export const REAUTH_REQUIRED_FOR: AdminCapability[] = ["security.manage", "finance.manage", "vendors.manage"];

export interface AdminContext {
  account: CurrentAccount | null; // null only for the legacy password bridge
  roles: AdminRole[];
  via: "account_roles" | "bootstrap_email" | "legacy_password";
  /** actor string for audit logs. */
  actor: string;
}

function bootstrapEmail(): string | null {
  const e = process.env.ADMIN_BOOTSTRAP_EMAIL;
  return e ? canonicalEmail(e) : null;
}

/**
 * Resolve the current admin, or null if not an admin. Order: account staffRoles,
 * then the bootstrap-email Owner bridge, then the legacy password bridge.
 */
export async function currentAdmin(): Promise<AdminContext | null> {
  const account = await currentAccount();

  if (account) {
    const row = await prisma.account.findUnique({
      where: { id: account.id },
      select: { staffRoles: true, emails: { where: { isPrimary: true, verified: true }, select: { email: true }, take: 1 } },
    });
    const roles = parseStaffRoles(row?.staffRoles);
    if (roles.length > 0) {
      return { account, roles, via: "account_roles", actor: account.customerId };
    }
    const be = bootstrapEmail();
    const primary = row?.emails[0]?.email;
    if (be && primary && canonicalEmail(primary) === be) {
      return { account, roles: ["owner"], via: "bootstrap_email", actor: account.customerId };
    }
  }

  // Legacy transition: the shared ADMIN_PASSWORD cookie → treat as Owner.
  if (await legacyPasswordAdmin()) {
    return { account, roles: ["owner"], via: "legacy_password", actor: account?.customerId ?? "legacy_admin" };
  }
  return null;
}

/**
 * Require an admin (optionally with a specific capability). Redirects to the
 * admin login when not an admin, or back to /admin with a denied flag when the
 * capability is missing. Enforcement is server-side; roles are never trusted
 * from the client.
 */
export async function requireAdmin(capability?: AdminCapability, next = "/admin"): Promise<AdminContext> {
  const admin = await currentAdmin();
  if (!admin) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (capability && !hasCapability(admin.roles, capability)) redirect("/admin?denied=1");
  return admin;
}

/**
 * Persist Owner on an account — the documented bootstrap. Only permitted for the
 * bootstrap-email account or an existing legacy-password admin, so it can't be
 * used to self-escalate. Retire the ADMIN_PASSWORD once an Owner exists.
 */
export async function bootstrapOwner(accountId: string): Promise<{ ok: boolean; reason?: string }> {
  const admin = await currentAdmin();
  const via = admin?.via;
  if (via !== "legacy_password" && via !== "bootstrap_email") {
    return { ok: false, reason: "not_authorized" };
  }
  await prisma.account.update({ where: { id: accountId }, data: { staffRoles: JSON.stringify(["owner"]) } });
  await prisma.customerAuditLog.create({
    data: { accountId, actor: admin?.actor ?? "system", action: "admin_owner_bootstrapped", detail: `via ${via}` },
  }).catch(() => {});
  return { ok: true };
}
