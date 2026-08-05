"use client";

// "Name Your Magical Assistant" + voice/sound preferences. The NAME is saved to
// the member's profile via a server action (validated server-side too). The
// voice preferences are per-device (localStorage), shared with the live
// MagicalAssistant via src/lib/assistant-prefs.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SUGGESTED_ASSISTANT_NAMES, DEFAULT_ASSISTANT_NAME, MAX_ASSISTANT_NAME_LEN,
  checkAssistantName, nameCheckMessage, assistantGreeting,
} from "@/lib/assistant-name";
import { loadPrefs, savePrefs, type AssistantPrefs } from "@/lib/assistant-prefs";
import { updateAssistantNameAction, resetAssistantNameAction } from "./actions";

export default function AssistantSettings({
  currentName, firstName, flag,
}: { currentName: string; firstName: string; flag?: string }) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [prefs, setPrefs] = useState<AssistantPrefs>(() => loadPrefs());
  const [voices, setVoices] = useState<{ uri: string; label: string }[]>([]);
  const [micState, setMicState] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => { setPrefs(loadPrefs()); }, []);
  useEffect(() => {
    function loadVoices() {
      const vs = (window.speechSynthesis?.getVoices?.() || [])
        .filter((v) => /en/i.test(v.lang))
        .map((v) => ({ uri: v.voiceURI, label: `${v.name} (${v.lang})` }));
      setVoices(vs);
    }
    loadVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  function update(patch: Partial<AssistantPrefs>) { setPrefs(savePrefs(patch)); }

  const check = checkAssistantName(name);
  const previewName = check.ok ? check.name : DEFAULT_ASSISTANT_NAME;
  const preview = assistantGreeting({ assistantName: previewName, firstName });

  async function requestMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // we only needed the permission
      setMicState("granted");
    } catch { setMicState("denied"); }
  }

  return (
    <section className="sec as">
      <div className="sec__h"><h2 className="sec__t">Your Magical Assistant</h2></div>

      {flag === "saved" && <p className="as-flash as-flash--ok">Saved — your assistant is now {currentName}.</p>}
      {flag === "reset" && <p className="as-flash as-flash--ok">Reset to the default name, {DEFAULT_ASSISTANT_NAME}.</p>}
      {flag === "invalid" && <p className="as-flash as-flash--warn">That name couldn&rsquo;t be saved. Try another.</p>}

      <div className="card">
        <h3>Name Your Magical Assistant</h3>
        <p className="note">Your assistant is your personal guide through Magical Moments. Give it a name that feels like yours.</p>

        <div className="as-chips">
          {SUGGESTED_ASSISTANT_NAMES.map((s) => (
            <button key={s} type="button" className={`as-chip${previewName === s ? " is-on" : ""}`} onClick={() => setName(s)}>{s}</button>
          ))}
          <span className="as-chip as-chip--label">or a custom name →</span>
        </div>

        <form action={updateAssistantNameAction} className="as-form">
          <label className="as-field">
            <span>Assistant name</span>
            <input
              name="assistantName" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_ASSISTANT_NAME_LEN} placeholder={DEFAULT_ASSISTANT_NAME} autoComplete="off"
            />
          </label>
          {!check.ok && name.trim() !== "" && <p className="as-hint as-hint--warn">{nameCheckMessage(check.reason)}</p>}

          <div className="as-preview">
            <span className="as-preview__k">Preview</span>
            <p>&ldquo;{preview}&rdquo;</p>
          </div>

          <div className="pg-actions">
            <button type="submit" className="btn btn--gold" disabled={!check.ok}>Save name</button>
            <button type="submit" formAction={resetAssistantNameAction} className="btn btn--ghost">Reset to {DEFAULT_ASSISTANT_NAME}</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Voice &amp; sound</h3>
        <p className="note">These preferences are saved on this device. Your assistant never listens unless you turn the microphone on.</p>

        <div className="as-prefs">
          <label className="as-pref"><span>Signature sound</span><input type="checkbox" checked={prefs.soundOn} onChange={(e) => update({ soundOn: e.target.checked })} /></label>
          <label className="as-pref"><span>Spoken responses</span><input type="checkbox" checked={prefs.voiceOn} onChange={(e) => update({ voiceOn: e.target.checked })} /></label>
          <label className="as-pref"><span>Captions</span><input type="checkbox" checked={prefs.captionsOn} onChange={(e) => update({ captionsOn: e.target.checked })} /></label>
          <label className="as-pref"><span>Start assistant automatically after entering</span><input type="checkbox" checked={prefs.autostart} onChange={(e) => update({ autostart: e.target.checked })} /></label>
          <label className="as-pref as-pref--wide"><span>Voice speed</span><input type="range" min="0.7" max="1.2" step="0.05" value={prefs.speed} onChange={(e) => update({ speed: parseFloat(e.target.value) })} /></label>
          {voices.length > 0 && (
            <label className="as-pref as-pref--wide"><span>Voice</span>
              <select value={prefs.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })}>
                <option value="">Automatic (recommended)</option>
                {voices.map((v) => <option key={v.uri} value={v.uri}>{v.label}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="pg-actions">
          <button type="button" className="btn btn--ghost" onClick={requestMic}>
            {micState === "granted" ? "Microphone allowed ✓" : micState === "denied" ? "Microphone blocked — allow in browser" : "Allow microphone"}
          </button>
        </div>
        <p className="note" style={{ marginTop: ".6rem" }}>
          Voice input works best in Chrome and Edge today (<b>connected but limited</b>). A premium natural voice and all-browser voice input are <b>coming soon</b>.
        </p>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Guided tour</h3>
        <p className="note">Have {currentName} walk you through your Magical Space again, one area at a time.</p>
        <div className="pg-actions">
          <button type="button" className="btn btn--ghost" onClick={() => {
            try { sessionStorage.setItem("mmr:tour-replay", "1"); } catch {}
            router.push("/dashboard");
          }}>Replay Magical Space Tour</button>
        </div>
      </div>
    </section>
  );
}
