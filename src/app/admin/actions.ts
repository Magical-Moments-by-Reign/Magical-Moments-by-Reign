"use server";

import { redirect } from "next/navigation";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";

export async function adminLoginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin/custom-websites");
  const ok = await signInAdmin(password);
  if (!ok) redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function adminLogoutAction(): Promise<void> {
  await signOutAdmin();
  redirect("/admin/login");
}
