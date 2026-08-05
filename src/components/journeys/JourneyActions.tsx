"use client";

// ── Journey area actions ────────────────────────────────────────
// The idea-first action row for a selected area. Ask Magical and Ask Concierge
// are LIVE (they open the assistants with the area already in context). Save,
// Favorite, Add to Idea Board, Inspiration Gallery, Start Planning, and Create
// are honestly labelled Coming Soon until their data models are connected — the
// buttons never pretend to do something they can't yet.

import { useState } from "react";
import { AREA_ACTIONS } from "@/lib/journeys/worlds";

export default function JourneyActions({ worldLabel, areaLabel }: { worldLabel: string; areaLabel: string }) {
  const [toast, setToast] = useState<string>("");

  function askMagical() {
    window.dispatchEvent(new CustomEvent("mmr:open-magical", { detail: { seed: `I'm exploring ${areaLabel} in my ${worldLabel} Journey. Can you share a few ideas to get me inspired?` } }));
  }
  function askConcierge() {
    window.dispatchEvent(new CustomEvent("mmr:open-concierge", { detail: { seed: `I'd love help planning ${areaLabel} for my ${worldLabel} Journey.` } }));
  }

  return (
    <div className="jw-actions">
      <div className="jw-actions__row">
        {AREA_ACTIONS.filter((x) => x.id !== "explore").map((act) => {
          if (act.kind === "magical") return <button key={act.id} type="button" className="jw-act jw-act--gold" onClick={askMagical}>{act.label}</button>;
          if (act.kind === "concierge") return <button key={act.id} type="button" className="jw-act jw-act--gold" onClick={askConcierge}>{act.label}</button>;
          return (
            <button key={act.id} type="button" className="jw-act" onClick={() => setToast(`${act.label} is coming soon — we're building it with the same care as everything else.`)}>
              {act.label}<span className="jw-act__soon">Soon</span>
            </button>
          );
        })}
      </div>
      {toast && <p className="jw-toast" role="status">{toast}</p>}
    </div>
  );
}
