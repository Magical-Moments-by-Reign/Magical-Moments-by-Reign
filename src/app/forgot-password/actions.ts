"use server";

import { redirect } from "next/navigation";
import { startPasswordReset } from "@/lib/auth-service";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  const ip = await clientIp();
  // Rate-limit reset requests; ALWAYS return the same generic result (no leak).
  const rl = await checkRateLimit("password_reset", { ip, email });
  if (email && !rl.limited) {
    await recordAttempt("password_reset", { ip, email });
    await startPasswordReset(email);
  }
  redirect("/forgot-password?sent=1");
}
