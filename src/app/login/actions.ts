"use server";

import { redirect } from "next/navigation";
import { attemptLogin, resendVerification } from "@/lib/auth-service";
import { createSessionForAccount } from "@/lib/auth-session";
import { safeRedirect } from "@/lib/auth-support";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeRedirect(String(formData.get("next") || ""), "/account");

  if (!email || !password) {
    redirect(`/login?error=invalid_credentials&next=${encodeURIComponent(next)}`);
  }

  // Durable, shared rate limit (per IP + hashed email). Fails open if unavailable.
  const ip = await clientIp();
  const rl = await checkRateLimit("login", { ip, email });
  const { outcome, accountId } = await attemptLogin(email, password, rl.limited);

  if (outcome.ok && accountId) {
    await createSessionForAccount(accountId); // session rotation on every login
    redirect(next);
  }

  // Only wrong credentials count toward the lockout (not "unverified", etc.).
  if (outcome.code === "invalid_credentials") await recordAttempt("login", { ip, email });

  const params = new URLSearchParams({ error: outcome.code, next });
  if (outcome.code === "email_unverified") params.set("email", email);
  redirect(`/login?${params.toString()}`);
}

export async function resendVerificationAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  const ip = await clientIp();
  // Rate-limit resend requests.
  const rl = await checkRateLimit("verify_resend", { ip, email });
  if (email && !rl.limited) {
    await recordAttempt("verify_resend", { ip, email });
    const result = await resendVerification(email);
    // Don't claim success if the provider actually rejected the message.
    if (!result.ok) redirect(`/login?resent=failed&email=${encodeURIComponent(email)}`);
  }
  redirect("/login?resent=1");
}
