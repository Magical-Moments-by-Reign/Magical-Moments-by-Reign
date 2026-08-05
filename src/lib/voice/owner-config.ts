// ── Owner voice defaults (server) ───────────────────────────────
// The owner sets the house voices — the default Journey voice and the default
// Concierge voice every member starts with — plus toggles for special voice
// collections (holiday, seasonal, future collaborations). Stored in SystemConfig
// (key/value) so no schema change is needed to add another toggle later.

import { prisma } from "@/lib/db";
import { DEFAULT_VOICE, getVoice } from "./catalog";

export interface OwnerVoiceConfig {
  defaultJourney: string;   // voice id
  defaultConcierge: string; // voice id
  holiday: boolean;         // seasonal holiday voices available
  seasonal: boolean;        // seasonal collection available
  collab: boolean;          // special collaboration voices available
}

const K = {
  journey: "voice.default.journey",
  concierge: "voice.default.concierge",
  holiday: "voice.special.holiday",
  seasonal: "voice.special.seasonal",
  collab: "voice.special.collab",
} as const;

// Real ElevenLabs voice ids the owner assigns from their own account (My Voices).
// These override the catalog's built-in ids at request time, per persona.
const EK = {
  journey: "voice.eleven.journey",
  concierge: "voice.eleven.concierge",
} as const;

/** The owner-assigned ElevenLabs voice ids (empty string = not set). */
export async function readOwnerElevenVoices(): Promise<{ journey: string; concierge: string }> {
  try {
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: Object.values(EK) } } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return { journey: map.get(EK.journey) || "", concierge: map.get(EK.concierge) || "" };
  } catch {
    return { journey: "", concierge: "" };
  }
}

/** Owner-only: assign a real ElevenLabs voice id to a persona. */
export async function writeOwnerElevenVoice(persona: "journey" | "concierge", voiceId: string): Promise<void> {
  const key = persona === "concierge" ? EK.concierge : EK.journey;
  const clean = String(voiceId || "").trim().slice(0, 64);
  await prisma.systemConfig.upsert({ where: { key }, update: { value: clean }, create: { key, value: clean } });
}

export const OWNER_VOICE_DEFAULT: OwnerVoiceConfig = {
  defaultJourney: DEFAULT_VOICE.journey,
  defaultConcierge: DEFAULT_VOICE.concierge,
  holiday: false, seasonal: false, collab: false,
};

export async function readOwnerVoiceConfig(): Promise<OwnerVoiceConfig> {
  try {
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: Object.values(K) } } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const jv = map.get(K.journey);
    const cv = map.get(K.concierge);
    return {
      defaultJourney: jv && getVoice(jv) ? jv : OWNER_VOICE_DEFAULT.defaultJourney,
      defaultConcierge: cv && getVoice(cv) ? cv : OWNER_VOICE_DEFAULT.defaultConcierge,
      holiday: map.get(K.holiday) === "on",
      seasonal: map.get(K.seasonal) === "on",
      collab: map.get(K.collab) === "on",
    };
  } catch {
    return { ...OWNER_VOICE_DEFAULT };
  }
}

async function put(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function writeOwnerVoiceConfig(patch: Partial<OwnerVoiceConfig>): Promise<void> {
  if (patch.defaultJourney && getVoice(patch.defaultJourney)) await put(K.journey, patch.defaultJourney);
  if (patch.defaultConcierge && getVoice(patch.defaultConcierge)) await put(K.concierge, patch.defaultConcierge);
  if (typeof patch.holiday === "boolean") await put(K.holiday, patch.holiday ? "on" : "off");
  if (typeof patch.seasonal === "boolean") await put(K.seasonal, patch.seasonal ? "on" : "off");
  if (typeof patch.collab === "boolean") await put(K.collab, patch.collab ? "on" : "off");
}
