"use client";

// ── Owner voice defaults + ElevenLabs setup (client) ────────────
// Owner-only. Two parts:
//  1. House default voices (catalog) + special-collection toggles.
//  2. REAL ElevenLabs setup: load the account's own voices (proves the key works
//     and returns valid ids), assign one to Journey / Concierge, preview it with
//     a real cloud request, and switch the owner's own assistant to Premium.

import { useState } from "react";
import { voicesFor, type VoicePersona } from "@/lib/voice/catalog";
import { savePrefs, loadPrefs, portablePrefs } from "@/lib/assistant-prefs";
import { updateOwnerVoiceDefaultsAction, updateOwnerElevenVoiceAction, updateVoicePrefsAction } from "../actions";

interface Config { defaultJourney: string; defaultConcierge: string; holiday: boolean; seasonal: boolean; collab: boolean; }
interface ElevenVoice { voice_id: string; name: string; category?: string; gender?: string; accent?: string; }

export default function OwnerVoiceDefaults({ config, eleven, cloudReady }: { config: Config; eleven: { journey: string; concierge: string }; cloudReady: boolean }) {
  const [cfg, setCfg] = useState<Config>(config);
  const [saved, setSaved] = useState(false);

  // ElevenLabs setup state
  const [voices, setVoices] = useState<ElevenVoice[] | null>(null);
  const [loadState, setLoadState] = useState<{ kind: "idle" | "loading" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });
  const [assign, setAssign] = useState<{ journey: string; concierge: string }>({ journey: eleven.journey, concierge: eleven.concierge });
  const [preview, setPreview] = useState<string>("");

  function save(patch: Partial<Config>) {
    const next = { ...cfg, ...patch }; setCfg(next); setSaved(false);
    updateOwnerVoiceDefaultsAction(patch).then(() => setSaved(true)).catch(() => {});
  }

  const journeyOpts = [...voicesFor("journey", "free"), ...voicesFor("journey", "premium")];
  const conciergeOpts = [...voicesFor("concierge", "free"), ...voicesFor("concierge", "premium")];
  const label = (p: VoicePersona, id: string) => {
    const v = (p === "journey" ? journeyOpts : conciergeOpts).find((x) => x.id === id);
    return v ? `${v.personality} — ${v.gender === "male" ? "Male" : "Female"}, ${v.accent}${v.tier === "premium" ? " (Premium)" : ""}` : id;
  };

  async function loadVoices() {
    setLoadState({ kind: "loading", msg: "Contacting ElevenLabs…" });
    try {
      const res = await fetch("/api/voice/elevenlabs-voices");
      const data = await res.json();
      if (data.ok) { setVoices(data.voices || []); setLoadState({ kind: "ok", msg: `Connected — ${data.count} voice(s) in your ElevenLabs account.` }); }
      else if (data.configured === false) setLoadState({ kind: "err", msg: "ELEVENLABS_API_KEY is not set on this deployment." });
      else setLoadState({ kind: "err", msg: data.error || "ElevenLabs did not respond." });
    } catch { setLoadState({ kind: "err", msg: "Could not reach the voice service." }); }
  }

  function assignVoice(persona: "journey" | "concierge", voiceId: string) {
    setAssign((a) => ({ ...a, [persona]: voiceId }));
    updateOwnerElevenVoiceAction(persona, voiceId).catch(() => {});
  }

  // Preview the assigned voice through the REAL cloud route, reporting the provider.
  async function previewPersona(persona: "journey" | "concierge") {
    setPreview("Requesting a real cloud voice…");
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello, Tabitha. I'm Journey, your Magical Assistant.", persona, voiceId: persona === "concierge" ? "concierge-hotel-hd" : "journey-warm-hd" }),
      });
      if (res.ok) {
        const provider = res.headers.get("X-Voice-Provider");
        const vid = res.headers.get("X-Voice-Id");
        const blob = await res.blob(); const url = URL.createObjectURL(blob); const el = new Audio(url); el.onended = () => URL.revokeObjectURL(url); await el.play().catch(() => {});
        setPreview(`Playing — provider: ${provider === "elevenlabs" ? "ElevenLabs" : provider === "openai" ? "OpenAI (fallback)" : provider}${vid ? `, voice ${vid}` : ""}.`);
      } else {
        const d = await res.json().catch(() => ({}));
        setPreview(d.detail ? `Failed — ElevenLabs ${d.detail}. ${d.elevenStatus ? `(status ${d.elevenStatus})` : ""}` : (d.error || "Voice service unavailable."));
      }
    } catch { setPreview("Could not reach the voice service."); }
  }

  // Switch the OWNER's own assistant to Premium so the live Journey button uses
  // the assigned ElevenLabs voice immediately (owner is billing-exempt/eligible).
  function useForJourneyNow() {
    const next = savePrefs({ ...loadPrefs(), provider: "premium", journeyVoice: "journey-warm-hd" });
    updateVoicePrefsAction(portablePrefs(next)).catch(() => {});
    setPreview("Journey is now set to Premium (ElevenLabs) on this device. Turn Journey on to hear it.");
  }

  return (
    <section className="card vst__card vst__owner">
      <h3 className="vst__h">Owner controls — house voices</h3>
      <p className="note">These set the default voices new members hear and which special collections are available.</p>

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
      {saved && <p className="note vst__ok">Saved.</p>}

      {/* ── Real ElevenLabs voice setup ── */}
      <h3 className="vst__h" style={{ marginTop: "1.4rem" }}>ElevenLabs voice setup</h3>
      <p className="note">
        {cloudReady ? "Load the voices in your ElevenLabs account, assign one to Journey and Concierge, and preview it. Assigning a real voice id here overrides the built-in default." : "Add ELEVENLABS_API_KEY in Netlify to enable this."}
      </p>
      <div className="pg-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={loadVoices} disabled={loadState.kind === "loading"}>
          {loadState.kind === "loading" ? "Loading…" : "Load my ElevenLabs voices"}
        </button>
      </div>
      {loadState.kind !== "idle" && loadState.kind !== "loading" && (
        <p className={`vst-status__result vst-status__result--${loadState.kind === "ok" ? "ok" : "fail"}`}>{loadState.msg}</p>
      )}

      {voices && voices.length > 0 && (
        <div className="vst-grid2" style={{ marginTop: ".8rem" }}>
          <label className="vs-field"><span>Assign to Journey (Premium Female Default)</span>
            <select value={assign.journey} onChange={(e) => assignVoice("journey", e.target.value)}>
              <option value="">— built-in default —</option>
              {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name}{v.gender ? ` · ${v.gender}` : ""}{v.accent ? ` · ${v.accent}` : ""} ({v.voice_id.slice(0, 8)}…)</option>)}
            </select>
          </label>
          <label className="vs-field"><span>Assign to Concierge</span>
            <select value={assign.concierge} onChange={(e) => assignVoice("concierge", e.target.value)}>
              <option value="">— built-in default —</option>
              {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name}{v.gender ? ` · ${v.gender}` : ""}{v.accent ? ` · ${v.accent}` : ""} ({v.voice_id.slice(0, 8)}…)</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="pg-actions" style={{ marginTop: ".6rem" }}>
        <button type="button" className="btn btn--gold btn--sm" onClick={() => previewPersona("journey")} disabled={!cloudReady}>▶ Preview Journey voice</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => previewPersona("concierge")} disabled={!cloudReady}>▶ Preview Concierge voice</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={useForJourneyNow}>Use ElevenLabs for my Journey now</button>
      </div>
      {preview && <p className="vst-status__result vst-status__result--ok" style={{ marginTop: ".6rem" }}>{preview}</p>}

      <p className="note" style={{ marginTop: ".6rem" }}>Currently assigned — Journey: <b>{assign.journey || "built-in default"}</b> · Concierge: <b>{assign.concierge || "built-in default"}</b></p>
    </section>
  );
}
