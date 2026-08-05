"use server";

// ── Account & Settings — server actions ─────────────────────────
// Saves the member's Magical Assistant name to THEIR profile only. Validated and
// profanity-filtered server-side (never trust the client). No notifications sent.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/guard";
import { checkAssistantName, DEFAULT_ASSISTANT_NAME } from "@/lib/assistant-name";

const PATH = "/dashboard/settings";

export async function updateAssistantNameAction(formData: FormData): Promise<void> {
  const account = await requireAccount(PATH);
  const raw = String(formData.get("assistantName") || "");
  const res = checkAssistantName(raw);
  if (!res.ok) {
    redirect(`${PATH}?assistant=invalid`);
  }
  await prisma.account.update({ where: { id: account.id }, data: { assistantName: res.name } });
  revalidatePath(PATH);
  redirect(`${PATH}?assistant=saved`);
}

export async function resetAssistantNameAction(): Promise<void> {
  const account = await requireAccount(PATH);
  await prisma.account.update({ where: { id: account.id }, data: { assistantName: DEFAULT_ASSISTANT_NAME } });
  revalidatePath(PATH);
  redirect(`${PATH}?assistant=reset`);
}
