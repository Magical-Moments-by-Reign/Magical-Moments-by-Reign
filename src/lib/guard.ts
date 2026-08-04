// ── Route protection (server guards) ────────────────────────────
// Server-side authorization for protected pages and server actions. The
// middleware (src/middleware.ts) gives unauthenticated visitors a friendly
// redirect that preserves their destination, but REAL enforcement happens here:
// every guard re-validates the session against the database and checks the
// account's role server-side. We never rely on hidden buttons or browser checks.
//
// SERVER ONLY.

import { redirect } from "next/navigation";
import { currentAccount, type CurrentAccount } from "@/lib/auth-session";
import { isStaffRole, type PlatformRole } from "@/lib/roles";
import { canCreateOccasions } from "@/lib/membership-access";

/** Require a signed-in account, else redirect to login preserving the destination. */
export async function requireAccount(next?: string): Promise<CurrentAccount> {
  const account = await currentAccount();
  if (!account) {
    const q = next ? `?next=${encodeURIComponent(next)}` : "";
    redirect(`/login${q}`);
  }
  return account;
}

/**
 * Require one of the allowed roles (staff/admin always pass). Redirects to the
 * account home with a denied flag when the role isn't permitted — enforced on
 * the server, never by hiding a button.
 */
export async function requireRole(allowed: PlatformRole[], next?: string): Promise<CurrentAccount> {
  const account = await requireAccount(next);
  if (isStaffRole(account.role) || allowed.includes(account.role)) return account;
  redirect("/account?denied=1");
}

/**
 * Require a MEMBERSHIP that can create occasions / Life Estates. Free Forever is
 * a basic introduction and cannot — so a Free member is redirected to the
 * memberships page with the upgrade context, never silently allowed. This is the
 * backend half of the rule enforced in the Membership Builder UI; both call the
 * same canCreateOccasions() so they can never disagree.
 */
export async function requireOccasionAccess(next?: string): Promise<CurrentAccount> {
  const account = await requireAccount(next);
  if (!canCreateOccasions(account.membershipTier)) {
    redirect("/membership?locked=occasions");
  }
  return account;
}
