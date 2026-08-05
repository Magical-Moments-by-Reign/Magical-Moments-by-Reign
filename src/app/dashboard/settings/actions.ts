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

/** Persist the portable voice preferences (gender/style/speed/pitch/volume) to
 *  the member's profile so the assistant sounds the same across their devices. */
export async function updateVoicePrefsAction(prefs: {
  gender?: string; style?: string; speed?: number; pitch?: number; volume?: number;
}): Promise<void> {
  const account = await requireAccount(PATH);
  const clean = {
    gender: prefs.gender === "male" ? "male" : "female",
    style: String(prefs.style || "warm").slice(0, 24),
    speed: Math.min(1.2, Math.max(0.7, Number(prefs.speed) || 0.96)),
    pitch: Math.min(1.3, Math.max(0.7, Number(prefs.pitch) || 1.03)),
    volume: Math.min(1, Math.max(0, Number(prefs.volume) ?? 1)),
  };
  await prisma.account.update({ where: { id: account.id }, data: { voicePrefs: JSON.stringify(clean) } });
  revalidatePath(PATH);
}

export async function resetAssistantNameAction(): Promise<void> {
  const account = await requireAccount(PATH);
  await prisma.account.update({ where: { id: account.id }, data: { assistantName: DEFAULT_ASSISTANT_NAME } });
  revalidatePath(PATH);
  redirect(`${PATH}?assistant=reset`);
}
