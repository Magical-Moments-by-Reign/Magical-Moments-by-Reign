"use client";

// ── Voice bootstrap ─────────────────────────────────────────────
// Runs once when the dashboard mounts. It makes the live assistants use the
// right voices before anyone speaks:
//   • If the member has SAVED a voice (their profile carries a selection), that
//     choice is hydrated into this device — portable across devices.
//   • If they HAVE NOT chosen, the owner's house default Journey/Concierge voices
//     are seeded — without overwriting any other local preference.
// It never overwrites a member's saved selection when the owner later changes the
// platform default: a saved profile always wins.

import { useEffect } from "react";
import { loadPrefs, savePrefs, hydrateFromProfile } from "@/lib/assistant-prefs";
import { getVoice } from "@/lib/voice/catalog";

export default function VoiceBootstrap({
  memberPrefs, ownerJourney, ownerConcierge,
}: { memberPrefs: string; ownerJourney: string; ownerConcierge: string }) {
  useEffect(() => {
    let chosen = false;
    try {
      const p = memberPrefs ? JSON.parse(memberPrefs) : null;
      chosen = Boolean(p && typeof p === "object" && (p.journeyVoice || p.conciergeVoice || p.provider));
    } catch { chosen = false; }

    if (chosen) {
      hydrateFromProfile(memberPrefs); // the member's own choice, synced to this device
      return;
    }
    // No member selection → apply the owner's house defaults (only the voice ids),
    // leaving any other local settings untouched.
    const local = loadPrefs();
    const patch: Record<string, string> = {};
    if (getVoice(ownerJourney) && local.journeyVoice !== ownerJourney) patch.journeyVoice = ownerJourney;
    if (getVoice(ownerConcierge) && local.conciergeVoice !== ownerConcierge) patch.conciergeVoice = ownerConcierge;
    if (Object.keys(patch).length) savePrefs(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
