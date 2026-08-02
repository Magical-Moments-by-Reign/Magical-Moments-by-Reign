"use server";

import { redirect } from "next/navigation";
import { attemptLogin, resendVerification } from "@/lib/auth-service";
import { createSessionForAccount } from "@/lib/auth-session";
import { safeRedirect } from "@/lib/auth-support";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeRedirect(String(formData.get("next") || ""), "/account");

  if (!email || !password) {
    redirect(`/login?error=invalid_credentials&next=${encodeURIComponent(next)}`);
  }

  const { outcome, accountId } = await attemptLogin(email, password);

  if (outcome.ok && accountId) {
    // Session rotation: a brand-new session is minted on every login.
    await createSessionForAccount(accountId);
    redirect(next);
  }

  // Preserve the (masked) email for the resend-verification convenience only.
  const params = new URLSearchParams({ error: outcome.code, next });
  if (outcome.code === "email_unverified") params.set("email", email);
  redirect(`/login?${params.toString()}`);
}

export async function resendVerificationAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  if (email) await resendVerification(email);
  // Generic response — never reveal whether the email exists.
  redirect("/login?resent=1");
}
