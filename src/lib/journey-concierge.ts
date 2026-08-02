// ── Magical AI — Journey Concierge content ──────────────────────
// The premium per-Journey concierge welcome card shown on each Journey
// Experience page. Baby is curated verbatim per the Founder's spec; other
// Journeys get a strong generic concierge derived from the catalog until
// each is curated. See STANDARD-journey-experience.md / STANDARD-magical-ai.md.

import { getExperienceType } from "@/lib/experience-types";
import { previewFor } from "@/lib/journey-preview";

export interface ConciergeItem { icon: string; text: string; }
export interface Concierge {
  label: string;      // small gold uppercase label
  heading: string;    // large heading
  intro: string;      // opening body copy
  helpIntro: string;  // "I'll help you:"
  items: ConciergeItem[];
  closing: string;
  cta: string;
  seed: string;       // starter prompt used when the chat opens
}

const LABEL = "Magical AI Journey Assistant";
const CTA = "✨ Start Planning My Journey";
const CLOSING =
  "Whenever you're ready, simply ask me a question or let me guide you to the next step in your journey.";
const HELP_INTRO = "I'll help you build:";

const CURATED: Record<string, Concierge> = {
  baby: {
    label: LABEL,
    heading: "Welcome to Your Baby Journey",
    intro:
      "Congratulations on your growing family! I'm here to guide you through every milestone—from the first heartbeat to your baby's first birthday and beyond.",
    helpIntro: HELP_INTRO,
    items: [
      { icon: "✨", text: "Plan your gender reveal and send invitations" },
      { icon: "👶", text: "Organize your baby shower and manage RSVPs" },
      { icon: "📅", text: "Remember doctor appointments and important milestones" },
      { icon: "🎒", text: "Keep your hospital bag checklist up to date" },
      { icon: "🚗", text: "Remind you to install the car seat before delivery" },
      { icon: "🍼", text: "Track baby's monthly milestones and photo reminders" },
      { icon: "📸", text: "Store photos, videos, ultrasound images, and keepsakes" },
      { icon: "💌", text: "Preserve every memory forever in your Magical Moments Library" },
    ],
    closing: CLOSING,
    cta: CTA,
    seed: "Help me start planning my Baby Journey.",
  },
};

/** Concierge content for a Journey type (curated where available, else generic). */
export function conciergeFor(typeId: string): Concierge | null {
  if (CURATED[typeId]) return CURATED[typeId];
  const t = getExperienceType(typeId);
  const p = previewFor(typeId);
  if (!t || !p) return null;
  return {
    label: LABEL,
    heading: `Welcome to Your ${t.label}`,
    intro: `${p.overview} I'm Magical AI — your personal concierge for this journey.`,
    helpIntro: HELP_INTRO,
    items: p.included.slice(0, 8).map((text) => ({ icon: "✨", text })),
    closing: CLOSING,
    cta: CTA,
    seed: `Help me start planning my ${t.label}.`,
  };
}
