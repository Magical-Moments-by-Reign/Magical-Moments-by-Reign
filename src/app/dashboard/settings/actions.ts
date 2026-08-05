"use server";

// ── Account & Settings — server actions ─────────────────────────
// Saves the member's Magical Assistant name to THEIR profile only. Validated and
// profanity-filtered server-side (never trust the client). No notifications sent.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccount, requireOwner } from "@/lib/guard";
import { checkAssistantName, DEFAULT_ASSISTANT_NAME } from "@/lib/assistant-name";
import { getVoice, DEFAULT_VOICE } from "@/lib/voice/catalog";
import { writeOwnerVoiceConfig, writeOwnerElevenVoice } from "@/lib/voice/owner-config";

const PATH = "/dashboard/settings";
const VOICE_PATH = "/dashboard/settings/voice";

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

/** Persist the portable voice preferences to the member's profile so the
 *  assistant sounds the same across their devices. Includes the tier (free vs
 *  premium) and the selected Journey/Concierge voice ids. Voice ids are
 *  validated against the catalog — an unknown id falls back to the default. */
export async function updateVoicePrefsAction(prefs: {
  provider?: string; journeyVoice?: string; conciergeVoice?: string;
  gender?: string; style?: string; speed?: number; pitch?: number; volume?: number;
}): Promise<void> {
  const account = await requireAccount(PATH);
  const journeyVoice = prefs.journeyVoice && getVoice(prefs.journeyVoice) ? prefs.journeyVoice : DEFAULT_VOICE.journey;
  const conciergeVoice = prefs.conciergeVoice && getVoice(prefs.conciergeVoice) ? prefs.conciergeVoice : DEFAULT_VOICE.concierge;
  const clean = {
    provider: prefs.provider === "premium" ? "premium" : "free",
    journeyVoice, conciergeVoice,
    gender: prefs.gender === "male" ? "male" : "female",
    style: String(prefs.style || "warm").slice(0, 24),
    speed: Math.min(1.2, Math.max(0.7, Number(prefs.speed) || 0.96)),
    pitch: Math.min(1.3, Math.max(0.7, Number(prefs.pitch) || 1.03)),
    volume: Math.min(1, Math.max(0, Number(prefs.volume) ?? 1)),
  };
  // If the `voicePrefs` column isn't in this database yet, saving is a no-op —
  // voices still work per-device via localStorage. Never surface a 500.
  try {
    await prisma.account.update({ where: { id: account.id }, data: { voicePrefs: JSON.stringify(clean) } });
    revalidatePath(PATH);
  } catch { /* not migrated yet — device localStorage still carries the choice */ }
}

/** Owner-only: assign a real ElevenLabs voice id (from My Voices) to a persona. */
export async function updateOwnerElevenVoiceAction(persona: "journey" | "concierge", voiceId: string): Promise<void> {
  await requireOwner(VOICE_PATH);
  try {
    await writeOwnerElevenVoice(persona === "concierge" ? "concierge" : "journey", String(voiceId || ""));
    revalidatePath(VOICE_PATH);
  } catch { /* SystemConfig unavailable until the database is migrated */ }
}

/** Owner-only: set the house default voices and special-collection toggles. */
export async function updateOwnerVoiceDefaultsAction(patch: {
  defaultJourney?: string; defaultConcierge?: string;
  holiday?: boolean; seasonal?: boolean; collab?: boolean;
}): Promise<void> {
  await requireOwner(VOICE_PATH);
  // If SystemConfig isn't reachable/migrated, degrade quietly rather than 500.
  try {
    await writeOwnerVoiceConfig(patch);
    revalidatePath(VOICE_PATH);
  } catch { /* owner defaults unavailable until the database is migrated */ }
}

export async function resetAssistantNameAction(): Promise<void> {
  const account = await requireAccount(PATH);
  await prisma.account.update({ where: { id: account.id }, data: { assistantName: DEFAULT_ASSISTANT_NAME } });
  revalidatePath(PATH);
  redirect(`${PATH}?assistant=reset`);
}
