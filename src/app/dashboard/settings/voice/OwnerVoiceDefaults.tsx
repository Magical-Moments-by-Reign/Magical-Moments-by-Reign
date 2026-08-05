"use client";

// ── Owner ElevenLabs Voice Manager (client) ─────────────────────
// Owner-only. Loads the REAL voices from the owner's ElevenLabs account, lets the
// owner preview each one (real cloud audio), and assign them to the Journey
// female / Journey male / Concierge defaults. Assignments persist server-side
// (SystemConfig) and wire straight into the live assistants via /api/voice/tts.
// The actual provider used is always shown — a browser/OpenAI fallback is never
// dressed up as ElevenLabs.

import { useState } from "react";
import { voicesFor, type VoicePersona } from "@/lib/voice/catalog";
import { savePrefs, loadPrefs, portablePrefs } from "@/lib/assistant-prefs";
import { enableCloud } from "@/lib/voice/speech";
import { updateOwnerVoiceDefaultsAction, updateOwnerElevenVoiceAction, updateVoicePrefsAction } from "../actions";

interface Config { defaultJourney: string; defaultConcierge: string; holiday: boolean; seasonal: boolean; collab: boolean; }
interface Eleven { journeyFemale: string; journeyMale: string; concierge: string; journeyAlt: string; conciergeAlt: string; }
interface ElevenVoice { voice_id: string; name: string; category?: string; gender?: string; accent?: string; }

const PREVIEW_LINE = "Hello, Tabitha. I'm Journey, your Magical Assistant. I'm here whenever you need me.";
type Slot = "journeyFemale" | "journeyMale" | "concierge";

export default function OwnerVoiceDefaults({ config, eleven, cloudReady }: { config: Config; eleven: Eleven; cloudReady: boolean }) {
  const [cfg, setCfg] = useState<Config>(config);
  const [saved, setSaved] = useState(false);
  const [voices, setVoices] = useState<ElevenVoice[] | null>(null);
  const [loadState, setLoadState] = useState<{ kind: "idle" | "loading" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });
  const [assign, setAssign] = useState<Eleven>(eleven);
  const [result, setResult] = useState<{ kind: "" | "ok" | "browser" | "fail"; msg: string }>({ kind: "", msg: "" });
  const [previewing, setPreviewing] = useState<string>("");

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
  const nameOf = (id: string) => voices?.find((v) => v.voice_id === id)?.name || (id ? `${id.slice(0, 10)}…` : "built-in default");

  function keyNote(k: any): string {
    if (!k) return "";
    const flags = [
      k.trimmedWhitespace ? "had surrounding whitespace" : "",
      k.strippedQuotes ? "had wrapping quotes" : "",
      k.hasInternalWhitespace ? "contains an internal space/newline (INVALID)" : "",
    ].filter(Boolean);
    return ` [key: length ${k.length}, prefix "${k.prefix}"${flags.length ? `, ${flags.join(", ")}` : ""}]`;
  }

  async function fetchVoices(): Promise<ElevenVoice[] | null> {
    setLoadState({ kind: "loading", msg: "Contacting ElevenLabs…" });
    try {
      const res = await fetch("/api/voice/elevenlabs-voices");
      const data = await res.json();
      if (data.ok) { setVoices(data.voices || []); setLoadState({ kind: "ok", msg: `Connected — ${data.count} voice(s) in your ElevenLabs account.${keyNote(data.key)}` }); return data.voices || []; }
      if (data.configured === false) setLoadState({ kind: "err", msg: `ELEVENLABS_API_KEY is not set on this deployment.${keyNote(data.key)}` });
      else if (data.status === 401) setLoadState({ kind: "err", msg: `ElevenLabs rejected the key (401 — invalid key or permission).${keyNote(data.key)} If the length looks wrong or it flags whitespace/quotes, re-paste the key in Netlify without quotes or trailing spaces.` });
      else setLoadState({ kind: "err", msg: `${data.error || "ElevenLabs did not respond."}${keyNote(data.key)}` });
      return null;
    } catch { setLoadState({ kind: "err", msg: "Could not reach the voice service." }); return null; }
  }
  function loadVoices() { fetchVoices(); }

  // Best-effort gender from the ElevenLabs label, else a name heuristic.
  function inferGender(v: ElevenVoice): "female" | "male" {
    const g = (v.gender || "").toLowerCase();
    if (g.includes("female")) return "female";
    if (g.includes("male")) return "male";
    return /\b(brittney|hope|sarah|rachel|bella|elli|charlotte|lily|nova|emma|ava|grace|sophie|olivia|female|woman)\b/i.test(v.name) ? "female" : "male";
  }

  // One click: assign a female + male Journey voice and a distinct Concierge
  // voice from the real account, save them, and switch the owner to Premium.
  async function autoAssign() {
    setResult({ kind: "", msg: "Assigning your ElevenLabs voices…" });
    const list = voices ?? (await fetchVoices());
    if (!list || !list.length) { setResult({ kind: "fail", msg: "Load your ElevenLabs voices first." }); return; }
    const tagged = list.map((v) => ({ v, g: inferGender(v) }));
    const females = tagged.filter((x) => x.g === "female").map((x) => x.v);
    const males = tagged.filter((x) => x.g === "male").map((x) => x.v);
    const jf = females[0]?.voice_id || list[0].voice_id;
    const jm = males[0]?.voice_id || list.find((v) => v.voice_id !== jf)?.voice_id || jf;
    const con = (females[1] || males.find((m) => m.voice_id !== jm) || list.find((v) => v.voice_id !== jf && v.voice_id !== jm))?.voice_id || jf;
    setAssign((a) => ({ ...a, journeyFemale: jf, journeyMale: jm, concierge: con }));
    try {
      await Promise.all([
        updateOwnerElevenVoiceAction("journeyFemale", jf),
        updateOwnerElevenVoiceAction("journeyMale", jm),
        updateOwnerElevenVoiceAction("concierge", con),
      ]);
    } catch { /* saved best-effort */ }
    enablePremiumForOwner();
    setResult({ kind: "ok", msg: `Assigned — Journey ♀: ${nameOf(jf)} · Journey ♂: ${nameOf(jm)} · Concierge: ${nameOf(con)}. Journey is now Premium — press Test or turn Journey on to hear it.` });
  }

  // Turn the OWNER's own assistant to Premium (ElevenLabs) so the live Journey
  // uses the cloud voice, and clear any stale session cloud-disable.
  function enablePremiumForOwner() {
    enableCloud();
    const next = savePrefs({ ...loadPrefs(), provider: "premium", journeyVoice: "journey-warm-hd" });
    updateVoicePrefsAction(portablePrefs(next)).catch(() => {});
  }

  function assignSlot(slot: Slot, voiceId: string) {
    setAssign((a) => ({ ...a, [slot]: voiceId }));
    updateOwnerElevenVoiceAction(slot, voiceId).catch(() => {});
    enablePremiumForOwner(); // assigning a voice implies you want to use it live
  }

  // Preview a specific voice by its raw id (owner privilege on the route).
  async function previewVoiceId(voiceId: string) {
    setPreviewing(voiceId); setResult({ kind: "", msg: "" });
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: PREVIEW_LINE, persona: "journey", elevenVoiceId: voiceId }),
      });
      await reportAndPlay(res, voiceId);
    } catch { setResult({ kind: "fail", msg: "Could not reach the voice service." }); }
    finally { setPreviewing(""); }
  }

  // The formal "Test ElevenLabs Voice" — full report (provider/name/id/model/status/bytes).
  async function testElevenLabs() {
    setPreviewing("test"); setResult({ kind: "", msg: "Requesting a real ElevenLabs voice…" });
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: PREVIEW_LINE, persona: "journey", voiceId: "journey-warm-hd" }),
      });
      await reportAndPlay(res, assign.journeyFemale);
    } catch { setResult({ kind: "fail", msg: "Could not reach the voice service." }); }
    finally { setPreviewing(""); }
  }

  async function reportAndPlay(res: Response, expectedId: string) {
    if (res.ok) {
      const provider = res.headers.get("X-Voice-Provider") || "cloud";
      const model = res.headers.get("X-Voice-Model") || "";
      const vid = res.headers.get("X-Voice-Id") || expectedId;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob); const el = new Audio(url); el.onended = () => URL.revokeObjectURL(url); await el.play().catch(() => {});
      const pname = provider === "elevenlabs" ? "ElevenLabs" : provider === "openai" ? "OpenAI (fallback)" : "Browser (fallback)";
      setResult({
        kind: provider === "elevenlabs" ? "ok" : "browser",
        msg: `provider: ${pname} · voice: ${nameOf(vid)} · id: ${vid} · model: ${model || "—"} · status: 200 · audio: ${blob.size} bytes received.`,
      });
      return;
    }
    const d = await res.json().catch(() => ({}));
    if (d.fallbackToBrowser) setResult({ kind: "browser", msg: `Cloud FAILED → browser fallback. ElevenLabs: ${d.detail || "no success"}${d.elevenStatus ? ` (status ${d.elevenStatus})` : ""}. Not calling this a success.` });
    else if (res.status === 503) setResult({ kind: "fail", msg: "ELEVENLABS_API_KEY not set on this deployment (503)." });
    else if (res.status === 403) setResult({ kind: "fail", msg: "Account not eligible for premium (403)." });
    else setResult({ kind: "fail", msg: d.error || `Request failed (${res.status}).` });
  }

  function useForJourneyNow() {
    enablePremiumForOwner();
    setResult({ kind: "ok", msg: "Journey is now set to Premium (ElevenLabs) on this device. Turn Journey on to hear it." });
  }

  // ── End-to-end live trace (A/B) ──
  const TRACE_LINE = "Tabitha, this is a brand-new ElevenLabs voice test for Magical Moments.";
  const [trace, setTrace] = useState<{ k: string; v: string; flag?: "ok" | "warn" | "bad" }[]>([]);
  const [tracing, setTracing] = useState(false);

  async function traceEleven() {
    setTracing(true); setTrace([{ k: "Status", v: "Requesting fresh ElevenLabs audio…" }]);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // unique nonce + a never-before-spoken sentence → cannot be a cached replay
        body: JSON.stringify({ text: TRACE_LINE, persona: "journey", voiceId: "journey-warm-hd", nonce: `${Date.now()}-${Math.random()}` }),
      });
      if (res.ok) {
        const provider = res.headers.get("X-Voice-Provider") || "";
        const model = res.headers.get("X-Voice-Model") || "";
        const vid = res.headers.get("X-Voice-Id") || "";
        const src = res.headers.get("X-Voice-Source") || "";
        const est = res.headers.get("X-Eleven-Status") || "200";
        const blob = await res.blob();
        const url = URL.createObjectURL(blob); const el = new Audio(url); el.onended = () => URL.revokeObjectURL(url); await el.play().catch(() => {});
        const assigned = assign.journeyFemale || assign.journeyMale;
        const matches = Boolean(vid && assigned && vid === assigned);
        setTrace([
          { k: "Provider actually used", v: provider === "elevenlabs" ? "ElevenLabs" : provider === "openai" ? "OpenAI (fallback)" : "Browser", flag: provider === "elevenlabs" ? "ok" : "bad" },
          { k: "Selected Journey voice (assigned)", v: `${nameOf(assigned)} · ${assigned || "—"}` },
          { k: "Voice ID sent to ElevenLabs", v: vid || "—" },
          { k: "Matches your assigned voice?", v: matches ? "YES ✓" : `NO — source: ${src}`, flag: matches ? "ok" : "bad" },
          { k: "Voice source", v: src || "—", flag: src.startsWith("owner") ? "ok" : "warn" },
          { k: "Model", v: model || "—" },
          { k: "ElevenLabs HTTP status", v: est },
          { k: "Audio bytes received", v: `${blob.size}` },
          { k: "Browser fallback occurred?", v: provider === "elevenlabs" ? "No" : "YES", flag: provider === "elevenlabs" ? "ok" : "bad" },
          { k: "Cached audio used?", v: "No — fresh POST, Cache-Control no-store, unique nonce + new sentence" },
        ]);
      } else {
        const d = await res.json().catch(() => ({} as any));
        setTrace([
          { k: "Provider actually used", v: "Browser fallback", flag: "bad" },
          { k: "Cloud failure reason", v: `${d.detail || "unknown"}${d.elevenStatus ? ` (status ${d.elevenStatus})` : ""}`, flag: "bad" },
          { k: "Voice ID that would be sent", v: d.voiceIdSent || "—" },
          { k: "Voice source", v: d.voiceIdSource || "—" },
          { k: "ElevenLabs HTTP status", v: `${d.elevenStatus ?? "—"}` },
          { k: "Audio bytes received", v: "0" },
          { k: "Browser fallback occurred?", v: "YES", flag: "bad" },
        ]);
      }
    } catch { setTrace([{ k: "Error", v: "Could not reach the voice service.", flag: "bad" }]); }
    finally { setTracing(false); }
  }

  function traceBrowser() {
    try {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(TRACE_LINE);
      window.speechSynthesis?.speak(u);
      setTrace([
        { k: "Provider actually used", v: "Browser (speechSynthesis)", flag: "warn" },
        { k: "Note", v: "Your device's built-in voice — compare it to the ElevenLabs sample above." },
      ]);
    } catch { setTrace([{ k: "Error", v: "Browser speech unavailable.", flag: "bad" }]); }
  }

  const isAssigned = (id: string) => id && (assign.journeyFemale === id || assign.journeyMale === id || assign.concierge === id);
  const assignedAs = (id: string) => [
    assign.journeyFemale === id ? "Journey ♀" : "",
    assign.journeyMale === id ? "Journey ♂" : "",
    assign.concierge === id ? "Concierge" : "",
  ].filter(Boolean).join(", ");

  return (
    <section className="card vst__card vst__owner">
      <h3 className="vst__h">Owner controls — house voices</h3>
      <p className="note">Defaults new members hear (from the built-in catalog) and special collections.</p>
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
          ["holiday", "Holiday voices", "Seasonal holiday collection"],
          ["seasonal", "Seasonal voices", "Rotating seasonal collection"],
          ["collab", "Collaboration voices", "Special guest / signature voices"],
        ] as [keyof Config, string, string][]).map(([k, t, s]) => (
          <label key={k} className="vst-toggle">
            <input type="checkbox" checked={Boolean(cfg[k])} onChange={(e) => save({ [k]: e.target.checked } as Partial<Config>)} />
            <span><b>{t}</b><br /><span className="note">{s}</span></span>
          </label>
        ))}
      </div>
      {saved && <p className="note vst__ok">Saved.</p>}

      {/* ── ElevenLabs Voice Manager ── */}
      <h3 className="vst__h" style={{ marginTop: "1.4rem" }}>ElevenLabs Voice Manager</h3>
      <p className="note">{cloudReady ? "Load your ElevenLabs voices, preview each, and assign them to Journey (female/male) and Concierge. No guessed ids." : "Add ELEVENLABS_API_KEY in Netlify to enable this."}</p>
      <div className="pg-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={loadVoices} disabled={loadState.kind === "loading"}>
          {loadState.kind === "loading" ? "Loading…" : "Load my ElevenLabs voices"}
        </button>
        <button type="button" className="btn btn--gold btn--sm" onClick={autoAssign} disabled={!cloudReady}>Auto-assign my voices</button>
        <button type="button" className="btn btn--gold btn--sm" onClick={testElevenLabs} disabled={!cloudReady || previewing === "test"}>
          {previewing === "test" ? "Testing…" : "Test ElevenLabs Voice"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={useForJourneyNow}>Use ElevenLabs for my Journey now</button>
      </div>
      {loadState.kind !== "idle" && loadState.kind !== "loading" && (
        <p className={`vst-status__result vst-status__result--${loadState.kind === "ok" ? "ok" : "fail"}`}>{loadState.msg}</p>
      )}
      {result.kind && <p className={`vst-status__result vst-status__result--${result.kind === "ok" ? "ok" : result.kind === "browser" ? "browser" : "fail"}`}>{result.msg}</p>}

      {voices && (
        <div className="vm-list">
          {voices.map((v) => (
            <div key={v.voice_id} className={`vm-row${isAssigned(v.voice_id) ? " is-active" : ""}`}>
              <div className="vm-row__main">
                <div className="vm-row__name">{v.name} {isAssigned(v.voice_id) && <span className="vm-badge">Active · {assignedAs(v.voice_id)}</span>}</div>
                <div className="vm-row__meta">{[v.gender, v.accent, v.category].filter(Boolean).join(" · ") || "voice"} · <code>{v.voice_id}</code></div>
              </div>
              <div className="vm-row__acts">
                <button type="button" className="btn btn--sm btn--gold" onClick={() => previewVoiceId(v.voice_id)} disabled={previewing === v.voice_id}>
                  {previewing === v.voice_id ? "…" : "▶ Preview"}
                </button>
                <button type="button" className={`btn btn--sm${assign.journeyFemale === v.voice_id ? " btn--gold" : " btn--ghost"}`} onClick={() => assignSlot("journeyFemale", v.voice_id)}>Journey ♀</button>
                <button type="button" className={`btn btn--sm${assign.journeyMale === v.voice_id ? " btn--gold" : " btn--ghost"}`} onClick={() => assignSlot("journeyMale", v.voice_id)}>Journey ♂</button>
                <button type="button" className={`btn btn--sm${assign.concierge === v.voice_id ? " btn--gold" : " btn--ghost"}`} onClick={() => assignSlot("concierge", v.voice_id)}>Concierge</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="note" style={{ marginTop: ".7rem" }}>
        Assigned — Journey ♀: <b>{nameOf(assign.journeyFemale)}</b> · Journey ♂: <b>{nameOf(assign.journeyMale)}</b> · Concierge: <b>{nameOf(assign.concierge)}</b>
      </p>

      {/* ── End-to-end live trace (A/B) ── */}
      <h3 className="vst__h" style={{ marginTop: "1.4rem" }}>Live voice trace (A/B)</h3>
      <p className="note">A brand-new sentence (never spoken, so it can&rsquo;t be a cached replay). Play it both ways and compare — the report shows exactly what happened.</p>
      <p className="note" style={{ fontStyle: "italic" }}>&ldquo;{TRACE_LINE}&rdquo;</p>
      <div className="pg-actions">
        <button type="button" className="btn btn--gold btn--sm" onClick={traceEleven} disabled={tracing}>{tracing ? "…" : "▶ Play via ElevenLabs"}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={traceBrowser}>▶ Play via Browser</button>
      </div>
      {trace.length > 0 && (
        <div className="vm-trace">
          {trace.map((row, i) => (
            <div key={i} className={`vm-trace__row${row.flag ? ` vm-trace__row--${row.flag}` : ""}`}>
              <span className="vm-trace__k">{row.k}</span>
              <span className="vm-trace__v">{row.v}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
