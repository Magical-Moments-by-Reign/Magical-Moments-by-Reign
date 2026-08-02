// ── Login (server) ──────────────────────────────────────────────
// Verifies credentials and resolves the account-status-aware outcome. Rate
// limiting now lives in the durable limiter (src/lib/rate-limit.ts), applied by
// the login action where the client IP is available — so this module is a pure
// credential + status check with no in-memory state. SERVER ONLY.

import { verifyPassword } from "@/lib/auth";
import { loginOutcome, type LoginOutcome, type AccountStatusLike } from "@/lib/auth-support";
import { isChildRole, type PlatformRole } from "@/lib/roles";
import { accountByEmail } from "@/lib/auth-shared";

export interface LoginAttempt { outcome: LoginOutcome; accountId?: string }

/**
 * Verify an email/password and resolve the outcome. `locked` is passed in by the
 * caller (the action consults the durable rate limiter first). Missing account
 * and wrong password are indistinguishable — no account-enumeration leak.
 */
export async function attemptLogin(email: string, password: string, locked = false): Promise<LoginAttempt> {
  if (locked) {
    return { outcome: loginOutcome({ accountFound: false, passwordOk: false, status: "ACTIVE", emailVerified: false, guardianPending: false, locked: true }) };
  }

  const account = await accountByEmail(email);
  const passwordOk = !!account?.passwordHash && verifyPassword(password, account.passwordHash);

  const minor = account ? isChildRole(account.platformRole as PlatformRole) : false;
  const guardianStatus = account?.guardianApprovals[0]?.status;
  const guardianPending = minor && guardianStatus !== "approved";
  const emailVerified = account?.emails[0]?.verified ?? false;

  const outcome = loginOutcome({
    accountFound: !!account,
    passwordOk,
    status: (account?.status as AccountStatusLike) ?? "ACTIVE",
    emailVerified,
    guardianPending,
  });

  if (outcome.ok && account) {
    // Best-effort audit; never blocks login.
    const { prisma } = await import("@/lib/db");
    await prisma.customerAuditLog.create({ data: { accountId: account.id, actor: "system", action: "login" } }).catch(() => {});
    return { outcome, accountId: account.id };
  }
  return { outcome };
}
