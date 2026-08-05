"use client";

// ── Owner voice defaults (client) ───────────────────────────────
// Owner-only house controls: the default Journey voice and default Concierge
// voice every member starts with, plus toggles for special voice collections
// (holiday, seasonal, future collaborations). Saved to SystemConfig via a
// server action guarded by requireOwner.

import { useState } from "react";
import { voicesFor, type VoicePersona } from "@/lib/voice/catalog";
import { updateOwnerVoiceDefaultsAction } from "../actions";

interface Config {
  defaultJourney: string; defaultConcierge: string;
  holiday: boolean; seasonal: boolean; collab: boolean;
}

export default function OwnerVoiceDefaults({ config }: { config: Config }) {
  const [cfg, setCfg] = useState<Config>(config);
  const [saved, setSaved] = useState(false);

  function save(patch: Partial<Config>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    setSaved(false);
    updateOwnerVoiceDefaultsAction(patch).then(() => setSaved(true)).catch(() => {});
  }

  const journeyOpts = [...voicesFor("journey", "free"), ...voicesFor("journey", "premium")];
  const conciergeOpts = [...voicesFor("concierge", "free"), ...voicesFor("concierge", "premium")];

  const label = (p: VoicePersona, id: string) => {
    const v = (p === "journey" ? journeyOpts : conciergeOpts).find((x) => x.id === id);
    return v ? `${v.personality} — ${v.gender === "male" ? "Male" : "Female"}, ${v.accent}${v.tier === "premium" ? " (Premium)" : ""}` : id;
  };

  return (
    <section className="card vst__card vst__owner">
      <h3 className="vst__h">Owner controls — house voices</h3>
      <p className="note">These set the default voices new members hear and which special collections are available. Members can still choose their own voice.</p>

      <div className="vst-grid2">
        <label className="vs-field"><span>Default Journey voice</span>
          <select value={cfg.defaultJourney} onChange={(e) => save({ defaultJourney: e.target.value })}>
            {journeyOpts.map((v) => <option key={v.id} value={v.id}>{label("journey", v.id)}</option>)}
          </select>
        </label>
        <label className="vs-field"><span>Default Concierge voice</span>
          <select value={cfg.defaultConcierge} onChange={(e) => save({ defaultConcierge: e.target.value })}>
            {conciergeOpts.map((v) => <option key={v.id} value={v.id}>{label("concierge", v.id)}</option>)}
          </select>
        </label>
      </div>

      <div className="vst-toggles">
        {([
          ["holiday", "Holiday voices", "Seasonal holiday voice collection"],
          ["seasonal", "Seasonal voices", "Rotating seasonal voice collection"],
          ["collab", "Collaboration voices", "Special guest / signature voices"],
        ] as [keyof Config, string, string][]).map(([k, t, s]) => (
          <label key={k} className="vst-toggle">
            <input type="checkbox" checked={Boolean(cfg[k])} onChange={(e) => save({ [k]: e.target.checked } as Partial<Config>)} />
            <span><b>{t}</b><br /><span className="note">{s}</span></span>
          </label>
        ))}
      </div>

      <p className="note">Special collections are prepared in the architecture and appear as <b>Coming soon</b> until their voices are added — no redesign needed.</p>
      {saved && <p className="note vst__ok">Saved.</p>}
    </section>
  );
}
