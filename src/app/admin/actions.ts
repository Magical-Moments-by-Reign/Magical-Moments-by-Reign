"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import { attemptLogin } from "@/lib/auth-service";
import { createSessionForAccount, endCurrentSession, currentAccount } from "@/lib/auth-session";
import { currentAdmin } from "@/lib/admin-access";
import { safeRedirect } from "@/lib/auth-support";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";

// ── Account-based admin login (preferred path) ──────────────────
export async function adminAccountLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeRedirect(String(formData.get("next") || ""), "/admin");
  if (!email || !password) redirect(`/admin/login?error=invalid_credentials&next=${encodeURIComponent(next)}`);

  const ip = await clientIp();
  const rl = await checkRateLimit("login", { ip, email });
  const { outcome, accountId } = await attemptLogin(email, password, rl.limited);

  if (outcome.ok && accountId) {
    await createSessionForAccount(accountId); // session rotation on login
    const admin = await currentAdmin();
    if (admin) {
      await prisma.customerAuditLog.create({ data: { accountId, actor: accountId, action: "admin_login", detail: admin.via } }).catch(() => {});
      redirect(next);
    }
    // Valid account, but not an admin — do NOT grant admin; leave them signed in.
    await prisma.customerAuditLog.create({ data: { accountId, actor: accountId, action: "admin_login_denied", detail: "not_admin" } }).catch(() => {});
    redirect(`/admin/login?error=not_admin&next=${encodeURIComponent(next)}`);
  }

  if (outcome.code === "invalid_credentials") {
    await recordAttempt("login", { ip, email });
    console.warn("[admin] failed admin login attempt"); // audited without PII
  }
  const params = new URLSearchParams({ error: outcome.code, next });
  if (outcome.code === "email_unverified") params.set("email", email);
  redirect(`/admin/login?${params.toString()}`);
}

// ── Legacy shared-password login (temporary bridge) ─────────────
export async function adminLoginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") || "");
  const next = safeRedirect(String(formData.get("next") || ""), "/admin");
  const ok = await signInAdmin(password);
  if (!ok) redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  console.warn("[admin] legacy ADMIN_PASSWORD bridge used"); // audited bridge usage
  redirect(next);
}

export async function adminLogoutAction(): Promise<void> {
  // Clear both the account session and the legacy admin cookie.
  const acct = await currentAccount();
  if (acct) await prisma.customerAuditLog.create({ data: { accountId: acct.id, actor: acct.customerId, action: "admin_logout" } }).catch(() => {});
  await endCurrentSession();
  await signOutAdmin();
  redirect("/admin/login");
}
