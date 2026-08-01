"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createShareLink } from "@/lib/shares";

export async function createShareAction(formData: FormData): Promise<void> {
  const includeAll = formData.get("includeAll") === "on";
  const experienceIds = formData.getAll("experienceIds").map(String).filter(Boolean);
  const title = String(formData.get("title") || "").trim();

  if (!includeAll && experienceIds.length === 0) {
    redirect("/dashboard/shares?error=empty");
  }

  const expiresRaw = String(formData.get("expiresInDays") || "").trim();
  const maxViewsRaw = String(formData.get("maxViews") || "").trim();

  const link = await createShareLink({
    title: title || undefined,
    includeAll,
    experienceIds,
    password: String(formData.get("password") || "").trim() || undefined,
    expiresInDays: expiresRaw ? Math.max(1, parseInt(expiresRaw, 10)) : null,
    maxViews: maxViewsRaw ? Math.max(1, parseInt(maxViewsRaw, 10)) : null,
    allowDownload: formData.get("allowDownload") === "on",
    allowComments: formData.get("allowComments") === "on",
    allowGuestbook: formData.get("allowGuestbook") === "on",
    role: String(formData.get("role") || "guest"),
    now: new Date(),
  });

  revalidatePath("/dashboard/shares");
  redirect(`/dashboard/shares?created=${link.token}`);
}
