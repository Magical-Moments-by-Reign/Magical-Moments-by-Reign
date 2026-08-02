"use server";

import { redirect } from "next/navigation";
import { completePasswordReset } from "@/lib/auth-service";

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token) redirect("/reset-password?error=invalid");
  if (password !== confirm) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);

  const result = await completePasswordReset(token, password);
  if (result.ok) redirect("/login?reset=1");

  redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${result.reason}`);
}
