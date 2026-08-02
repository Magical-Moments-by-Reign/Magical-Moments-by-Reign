"use client";

// Premium Magical AI concierge card for a Journey Experience page. The
// "Start Planning My Journey" button opens the floating Ask Magical chat
// (via a window event the AskMagical widget listens for) with a starter
// prompt for this Journey.

import type { Concierge } from "@/lib/journey-concierge";

export default function MagicalAIConcierge({ concierge }: { concierge: Concierge }) {
  function startPlanning() {
    window.dispatchEvent(new CustomEvent("mmr:ask-magical", { detail: { seed: concierge.seed } }));
  }

  return (
    <section className="mai" aria-label="Magical AI Journey Assistant">
      <span className="mai__label">{concierge.label}</span>
      <h2 className="mai__heading">{concierge.heading}</h2>
      <p className="mai__intro">{concierge.intro}</p>
      <p className="mai__help">{concierge.helpIntro}</p>
      <ul className="mai__list">
        {concierge.items.map((it, i) => (
          <li key={i}><span className="mai__icon" aria-hidden="true">{it.icon}</span><span>{it.text}</span></li>
        ))}
      </ul>
      <p className="mai__closing">{concierge.closing}</p>
      <button type="button" className="mai__cta" onClick={startPlanning}>{concierge.cta}</button>
    </section>
  );
}
