// ── Magical Assistant preferences (client, per-device) ──────────
// Voice/sound preferences live in localStorage (per device), separate from the
// assistant NAME which is saved to the member's profile in the database. Shared
// by the Settings UI and the live MagicalAssistant so they never disagree.

export interface AssistantPrefs {
  soundOn: boolean;      // signature sound + chime
  voiceOn: boolean;      // spoken responses (TTS)
  captionsOn: boolean;   // show text captions
  speed: number;         // TTS rate 0.7–1.2
  autostart: boolean;    // turn the assistant on automatically after entering
  voiceURI: string;      // preferred SpeechSynthesis voice (empty = auto)
}

export const DEFAULT_PREFS: AssistantPrefs = {
  soundOn: true, voiceOn: true, captionsOn: true, speed: 0.95, autostart: false, voiceURI: "",
};

const KEY = "mmr:assistant-prefs";

export function loadPrefs(): AssistantPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw);
    return {
      soundOn: p.soundOn ?? DEFAULT_PREFS.soundOn,
      voiceOn: p.voiceOn ?? DEFAULT_PREFS.voiceOn,
      captionsOn: p.captionsOn ?? DEFAULT_PREFS.captionsOn,
      speed: typeof p.speed === "number" ? Math.min(1.2, Math.max(0.7, p.speed)) : DEFAULT_PREFS.speed,
      autostart: p.autostart ?? DEFAULT_PREFS.autostart,
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
