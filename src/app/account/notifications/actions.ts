"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { NOTIFICATION_TYPES } from "@/lib/notifications";
import { isChildRole } from "@/lib/roles";

export async function savePreferencesAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  const minor = isChildRole(account.role);

  for (const t of NOTIFICATION_TYPES) {
    // In-app is always on (the source of truth). Minors are in-app only.
    const email = !minor && formData.get(`email_${t.id}`) === "on";
    const channels = { in_app: true, email, sms: false, push: false };
    await prisma.notificationPreference.upsert({
      where: { accountId_type: { accountId: account.id, type: t.id } },
      update: { channels: JSON.stringify(channels) },
      create: { accountId: account.id, type: t.id, channels: JSON.stringify(channels) },
    });
  }
  redirect("/account/notifications?saved=1");
}
