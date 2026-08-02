"use server";

import { redirect } from "next/navigation";
import { startPasswordReset } from "@/lib/auth-service";

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim();
  // Always attempt (no-op if unknown) and ALWAYS return the same generic result.
  if (email) await startPasswordReset(email);
  redirect("/forgot-password?sent=1");
}
