"use client";

// 🎙️ Assistant Voice — pick gender + style, fine-tune speed/pitch/volume,
// preview, and restore recommended. Saved locally (device voice) AND to the
// member profile (portable settings). Uses the shared natural-speech engine so
// the preview sounds exactly like the live assistant.

import { useEffect, useRef, useState } from "react";
import {
  loadPrefs, savePrefs, hydrateFromProfile, portablePrefs, DEFAULT_PREFS,
  STYLE_PRESETS, STYLES_BY_GENDER, type AssistantPrefs, type VoiceGender, type VoiceStyle,
} from "@/lib/assistant-prefs";
import { speak, cancel } from "@/lib/voice/speech";
import { freeVoiceForStyle } from "@/lib/voice/catalog";
import { updateVoicePrefsAction } from "./actions";

export default function VoiceSettings({ assistantName, firstName, profileVoicePrefs }: { assistantName: string; firstName: string; profileVoicePrefs: string }) {
  const [prefs, setPrefs] = useState<AssistantPrefs>(DEFAULT_PREFS);
  const saveTimer = useRef<any>(null);

  useEffect(() => { setPrefs(hydrateFromProfile(profileVoicePrefs)); }, [profileVoicePrefs]);

  function update(patch: Partial<AssistantPrefs>) {
    const next = savePrefs(patch);
    setPrefs(next);
    // Debounced profile sync (portable subset only).
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { updateVoicePrefsAction(portablePrefs(next)).catch(() => {}); }, 500);
  }

  function setGender(gender: VoiceGender) {
    const styles = STYLES_BY_GENDER[gender];
    const style = styles.includes(prefs.style) ? prefs.style : styles[0];
    // Keep the Journey persona voice in sync so the live assistant matches.
    update({ gender, style, journeyVoice: freeVoiceForStyle("journey", gender, style) });
  }

  function setStyle(style: VoiceStyle) {
    update({ style, journeyVoice: freeVoiceForStyle("journey", prefs.gender, style) });
  }

  function preview() {
    cancel();
    const hi = firstName ? `Hello, ${firstName}.` : "Hello.";
    speak(`${hi} I'm ${assistantName}, your Magical Assistant. It's a pleasure to help you create something unforgettable.`, { prefs });
  }

  function restore() {
    const next = savePrefs({ gender: DEFAULT_PREFS.gender, style: DEFAULT_PREFS.style, journeyVoice: DEFAULT_PREFS.journeyVoice, speed: DEFAULT_PREFS.speed, pitch: DEFAULT_PREFS.pitch, volume: DEFAULT_PREFS.volume });
    setPrefs(next);
    updateVoicePrefsAction(portablePrefs(next)).catch(() => {});
  }

  const styles = STYLES_BY_GENDER[prefs.gender];

  return (
    <section className="sec as">
      <div className="sec__h"><h2 className="sec__t">🎙️ Assistant Voice</h2></div>
      <div className="card">
        <p className="note">Choose how {assistantName} sounds. Preview any combination before you keep it — these settings follow you across your devices.</p>

        <div className="vs-grid">
          <div className="vs-field">
            <span>Voice</span>
            <div className="vs-seg">
              {(["female", "male"] as VoiceGender[]).map((g) => (
                <button key={g} type="button" className={prefs.gender === g ? "is-on" : ""} onClick={() => setGender(g)}>{g === "female" ? "Female" : "Male"}</button>
              ))}
            </div>
          </div>

          <label className="vs-field"><span>Style</span>
            <select value={prefs.style} onChange={(e) => setStyle(e.target.value as VoiceStyle)}>
              {styles.map((s) => <option key={s} value={s}>{STYLE_PRESETS[s].label}</option>)}
            </select>
          </label>

          <label className="vs-field"><span>Speaking speed</span>
            <input type="range" min="0.7" max="1.2" step="0.02" value={prefs.speed} onChange={(e) => update({ speed: parseFloat(e.target.value) })} />
          </label>
          <label className="vs-field"><span>Pitch</span>
            <input type="range" min="0.7" max="1.3" step="0.02" value={prefs.pitch} onChange={(e) => update({ pitch: parseFloat(e.target.value) })} />
          </label>
          <label className="vs-field"><span>Volume</span>
            <input type="range" min="0" max="1" step="0.05" value={prefs.volume} onChange={(e) => update({ volume: parseFloat(e.target.value) })} />
          </label>
        </div>

        <div className="pg-actions">
          <button type="button" className="btn btn--gold" onClick={preview}>▶ Preview voice</button>
          <button type="button" className="btn btn--ghost" onClick={() => cancel()}>Stop</button>
          <button type="button" className="btn btn--ghost" onClick={restore}>Restore recommended settings</button>
        </div>

        <p className="note" style={{ marginTop: ".7rem" }}>
          These are the quick controls. For voice tiers (Free &amp; Premium), separate Journey and Concierge voices, and a full test drive, open the{" "}
          <a href="/dashboard/settings/voice" className="vs-link">Voice Studio →</a>
        </p>
      </div>
    </section>
  );
}
