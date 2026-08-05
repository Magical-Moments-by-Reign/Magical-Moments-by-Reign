// ── Natural speech engine (client) ──────────────────────────────
// Makes the browser voice sound less robotic: it splits a reply into short
// spoken sentences, picks the best available voice for the chosen gender, and
// applies gentle style-based rate/pitch shaping with a small pause between
// sentences for a warm, luxury cadence. One place, used by the assistant, the
// guided tour, and the Settings voice preview.
//
// PREMIUM SEAM: `speak()` routes through provider "browser" today. A cloud
// provider (ElevenLabs / OpenAI / Azure) can later be added as another provider
// that streams audio from a server route — callers don't change.

import { loadPrefs, STYLE_PRESETS, type AssistantPrefs, type VoiceGender } from "@/lib/assistant-prefs";

export type VoiceProvider = "browser" | "cloud";
export function activeVoiceProvider(): VoiceProvider {
  // Flip to "cloud" once a premium TTS route is connected (see the report).
  return "browser";
}

// Heuristic gender hints from the OS/browser voice catalog (no reliable gender
// field exists in the Web Speech API, so we match common voice names).
const FEMALE = /(female|woman|samantha|victoria|serena|allison|ava|susan|zira|aria|jenny|joanna|salli|kendra|amy|emma|female)/i;
const MALE = /(male|man|daniel|alex|fred|tom|david|guy|matthew|brian|arthur|george|male)/i;

export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => /en(-|_|$)/i.test(v.lang));
}

export function pickVoice(gender: VoiceGender, preferredURI?: string): SpeechSynthesisVoice | undefined {
  const voices = listVoices();
  if (preferredURI) { const exact = voices.find((v) => v.voiceURI === preferredURI); if (exact) return exact; }
  const want = gender === "male" ? MALE : FEMALE;
  const avoid = gender === "male" ? FEMALE : MALE;
  return voices.find((v) => want.test(v.name) && !avoid.test(v.name))
    || voices.find((v) => want.test(v.name))
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

/** Speak text naturally. Returns immediately; use callbacks for state. */
export function speak(text: string, opts?: { prefs?: AssistantPrefs; onStart?: () => void; onEnd?: () => void }): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const prefs = opts?.prefs ?? loadPrefs();
  if (!prefs.voiceOn) return;
  const chunks = toSpokenChunks(text);
  if (!chunks.length) return;

  cancel();
  stopFlag = false;
  const voice = pickVoice(prefs.gender, prefs.voiceURI);
  const preset = STYLE_PRESETS[prefs.style] ?? STYLE_PRESETS.warm;
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
}
