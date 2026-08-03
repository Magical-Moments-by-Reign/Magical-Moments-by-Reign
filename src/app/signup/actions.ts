"use server";

import { redirect } from "next/navigation";
import { registerAccount, PUBLIC_SIGNUP_ROLES } from "@/lib/auth-service";
import { safeRedirect } from "@/lib/auth-support";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";
import type { PlatformRole } from "@/lib/roles";

export async function signupAction(formData: FormData): Promise<void> {
  const next = safeRedirect(String(formData.get("next") || ""), "/home");
  const role = String(formData.get("role") || "") as PlatformRole;
  const back = (code: string) =>
    redirect(`/signup?error=${code}&next=${encodeURIComponent(next)}${role ? `&role=${role}` : ""}`);

  // Throttle mass account-creation per IP.
  const ip = await clientIp();
  const rl = await checkRateLimit("account_create", { ip });
  if (rl.limited) back("rate_limited");
  await recordAttempt("account_create", { ip });

  if (!PUBLIC_SIGNUP_ROLES.includes(role)) back("role_not_allowed");

  const result = await registerAccount({
    role,
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    password: String(formData.get("password") || ""),
    guardianEmail: String(formData.get("guardianEmail") || "").trim() || undefined,
    dateOfBirth: String(formData.get("dateOfBirth") || "").trim() || undefined,
    acceptedTerms: formData.get("acceptedTerms") === "on",
    address: {
      line1: String(formData.get("line1") || "").trim(),
      line2: String(formData.get("line2") || "").trim() || undefined,
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      postal: String(formData.get("postal") || "").trim(),
      country: String(formData.get("country") || "US").trim(),
    },
  });

  if (result.ok) {
    // Adults verify by email; if delivery failed, say so honestly rather than
    // telling them to "check your email" for a message that never sent.
    const mailFailed = !result.minor && !result.emailSent;
    redirect(`/signup?done=${result.minor ? "minor" : "adult"}${mailFailed ? "&mail=failed" : ""}`);
  }

  switch (result.reason) {
    case "missing_fields": back("missing_fields"); break;
    case "weak_password": back("weak_password"); break;
    case "recover_existing": redirect("/signup?recover=1"); break;
    case "guardian_email_required": back("guardian_email_required"); break;
    case "role_not_allowed": back("role_not_allowed"); break;
    default: back("unknown");
  }
}
