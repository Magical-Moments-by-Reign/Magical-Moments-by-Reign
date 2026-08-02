// ── Dashboard identity (server bridge) ──────────────────────────
// Resolves the signed-in Account to the legacy dashboard `User` it owns, so the
// existing dashboard (Experiences, media, gifts, domains, vault, social) keeps
// working while Account becomes the canonical identity. It:
//   • requires a real Account session (redirects to /login preserving ?next=),
//   • links exactly one User per Account (email-verified match, else create),
//   • backfills nullable accountId onto legacy records the first time,
//   • writes an audit-trail entry for the identity link,
//   • is idempotent (safe to call on every dashboard request).
//
// The legacy User model is PRESERVED — nothing is deleted. SERVER ONLY.

import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/guard";
import { canonicalEmail } from "@/lib/account-identity";
import { legacyRole, resolveBridge, shouldBackfill } from "@/lib/dashboard-bridge";
import type { PlatformRole } from "@/lib/roles";

export interface DashboardIdentity {
  accountId: string;
  userId: string; // the bridged legacy User id (what existing dashboard code uses)
  role: "ADMIN" | "USER";
}

/**
 * Get the current dashboard identity, creating/linking the legacy User bridge as
 * needed. Redirects unauthenticated visitors to /login?next=<dest>.
 */
export async function getDashboardIdentity(next = "/dashboard"): Promise<DashboardIdentity> {
  const account = await requireAccount(next);

  // Load link state + primary email + name/role.
  const acct = await prisma.account.findUnique({
    where: { id: account.id },
    select: {
      legacyUserId: true, firstName: true, lastName: true, platformRole: true,
      emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 },
    },
  });
  const role = legacyRole((acct?.platformRole as PlatformRole) ?? account.role);
  const primary = acct?.emails[0];
  const displayName = `${acct?.firstName ?? account.firstName} ${acct?.lastName ?? account.lastName}`.trim();

  // Find a legacy User by verified email match (only verified emails may link).
  let matchedUserId: string | null = null;
  if (!acct?.legacyUserId && primary?.verified && primary.email) {
    const existing = await prisma.user.findUnique({ where: { email: canonicalEmail(primary.email) }, select: { id: true } });
    matchedUserId = existing?.id ?? null;
  }

  const resolution = resolveBridge({ legacyUserId: acct?.legacyUserId, matchedUserId });

  let userId: string;
  if (resolution.mode === "existing_link") {
    userId = resolution.userId;
  } else if (resolution.mode === "email_match") {
    userId = resolution.userId;
    await linkAndBackfill(account.id, userId, /*backfill*/ true);
  } else {
    // Create a fresh legacy User for this Account (email is unique — never a dup).
    const email = primary?.email ? canonicalEmail(primary.email) : `account+${account.id}@accounts.magicalmomentsbyreign.com`;
    const created = await prisma.user.create({ data: { email, name: displayName || null, role } });
    userId = created.id;
    await linkAndBackfill(account.id, userId, /*backfill*/ false);
  }

  return { accountId: account.id, userId, role };
}

/** Persist the Account↔User link, backfill legacy records once, and audit it. */
async function linkAndBackfill(accountId: string, userId: string, backfill: boolean): Promise<void> {
  // Guard against a race / double-link: only set if still unset.
  await prisma.account.updateMany({ where: { id: accountId, legacyUserId: null }, data: { legacyUserId: userId } });

  if (backfill && shouldBackfill({ mode: "email_match", userId })) {
    // Stamp the canonical accountId onto legacy records that don't have one yet.
    await Promise.all([
      prisma.experience.updateMany({ where: { ownerId: userId, accountId: null }, data: { accountId } }),
      prisma.socialConnection.updateMany({ where: { userId, accountId: null }, data: { accountId } }),
      prisma.socialShare.updateMany({ where: { userId, accountId: null }, data: { accountId } }),
    ]);
  }

  await prisma.customerAuditLog.create({
    data: { accountId, actor: "system", action: "dashboard_identity_linked", detail: backfill ? "linked+backfilled legacy User" : "created legacy User bridge", newValue: userId },
  }).catch(() => {});
}
