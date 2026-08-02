"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function markReadAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  const id = String(formData.get("id") || "");
  const filter = String(formData.get("filter") || "");
  // Scope the update to THIS account so one member can't touch another's inbox.
  await prisma.notification.updateMany({ where: { id, accountId: account.id, readAt: null }, data: { readAt: new Date() } });
  redirect(`/notifications${filter ? `?filter=${filter}` : ""}`);
}

export async function markAllReadAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  const filter = String(formData.get("filter") || "");
  await prisma.notification.updateMany({ where: { accountId: account.id, readAt: null, archivedAt: null }, data: { readAt: new Date() } });
  redirect(`/notifications${filter ? `?filter=${filter}` : ""}`);
}

export async function archiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  const id = String(formData.get("id") || "");
  const filter = String(formData.get("filter") || "");
  await prisma.notification.updateMany({ where: { id, accountId: account.id, archivedAt: null }, data: { archivedAt: new Date(), readAt: new Date() } });
  redirect(`/notifications${filter ? `?filter=${filter}` : ""}`);
}
