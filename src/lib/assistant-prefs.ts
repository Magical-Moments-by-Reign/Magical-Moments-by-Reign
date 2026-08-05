// ── Magical Assistant preferences ───────────────────────────────
// The portable voice preferences (gender, style, speed, pitch, volume) mirror
// the member's profile so the assistant sounds the same across devices; the
// device-specific chosen browser voice (voiceURI) stays local. Shared by the
// Settings UI, the live MagicalAssistant, and the guided tour so they agree.

export type VoiceGender = "female" | "male";
export type VoiceStyle =
  | "warm" | "elegant" | "friendly" | "professional"  // female
  | "calm" | "executive";                              // male (+ professional/friendly shared)

export interface AssistantPrefs {
  soundOn: boolean;      // signature sound + chime
  voiceOn: boolean;      // spoken responses (TTS)
  captionsOn: boolean;   // show text captions
  autostart: boolean;    // turn the assistant on automatically after entering
  gender: VoiceGender;
  style: VoiceStyle;
  speed: number;         // TTS rate 0.7–1.2
  pitch: number;         // TTS pitch 0.7–1.3
  volume: number;        // 0–1
  voiceURI: string;      // preferred device voice (empty = auto by gender/style)
}

export const DEFAULT_PREFS: AssistantPrefs = {
  soundOn: true, voiceOn: true, captionsOn: true, autostart: false,
  gender: "female", style: "warm", speed: 0.96, pitch: 1.03, volume: 1, voiceURI: "",
};

// Style → gentle rate/pitch shaping for a natural, luxury cadence (never robotic).
export const STYLE_PRESETS: Record<VoiceStyle, { rate: number; pitch: number; label: string }> = {
  warm:         { rate: 0.94, pitch: 1.04, label: "Warm" },
  elegant:      { rate: 0.9,  pitch: 1.0,  label: "Elegant" },
  friendly:     { rate: 1.0,  pitch: 1.08, label: "Friendly" },
  professional: { rate: 0.98, pitch: 1.0,  label: "Professional" },
  calm:         { rate: 0.9,  pitch: 0.96, label: "Calm" },
  executive:    { rate: 0.98, pitch: 0.92, label: "Executive" },
};

export const STYLES_BY_GENDER: Record<VoiceGender, VoiceStyle[]> = {
  female: ["warm", "elegant", "friendly", "professional"],
  male: ["calm", "professional", "friendly", "executive"],
};

const KEY = "mmr:assistant-prefs";

function clamp(n: number, lo: number, hi: number, d: number): number {
  return typeof n === "number" && isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}

export function loadPrefs(): AssistantPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return {
      soundOn: p.soundOn ?? DEFAULT_PREFS.soundOn,
      voiceOn: p.voiceOn ?? DEFAULT_PREFS.voiceOn,
      captionsOn: p.captionsOn ?? DEFAULT_PREFS.captionsOn,
      autostart: p.autostart ?? DEFAULT_PREFS.autostart,
      gender: p.gender === "male" ? "male" : "female",
      style: (STYLE_PRESETS[p.style as VoiceStyle] ? p.style : DEFAULT_PREFS.style),
      speed: clamp(p.speed, 0.7, 1.2, DEFAULT_PREFS.speed),
      pitch: clamp(p.pitch, 0.7, 1.3, DEFAULT_PREFS.pitch),
      volume: clamp(p.volume, 0, 1, DEFAULT_PREFS.volume),
      voiceURI: typeof p.voiceURI === "string" ? p.voiceURI : "",
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Partial<AssistantPrefs>): AssistantPrefs {
  const next = { ...loadPrefs(), ...p };
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  return next;
}

/** The portable subset stored on the member profile (device voice excluded). */
export function portablePrefs(p: AssistantPrefs) {
  return { gender: p.gender, style: p.style, speed: p.speed, pitch: p.pitch, volume: p.volume };
}

/** Merge profile prefs into local storage (used to hydrate a new device). */
export function hydrateFromProfile(json: string | null | undefined): AssistantPrefs {
  if (!json) return loadPrefs();
  try {
    const p = JSON.parse(json);
    if (p && typeof p === "object" && Object.keys(p).length) return savePrefs(p);
  } catch { /* ignore */ }
  return loadPrefs();
}
