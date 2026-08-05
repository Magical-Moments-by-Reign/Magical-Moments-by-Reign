// ── Voice catalog & tiers ───────────────────────────────────────
// The long-term voice architecture. Two PERSONAS (Journey = the member's
// assistant; Concierge = the service assistant), each with distinct
// PERSONALITIES, delivered on two TIERS:
//   • free    → browser speech synthesis (costs nothing)
//   • premium → cloud voices (ElevenLabs primary, OpenAI fallback) — nearly human
// Adding a voice = one entry in VOICES (+ its providerVoiceId). Holiday, seasonal,
// and future collaboration voices slot in the same way, no redesign.

import type { VoiceStyle } from "@/lib/assistant-prefs";

export type VoiceTier = "free" | "premium";
export type VoicePersona = "journey" | "concierge";
export type CloudProvider = "elevenlabs" | "openai";

export interface VoiceOption {
  id: string;                 // stable id, stored on the profile
  persona: VoicePersona;
  personality: string;        // "Warm", "Luxury Hotel Concierge", …
  tier: VoiceTier;
  provider: "browser" | CloudProvider;
  gender: "female" | "male";
  accent: string;             // "American", "British", …
  browserStyle?: VoiceStyle;  // free tier → maps to STYLE_PRESETS
  providerVoiceId?: string;   // premium → the cloud provider's voice id
  seasonal?: "holiday" | "seasonal" | "collab"; // special voices (owner-gated)
}

// Free (browser) voices — always available, no cost.
const FREE: VoiceOption[] = [
  { id: "journey-warm", persona: "journey", personality: "Warm", tier: "free", provider: "browser", gender: "female", accent: "American", browserStyle: "warm" },
  { id: "journey-friendly", persona: "journey", personality: "Friendly", tier: "free", provider: "browser", gender: "female", accent: "American", browserStyle: "friendly" },
  { id: "journey-elegant", persona: "journey", personality: "Elegant", tier: "free", provider: "browser", gender: "female", accent: "British", browserStyle: "elegant" },
  { id: "journey-professional", persona: "journey", personality: "Professional", tier: "free", provider: "browser", gender: "female", accent: "American", browserStyle: "professional" },
  { id: "journey-warm-m", persona: "journey", personality: "Warm", tier: "free", provider: "browser", gender: "male", accent: "American", browserStyle: "calm" },
  { id: "journey-professional-m", persona: "journey", personality: "Professional", tier: "free", provider: "browser", gender: "male", accent: "American", browserStyle: "professional" },
  { id: "concierge-hotel", persona: "concierge", personality: "Luxury Hotel Concierge", tier: "free", provider: "browser", gender: "male", accent: "British", browserStyle: "executive" },
  { id: "concierge-executive", persona: "concierge", personality: "Executive Assistant", tier: "free", provider: "browser", gender: "female", accent: "American", browserStyle: "professional" },
  { id: "concierge-travel", persona: "concierge", personality: "Travel Specialist", tier: "free", provider: "browser", gender: "female", accent: "American", browserStyle: "friendly" },
];

// Premium (cloud) voices — same personalities, near-human. providerVoiceId is a
// placeholder until the owner sets real ElevenLabs voice ids (env or SystemConfig).
const PREMIUM: VoiceOption[] = [
  { id: "journey-warm-hd", persona: "journey", personality: "Warm", tier: "premium", provider: "elevenlabs", gender: "female", accent: "American", providerVoiceId: "" },
  { id: "journey-elegant-hd", persona: "journey", personality: "Elegant", tier: "premium", provider: "elevenlabs", gender: "female", accent: "British", providerVoiceId: "" },
  { id: "journey-professional-hd", persona: "journey", personality: "Professional", tier: "premium", provider: "elevenlabs", gender: "female", accent: "American", providerVoiceId: "" },
  { id: "concierge-hotel-hd", persona: "concierge", personality: "Luxury Hotel Concierge", tier: "premium", provider: "elevenlabs", gender: "male", accent: "British", providerVoiceId: "" },
  { id: "concierge-executive-hd", persona: "concierge", personality: "Executive Assistant", tier: "premium", provider: "elevenlabs", gender: "female", accent: "American", providerVoiceId: "" },
  { id: "concierge-travel-hd", persona: "concierge", personality: "Travel Specialist", tier: "premium", provider: "elevenlabs", gender: "female", accent: "American", providerVoiceId: "" },
];

export const VOICES: VoiceOption[] = [...FREE, ...PREMIUM];

export function voicesFor(persona: VoicePersona, tier?: VoiceTier): VoiceOption[] {
  return VOICES.filter((v) => v.persona === persona && (!tier || v.tier === tier));
}
export function getVoice(id: string): VoiceOption | undefined { return VOICES.find((v) => v.id === id); }

export const DEFAULT_VOICE: Record<VoicePersona, string> = { journey: "journey-warm", concierge: "concierge-hotel" };

/** The best FREE voice for a persona given a gender + browser style — used to
 *  keep the quick Settings controls in sync with the catalog voice selection. */
export function freeVoiceForStyle(persona: VoicePersona, gender: "female" | "male", style: string): string {
  const list = voicesFor(persona, "free").filter((v) => v.gender === gender);
  return (list.find((v) => v.browserStyle === style) ?? list[0] ?? getVoice(DEFAULT_VOICE[persona]))?.id ?? DEFAULT_VOICE[persona];
}

/** Keep a selection inside a tier: return `current` if it already belongs to
 *  this persona + tier, otherwise the best default voice for that tier. */
export function tierVoiceId(persona: VoicePersona, tier: VoiceTier, current: string): string {
  const cur = getVoice(current);
  if (cur && cur.persona === persona && cur.tier === tier) return current;
  const inTier = voicesFor(persona, tier);
  const preferred = inTier.find((v) => v.id === DEFAULT_VOICE[persona]);
  return (preferred ?? inTier[0])?.id ?? DEFAULT_VOICE[persona];
}

export const PERSONA_LABEL: Record<VoicePersona, string> = { journey: "Journey (your Assistant)", concierge: "Concierge (service)" };

/** The preview line every voice reads before saving. */
export const VOICE_PREVIEW_LINE = "Hello, I'm Journey. Welcome back to Magical Moments. I'm here whenever you need me.";

/** Premium tier is usable only when a cloud key is configured (server-side). */
export function cloudConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY);
}
export function cloudPrimary(): CloudProvider | null {
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

/** A voice's status for the member: available now, upgrade-gated, or coming soon. */
export type VoiceAccess = "available" | "needs_membership" | "coming_soon";
export function voiceAccess(v: VoiceOption, opts: { paidMember: boolean; cloudReady: boolean }): VoiceAccess {
  if (v.tier === "free") return "available";
  if (!opts.cloudReady) return "coming_soon";       // premium not connected yet
  if (!opts.paidMember) return "needs_membership";  // connected, but member is Free
  return "available";
}
