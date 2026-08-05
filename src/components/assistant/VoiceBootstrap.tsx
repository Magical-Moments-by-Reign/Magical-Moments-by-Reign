"use client";

// ── Voice bootstrap ─────────────────────────────────────────────
// Runs once when the dashboard mounts and resolves the member's voice state.
//
// Priority (highest wins):
//   1. forcePremium — the OWNER has real ElevenLabs voices assigned in
//      SystemConfig, so premium is the durable truth and can NEVER be reverted
//      to the browser tier by a stale profile.
//   2. the member's SAVED profile choice (portable across devices).
//   3. the owner's house default voices — only when nothing was ever chosen.
// It never downgrades a premium selection back to the browser tier.

import { useEffect } from "react";
import { loadPrefs, savePrefs, hydrateFromProfile } from "@/lib/assistant-prefs";
import { getVoice } from "@/lib/voice/catalog";
import { enableCloud } from "@/lib/voice/speech";

export default function VoiceBootstrap({
  memberPrefs, ownerJourney, ownerConcierge, forcePremium = false,
}: { memberPrefs: string; ownerJourney: string; ownerConcierge: string; forcePremium?: boolean }) {
  useEffect(() => {
    // 1) Owner with ElevenLabs voices assigned → premium is non-negotiable.
    if (forcePremium) {
      const merged = hydrateFromProfile(memberPrefs); // apply saved prefs first…
      // …then guarantee premium + a premium-tier persona voice id so the live
      // assistant routes to ElevenLabs. The real voice id is resolved server-side
      // from the owner's SystemConfig assignment.
      savePrefs({
        provider: "premium",
        journeyVoice: /-hd$/.test(merged.journeyVoice) ? merged.journeyVoice : "journey-warm-hd",
        conciergeVoice: /-hd$/.test(merged.conciergeVoice) ? merged.conciergeVoice : "concierge-hotel-hd",
      });
      enableCloud(); // clear any stale session cloud-disable
      return;
    }

    let chosen = false;
    try {
      const p = memberPrefs ? JSON.parse(memberPrefs) : null;
      chosen = Boolean(p && typeof p === "object" && (p.journeyVoice || p.conciergeVoice || p.provider));
    } catch { chosen = false; }

    if (chosen) {
      hydrateFromProfile(memberPrefs); // the member's own choice, synced to this device
      return;
    }
    // No member selection → seed the owner's house defaults (voice ids only),
    // leaving any other local setting untouched.
    const local = loadPrefs();
    const patch: Record<string, string> = {};
    if (getVoice(ownerJourney) && local.journeyVoice !== ownerJourney) patch.journeyVoice = ownerJourney;
    if (getVoice(ownerConcierge) && local.conciergeVoice !== ownerConcierge) patch.conciergeVoice = ownerConcierge;
    if (Object.keys(patch).length) savePrefs(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
