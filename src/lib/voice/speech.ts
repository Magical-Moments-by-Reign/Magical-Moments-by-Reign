// ── Natural speech engine (client) ──────────────────────────────
// Makes the browser voice sound less robotic: it splits a reply into short
// spoken sentences, picks the best available voice for the chosen gender, and
// applies gentle style-based rate/pitch shaping with a small pause between
// sentences for a warm, luxury cadence. One place, used by the assistant, the
// guided tour, and the Settings voice preview.
//
// PREMIUM SEAM: `speak()` uses the browser voice for the FREE tier. When the
// member is on the PREMIUM tier it first tries the cloud route (/api/voice/tts,
// ElevenLabs primary → OpenAI fallback, keys server-side) and plays that audio.
// If the cloud isn't connected or the member isn't eligible, it falls back to
// the browser voice so speech never goes silent — callers don't change.

import { loadPrefs, STYLE_PRESETS, type AssistantPrefs, type VoiceGender, type VoiceStyle } from "@/lib/assistant-prefs";
import { getVoice, type VoicePersona } from "@/lib/voice/catalog";

export type VoiceProvider = "browser" | "cloud";
export function activeVoiceProvider(): VoiceProvider {
  const prefs = loadPrefs();
  return prefs.provider === "premium" && !cloudDisabled ? "cloud" : "browser";
}

// Heuristic gender hints from the OS/browser voice catalog (no reliable gender
// field exists in the Web Speech API, so we match common voice names).
const FEMALE = /(female|woman|samantha|victoria|serena|allison|ava|susan|zira|aria|jenny|joanna|salli|kendra|amy|emma|female)/i;
const MALE = /(male|man|daniel|alex|fred|tom|david|guy|matthew|brian|arthur|george|male)/i;

export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => /en(-|_|$)/i.test(v.lang));
}

export function pickVoice(gender: VoiceGender, preferredURI?: string, accent?: string): SpeechSynthesisVoice | undefined {
  const voices = listVoices();
  if (preferredURI) { const exact = voices.find((v) => v.voiceURI === preferredURI); if (exact) return exact; }
  const want = gender === "male" ? MALE : FEMALE;
  const avoid = gender === "male" ? FEMALE : MALE;
  // Bias by accent when the selected voice specifies one (British → en-GB, etc.).
  const lang = /brit|uk|english \(u\.?k|gb/i.test(accent || "") ? /en-GB/i
    : /austral/i.test(accent || "") ? /en-AU/i
    : /american|us/i.test(accent || "") ? /en-US/i : null;
  const byAccent = (arr: SpeechSynthesisVoice[]) => (lang ? arr.filter((v) => lang.test(v.lang)) : arr);
  const gendered = voices.filter((v) => want.test(v.name) && !avoid.test(v.name));
  return byAccent(gendered)[0]
    || gendered[0]
    || byAccent(voices.filter((v) => want.test(v.name)))[0]
    || voices.find((v) => want.test(v.name))
    || (lang && voices.find((v) => lang.test(v.lang)))
    || voices.find((v) => /en-US|en-GB/i.test(v.lang))
    || voices[0];
}

/** Split text into short, natural spoken chunks (sentence-ish, length-capped). */
export function toSpokenChunks(text: string): string[] {
  const clean = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
  const out: string[] = [];
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if (t.length <= 160) { out.push(t); continue; }
    // Break very long sentences on commas/semicolons for breathing room.
    let buf = "";
    for (const part of t.split(/,|;/)) {
      const p = part.trim(); if (!p) continue;
      if ((buf + " " + p).length > 160 && buf) { out.push(buf.trim() + ","); buf = p; }
      else buf = buf ? `${buf}, ${p}` : p;
    }
    if (buf) out.push(buf.trim());
  }
  return out;
}

let stopFlag = false;
// Once the cloud says "not connected" / "not eligible" (503/403), stop trying it
// this session and use the browser voice — avoids hitting a dead route repeatedly.
let cloudDisabled = false;
let audioEl: HTMLAudioElement | null = null;

/** Re-enable the cloud path (clears a stale session disable) — call this when the
 *  member turns premium on, so a voice assigned after an earlier failure works. */
export function enableCloud(): void { cloudDisabled = false; }

/** Speak text naturally. Returns immediately; use callbacks for state.
 *  persona selects which saved voice id (Journey vs Concierge) the cloud uses. */
export type UsedProvider = "elevenlabs" | "openai" | "browser";
export interface SpeakOpts { prefs?: AssistantPrefs; persona?: VoicePersona; onStart?: () => void; onEnd?: () => void; onProvider?: (p: UsedProvider) => void; }

export function speak(text: string, opts?: SpeakOpts): void {
  if (typeof window === "undefined") return;
  const prefs = opts?.prefs ?? loadPrefs();
  if (!prefs.voiceOn) return;
  const clean = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return;

  cancel();
  stopFlag = false;

  const persona: VoicePersona = opts?.persona ?? "journey";
  const voiceId = persona === "concierge" ? prefs.conciergeVoice : prefs.journeyVoice;

  // PREMIUM: try the cloud voice first; fall back to the MATCHING browser voice
  // on any failure (never a different persona, and always reported so a fallback
  // can't hide as if premium worked).
  if (prefs.provider === "premium" && !cloudDisabled) {
    speakCloud(clean, voiceId, persona, prefs, opts).catch(() => {
      speakBrowser(clean, prefs, voiceId, opts);
    });
    return;
  }
  speakBrowser(clean, prefs, voiceId, opts);
}

/** Cloud (premium) synthesis: fetch MP3 from the server route and play it. */
async function speakCloud(
  text: string,
  voiceId: string,
  persona: VoicePersona,
  prefs: AssistantPrefs,
  opts?: SpeakOpts,
): Promise<void> {
  const res = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, persona }),
  });
  if (!res.ok) {
    // 503 = premium not connected, 403 = not a paid member → don't retry this session.
    if (res.status === 503 || res.status === 403) cloudDisabled = true;
    throw new Error(`tts ${res.status}`);
  }
  const provider = (res.headers.get("X-Voice-Provider") as UsedProvider) || "elevenlabs";
  const blob = await res.blob();
  if (stopFlag) return;
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  audioEl = el;
  el.volume = Math.min(1, Math.max(0, prefs.volume));
  el.onplay = () => { opts?.onProvider?.(provider); opts?.onStart?.(); };
  const done = () => { URL.revokeObjectURL(url); if (audioEl === el) audioEl = null; opts?.onEnd?.(); };
  el.onended = done;
  el.onerror = () => { URL.revokeObjectURL(url); throw new Error("audio"); };
  await el.play();
}

/** Free (browser) synthesis: natural chunked speech synthesis. The SELECTED
 *  persona voice (its gender / browser style / accent) drives delivery so the
 *  member's Journey and Concierge choices actually sound different; the member's
 *  speed / pitch / volume sliders still fine-tune on top. */
function speakBrowser(text: string, prefs: AssistantPrefs, voiceId: string, opts?: SpeakOpts): void {
  if (!window.speechSynthesis) return;
  const chunks = toSpokenChunks(text);
  if (!chunks.length) return;

  stopFlag = false;
  opts?.onProvider?.("browser");
  const vo = getVoice(voiceId);
  const gender: VoiceGender = vo?.gender ?? prefs.gender;
  const style: VoiceStyle = (vo?.browserStyle as VoiceStyle) ?? prefs.style;
  // Only honor the device-voice override when it matches the selected gender.
  const preferredURI = gender === prefs.gender ? prefs.voiceURI : "";
  const voice = pickVoice(gender, preferredURI, vo?.accent);
  const preset = STYLE_PRESETS[style] ?? STYLE_PRESETS.warm;
  // Blend the member's speed/pitch sliders with the style preset.
  const rate = Math.min(1.25, Math.max(0.7, prefs.speed * preset.rate));
  const pitch = Math.min(1.4, Math.max(0.7, prefs.pitch * preset.pitch));

  let i = 0;
  opts?.onStart?.();
  const next = () => {
    if (stopFlag || i >= chunks.length) { opts?.onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i]);
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch; u.volume = prefs.volume;
    u.onend = () => {
      i += 1;
      // A brief, natural pause between sentences (not a dragging gap).
      window.setTimeout(next, i < chunks.length ? 140 : 0);
    };
    u.onerror = () => { i += 1; next(); };
    window.speechSynthesis.speak(u);
  };
  next();
}

export function cancel(): void {
  stopFlag = true;
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  if (audioEl) { try { audioEl.pause(); audioEl.src = ""; } catch { /* ignore */ } audioEl = null; }
}
