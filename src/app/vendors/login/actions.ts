"use server";

import { redirect } from "next/navigation";
import { attemptLogin } from "@/lib/auth-service";
import { createSessionForAccount, currentAccount } from "@/lib/auth-session";
import { safeRedirect } from "@/lib/auth-support";
import { isStaffRole } from "@/lib/roles";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";

// Vendors sign in with the SAME Account + mmr_session foundation as everyone
// else — this is a role-scoped entry point, not a second login system.
export async function vendorLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeRedirect(String(formData.get("next") || ""), "/vendors/dashboard");

  if (!email || !password) redirect(`/vendors/login?error=invalid_credentials&next=${encodeURIComponent(next)}`);

  const ip = await clientIp();
  const rl = await checkRateLimit("login", { ip, email });
  const { outcome, accountId } = await attemptLogin(email, password, rl.limited);

  if (outcome.ok && accountId) {
    // Confirm this account is actually a vendor (or staff) before granting a
    // vendor session destination — role is enforced server-side, never trusted
    // from the client.
    await createSessionForAccount(accountId);
    const acct = await currentAccount();
    if (acct && (acct.role === "vendor" || isStaffRole(acct.role))) redirect(next);
    redirect("/account?notice=not_a_vendor");
  }

  if (outcome.code === "invalid_credentials") await recordAttempt("login", { ip, email });
  const params = new URLSearchParams({ error: outcome.code, next });
  if (outcome.code === "email_unverified") params.set("email", email);
  redirect(`/vendors/login?${params.toString()}`);
}
