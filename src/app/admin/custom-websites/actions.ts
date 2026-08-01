"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { acceptCustomWebsiteRequest, setCustomWebsiteStatus } from "@/lib/custom-website";
import { prisma } from "@/lib/db";

async function guard() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/custom-websites");
}

export async function acceptRequestAction(formData: FormData): Promise<void> {
  await guard();
  const id = String(formData.get("id") || "");
  const jotformUrl = String(formData.get("jotformUrl") || "").trim() || undefined;
  if (id) await acceptCustomWebsiteRequest(id, jotformUrl);
  revalidatePath("/admin/custom-websites");
}

export async function setStatusAction(formData: FormData): Promise<void> {
  await guard();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (id && status) await setCustomWebsiteStatus(id, status);
  revalidatePath("/admin/custom-websites");
}

export async function saveNotesAction(formData: FormData): Promise<void> {
  await guard();
  const id = String(formData.get("id") || "");
  const notes = String(formData.get("notes") || "");
  if (id) await prisma.customWebsiteRequest.update({ where: { id }, data: { notes } });
  revalidatePath("/admin/custom-websites");
}
