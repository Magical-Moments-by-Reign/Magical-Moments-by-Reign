// ── Admin access (server) ───────────────────────────────────────
// Account-based, role-scoped admin authorization on the SAME Account +
// mmr_session foundation (no second identity, no second cookie). Gathers the
// account's roles/status/verification + session age + the legacy-password
// bridge, then defers the decision to the pure core (admin-access-core.ts).
//
// Owner bootstrap uses ADMIN_OWNER_EMAIL (never hard-coded). The legacy shared
// ADMIN_PASSWORD remains a documented bridge until the first Owner is confirmed.
//
// SERVER ONLY.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentAccount, type CurrentAccount } from "@/lib/auth-session";
import { isAdmin as legacyPasswordAdmin } from "@/lib/admin-auth";
import { canonicalEmail } from "@/lib/account-identity";
import { hasCapability, type AdminRole, type AdminCapability } from "@/lib/admin-roles";
import { adminAccess, bootstrapDecision, ADMIN_SESSION_MAX_HOURS, type AdminAccessResult, type AdminVia } from "@/lib/admin-access-core";

export { ADMIN_SESSION_MAX_HOURS };
// High-risk actions should re-authenticate + MFA before enabling in production
// (documented seam — not yet enforced, never shown as active).
export const REAUTH_REQUIRED_FOR: AdminCapability[] = ["security.manage", "finance.manage", "vendors.manage"];

export interface AdminContext {
  account: CurrentAccount | null; // null only via the legacy password bridge
  roles: AdminRole[];
  via: AdminVia;
  actor: string; // for audit logs
}

function ownerEmail(): string | null {
  const e = process.env.ADMIN_OWNER_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL;
  return e ? canonicalEmail(e) : null;
}

async function resolveAdmin(): Promise<{ account: CurrentAccount | null; access: AdminAccessResult }> {
  const account = await currentAccount();
  const legacyPasswordValid = await legacyPasswordAdmin();

  if (!account) return { account: null, access: adminAccess({ accountFound: false, legacyPasswordValid }) };

  const row = await prisma.account.findUnique({
    where: { id: account.id },
    select: { staffRoles: true, status: true, platformRole: true, emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 } },
  });
  const primary = row?.emails[0];
  const oe = ownerEmail();
  const bootstrapMatch = !!(oe && primary?.verified && primary.email && canonicalEmail(primary.email) === oe);

  let sessionAgeHours: number | null = null;
  try {
    const s = await prisma.session.findUnique({ where: { id: account.sessionId }, select: { createdAt: true } });
    if (s) sessionAgeHours = (Date.now() - s.createdAt.getTime()) / 3_600_000;
  } catch { /* age unknown — core treats null as not-expired */ }

  const access = adminAccess({
    accountFound: true,
    status: row?.status ?? account.status,
    emailVerified: primary?.verified ?? false,
    platformRole: row?.platformRole ?? account.role,
    staffRolesJson: row?.staffRoles ?? "[]",
    sessionAgeHours,
    bootstrapMatch,
    legacyPasswordValid,
  });
  return { account, access };
}

/** Current admin context, or null if not an admin. */
export async function currentAdmin(): Promise<AdminContext | null> {
  const { account, access } = await resolveAdmin();
  if (!access.allowed) return null;
  return { account, roles: access.roles, via: access.via, actor: account?.customerId ?? "legacy_admin" };
}

/**
 * Require an admin (optionally with a capability). Unauthenticated → login;
 * authenticated-but-not-permitted → a professional Access Denied page (never
 * bounced into the admin area). All checks are server-side.
 */
export async function requireAdmin(capability?: AdminCapability, next = "/admin"): Promise<AdminContext> {
  const { account, access } = await resolveAdmin();
  if (!access.allowed) {
    if (access.reason === "no_account") redirect(`/admin/login?next=${encodeURIComponent(next)}`);
    if (access.reason === "session_expired") redirect(`/admin/login?next=${encodeURIComponent(next)}&reason=session`);
    redirect(`/admin/denied?reason=${access.reason}`);
  }
  if (capability && !hasCapability(access.roles, capability)) redirect("/admin/denied?reason=capability");
  return { account, roles: access.roles, via: access.via, actor: account?.customerId ?? "legacy_admin" };
}

// ── Owner bootstrap (used by the protected script scripts/bootstrap-owner.mjs) ──
export async function ownerExists(): Promise<boolean> {
  const n = await prisma.account.count({ where: { staffRoles: { contains: "\"owner\"" } } });
  return n > 0;
}

export type BootstrapOutcome = { ok: true; accountId: string } | { ok: false; reason: "owner_exists" | "account_not_found" | "not_verified" | "no_owner_email" };

/** Promote the ADMIN_OWNER_EMAIL account to Owner — once only. */
export async function bootstrapOwner(): Promise<BootstrapOutcome> {
  const oe = ownerEmail();
  if (!oe) return { ok: false, reason: "no_owner_email" };

  const email = await prisma.customerEmail.findFirst({ where: { canonical: oe }, select: { accountId: true, verified: true } });
  const decision = bootstrapDecision({
    accountFound: !!email, emailVerified: !!email?.verified, ownerAlreadyExists: await ownerExists(),
  });
  if (!decision.ok) return { ok: false, reason: decision.reason };

  const accountId = email!.accountId;
  await prisma.$transaction([
    prisma.account.update({ where: { id: accountId }, data: { staffRoles: JSON.stringify(["owner"]), platformRole: "admin" } }),
    prisma.customerAuditLog.create({ data: { accountId, actor: "system", action: "admin_owner_bootstrapped", detail: "via ADMIN_OWNER_EMAIL" } }),
  ]);
  return { ok: true, accountId };
}
