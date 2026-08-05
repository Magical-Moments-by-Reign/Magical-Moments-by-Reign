"use client";

// ── Voice Studio (client) ───────────────────────────────────────
// The dedicated voice experience. Choose the TIER (Free = browser · Premium =
// cloud), then a persona voice for Journey and Concierge, fine-tune speed, and
// preview / test-drive a short conversation. Selections save to the device AND
// to the member profile (portable). Premium is honestly gated: it's only
// selectable when a cloud key is connected AND the member is a paying member —
// otherwise it shows as "Membership feature" or "Coming soon", never silently
// falling back without saying so.

import { useEffect, useRef, useState } from "react";
import {
  loadPrefs, savePrefs, hydrateFromProfile, portablePrefs, DEFAULT_PREFS,
  type AssistantPrefs,
} from "@/lib/assistant-prefs";
import {
  voicesFor, getVoice, voiceAccess, tierVoiceId, VOICE_PREVIEW_LINE,
  type VoicePersona, type VoiceOption, type VoiceTier,
} from "@/lib/voice/catalog";
import { speak, cancel } from "@/lib/voice/speech";
import { updateVoicePrefsAction } from "../actions";

const CONCIERGE_PREVIEW_LINE =
  "Good evening. This is your Magical Moments Concierge. It would be my pleasure to arrange every detail — simply tell me what you have in mind.";

const TEST_CONVERSATION: Record<VoicePersona, string[]> = {
  journey: [
    "Welcome back. I've saved your place right where you left off.",
    "Would you like to keep building your celebration, or start something new?",
  ],
  concierge: [
    "I found three refined options that match what you described.",
    "Say the word and I'll begin arranging the details for your review.",
  ],
};

export default function VoiceStudio({
  assistantName, firstName, profileVoicePrefs, cloudReady, paidMember, cloudProvider,
}: {
  assistantName: string; firstName: string; profileVoicePrefs: string;
  cloudReady: boolean; paidMember: boolean; cloudProvider: "elevenlabs" | "openai" | null;
}) {
  const [prefs, setPrefs] = useState<AssistantPrefs>(DEFAULT_PREFS);
  const [persona, setPersona] = useState<VoicePersona>("journey");
  const [testState, setTestState] = useState<{ kind: "idle" | "testing" | "ok" | "browser" | "fail"; msg: string }>({ kind: "idle", msg: "" });
  const saveTimer = useRef<any>(null);

  // Live status line (requirement 14). Reflects what's actually connected.
  const status = cloudProvider === "elevenlabs"
    ? { cls: "ok", label: "ElevenLabs Connected", note: "Premium voices ready (OpenAI is the automatic fallback if it's configured)." }
    : cloudProvider === "openai"
      ? { cls: "ok", label: "OpenAI Fallback Connected", note: "OpenAI TTS is ready. Add ELEVENLABS_API_KEY to make ElevenLabs the primary voice." }
      : { cls: "off", label: "Premium Voice Unavailable", note: "No cloud key configured — everyone is on Browser Voice for now." };

  // Verify a REAL cloud MP3 before trusting premium (requirement 13).
  async function testPremium() {
    setTestState({ kind: "testing", msg: "Requesting a real cloud voice…" });
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: VOICE_PREVIEW_LINE, voiceId: prefs.journeyVoice }),
      });
      if (res.ok) {
        const provider = res.headers.get("X-Voice-Provider") || "cloud";
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const el = new Audio(url);
        el.onended = () => URL.revokeObjectURL(url);
        await el.play().catch(() => {});
        setTestState({ kind: "ok", msg: `Verified — real ${provider === "elevenlabs" ? "ElevenLabs" : provider === "openai" ? "OpenAI" : "cloud"} voice is playing.` });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.fallbackToBrowser) setTestState({ kind: "browser", msg: "Both cloud providers failed — the assistant will use the browser voice." });
      else if (res.status === 503) setTestState({ kind: "fail", msg: "Premium isn't connected yet (no cloud key)." });
      else if (res.status === 403) setTestState({ kind: "fail", msg: "Premium voices are a paid-membership feature." });
      else setTestState({ kind: "fail", msg: data.error || "Could not reach the voice service." });
    } catch {
      setTestState({ kind: "browser", msg: "Couldn't reach the voice service — the assistant will use the browser voice." });
    }
  }

  useEffect(() => { setPrefs(hydrateFromProfile(profileVoicePrefs)); }, [profileVoicePrefs]);

  function update(patch: Partial<AssistantPrefs>) {
    const next = savePrefs(patch);
    setPrefs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { updateVoicePrefsAction(portablePrefs(next)).catch(() => {}); }, 500);
  }

  const tier: VoiceTier = prefs.provider === "premium" ? "premium" : "free";
  const premiumUsable = cloudReady && paidMember;

  function selectTier(t: VoiceTier) {
    if (t === "premium" && !premiumUsable) return; // gated — the card explains why
    // Move each persona's selection into the chosen tier if it isn't already there.
    const journeyId = tierVoiceId("journey", t, prefs.journeyVoice);
    const conciergeId = tierVoiceId("concierge", t, prefs.conciergeVoice);
    update({ provider: t, journeyVoice: journeyId, conciergeVoice: conciergeId });
  }

  function selectVoice(v: VoiceOption) {
    update(persona === "concierge" ? { conciergeVoice: v.id } : { journeyVoice: v.id });
  }

  function currentVoiceId(p: VoicePersona) { return p === "concierge" ? prefs.conciergeVoice : prefs.journeyVoice; }

  function previewLine(p: VoicePersona) { return p === "concierge" ? CONCIERGE_PREVIEW_LINE : VOICE_PREVIEW_LINE; }

  function preview() {
    cancel();
    speak(previewLine(persona), { prefs, persona });
  }

  function testConversation() {
    cancel();
    const lines = TEST_CONVERSATION[persona];
    let i = 0;
    const sayNext = () => {
      if (i >= lines.length) return;
      speak(lines[i++], { prefs, persona, onEnd: () => window.setTimeout(sayNext, 350) });
    };
    sayNext();
  }

  const options = voicesFor(persona, tier);
  const selectedId = currentVoiceId(persona);

  return (
    <div className="vst">
      {/* Voice provider (tier) */}
      <section className="card vst__card">
        <h3 className="vst__h">Voice provider</h3>
        <p className="note">Free voices come from your device. Premium voices are ultra-natural cloud voices — the long-term Magical Moments sound.</p>
        <div className="vst-tiers">
          <button type="button" className={`vst-tier ${tier === "free" ? "is-on" : ""}`} onClick={() => selectTier("free")}>
            <span className="vst-tier__k">Free</span>
            <span className="vst-tier__d">Browser voices · included</span>
            <span className="vst-tier__s vst-tier__s--ok">Available now</span>
          </button>
          <button
            type="button"
            className={`vst-tier ${tier === "premium" ? "is-on" : ""} ${premiumUsable ? "" : "is-locked"}`}
            onClick={() => selectTier("premium")}
            aria-disabled={!premiumUsable}
          >
            <span className="vst-tier__k">Premium ✦</span>
            <span className="vst-tier__d">Cloud voices · ultra-natural</span>
            <span className="vst-tier__s">
              {!cloudReady ? "Coming soon" : !paidMember ? "Membership feature" : "Available now"}
            </span>
          </button>
        </div>
        {tier === "premium" && premiumUsable && (
          <p className="note vst__ok">Premium is on. {assistantName} will speak in a cloud voice, with an automatic fallback to your device voice if the cloud is briefly unavailable.</p>
        )}

        {/* Live provider status + real MP3 verification */}
        <div className="vst-status">
          <div className="vst-status__row">
            <span className={`vst-status__dot vst-status__dot--ok`} /> <b>Browser Voice</b> — always available (Free tier)
          </div>
          <div className="vst-status__row">
            <span className={`vst-status__dot vst-status__dot--${status.cls}`} /> <b>{status.label}</b>
          </div>
          <p className="note vst-status__note">{status.note}</p>
          <div className="pg-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={testPremium} disabled={testState.kind === "testing"}>
              {testState.kind === "testing" ? "Testing…" : "Test premium connection"}
            </button>
          </div>
          {testState.kind !== "idle" && testState.kind !== "testing" && (
            <p className={`vst-status__result vst-status__result--${testState.kind}`}>{testState.msg}</p>
          )}
        </div>
      </section>

      {/* Persona + voices */}
      <section className="card vst__card">
        <div className="vst-tabs">
          {(["journey", "concierge"] as VoicePersona[]).map((p) => (
            <button key={p} type="button" className={persona === p ? "is-on" : ""} onClick={() => setPersona(p)}>
              {p === "journey" ? "Journey — your Assistant" : "Concierge — service"}
            </button>
          ))}
        </div>

        <p className="note">
          {persona === "journey"
            ? `The everyday voice of ${assistantName}, your personal assistant.`
            : "The voice of your hands-on Concierge for bookings and arrangements."}
        </p>

        <div className="vst-voices">
          {options.map((v) => {
            const access = voiceAccess(v, { paidMember, cloudReady });
            const chosen = v.id === selectedId;
            return (
              <button
                key={v.id}
                type="button"
                className={`vst-voice ${chosen ? "is-on" : ""}`}
                onClick={() => selectVoice(v)}
              >
                <span className="vst-voice__name">{v.personality}</span>
                <span className="vst-voice__meta">{v.gender === "male" ? "Male" : "Female"} · {v.accent}{v.tier === "premium" ? " · ✦ Premium" : ""}</span>
                {access !== "available" && (
                  <span className="vst-voice__badge">{access === "needs_membership" ? "Membership" : "Coming soon"}</span>
                )}
                {chosen && <span className="vst-voice__check">✓ Selected</span>}
              </button>
            );
          })}
        </div>

        <label className="vst-slider">
          <span>Speaking speed</span>
          <input type="range" min="0.7" max="1.2" step="0.02" value={prefs.speed} onChange={(e) => update({ speed: parseFloat(e.target.value) })} />
        </label>

        <div className="pg-actions">
          <button type="button" className="btn btn--gold" onClick={preview}>▶ Preview voice</button>
          <button type="button" className="btn btn--ghost" onClick={testConversation}>Test conversation</button>
          <button type="button" className="btn btn--ghost" onClick={() => cancel()}>Stop</button>
        </div>

        <p className="note vst__foot">
          Now playing: <b>{getVoice(selectedId)?.personality ?? "—"}</b> ({tier === "premium" ? "Premium cloud" : "Free browser"}).
        </p>
      </section>
    </div>
  );
}
