"use client";

// ── The named live Magical Assistant (Journey / Ask Magical) ────
// A persistent glowing on/off control lives across the signed-in dashboard. The
// FULL welcome plays only once per signed-in session (keyed to the session id):
// not on every turn-on, panel reopen, route change, or refresh. Turning Journey
// back on in the same session gives a short "I'm back." — never the whole intro.
//
// Privacy: the microphone is never accessed unless the member taps it; a visible
// "Listening" state shows whenever it is; no audio is stored.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { assistantGreeting } from "@/lib/assistant-name";
import { looksLikeConciergeRequest } from "@/lib/concierge-intent";
import { loadPrefs } from "@/lib/assistant-prefs";
import { speak as speakNatural, cancel as cancelSpeech, type UsedProvider } from "@/lib/voice/speech";
import "./magical-assistant.css";

const PROVIDER_LABEL: Record<UsedProvider, string> = { elevenlabs: "ElevenLabs", openai: "OpenAI", browser: "Browser voice" };

interface Msg { role: "user" | "assistant"; content: string; }
const MSG_KEY = "mmr:assistant-msgs";
const ON_KEY = "mmr:assistant-on";

function fmt(text: string): { __html: string } {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return { __html: esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") };
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function parseTripDates(text: string): { depart?: string; ret?: string } {
  const found: string[] = [];
  const now = new Date();
  const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const future = (m: number, d: number) => {
    let y = now.getFullYear();
    if (new Date(y, m, d).getTime() < now.getTime() - 86400000) y += 1;
    return iso(y, m, d);
  };
  const re = new RegExp(`\\b(${MONTHS.map((x) => x.slice(0, 3)).join("|")})[a-z]*\\.?\\s+(\\d{1,2})\\b`, "gi");
  let mth: RegExpExecArray | null;
  while ((mth = re.exec(text)) && found.length < 2) {
    const mi = MONTHS.findIndex((x) => x.startsWith(mth![1].toLowerCase()));
    const day = Number(mth![2]);
    if (mi >= 0 && day >= 1 && day <= 31) found.push(future(mi, day));
  }
  if (found.length < 2) {
    const nre = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
    let nm: RegExpExecArray | null;
    while ((nm = nre.exec(text)) && found.length < 2) {
      const mo = Number(nm[1]) - 1, day = Number(nm[2]);
      if (mo >= 0 && mo <= 11 && day >= 1 && day <= 31) {
        const y = nm[3] ? (nm[3].length === 2 ? 2000 + Number(nm[3]) : Number(nm[3])) : undefined;
        found.push(y ? iso(y, mo, day) : future(mo, day));
      }
    }
  }
  return { depart: found[0], ret: found[1] };
}

const NAV: { re: RegExp; path: string; say: string }[] = [
  { re: /family vault/i, path: "/dashboard/family-vault", say: "Opening your Family Vault." },
  { re: /\b(my )?memories\b|add a memory|my photos/i, path: "/dashboard/media", say: "Opening My Memories — add photos, videos, and keepsakes here." },
  { re: /\bfinish|unfinished|what.*(left|need)/i, path: "/dashboard/journeys?filter=draft", say: "Here are the drafts waiting for you to finish." },
  { re: /\b(my )?journeys\b|show.*journeys/i, path: "/dashboard/journeys", say: "Here are your Journeys." },
  { re: /search flights|find (a |me )?flight|compare flights/i, path: "/dashboard/concierge/flights", say: "Opening flight search." },
  { re: /concierge services|hotels?|rental car|book a car|travel services|excursion|reservation/i, path: "/dashboard/concierge", say: "Here are your Concierge services." },
  { re: /create|new journey|birthday page|make a.*(page|journey|moment)/i, path: "/dashboard/create", say: "Let's create something. Choose a Journey to begin." },
  { re: /messages|notifications/i, path: "/dashboard/messages", say: "Here are your messages." },
  { re: /sharing|share link/i, path: "/dashboard/sharing", say: "Here is your sharing center." },
  { re: /purchases|billing|receipts/i, path: "/dashboard/purchases", say: "Opening your purchases." },
  { re: /settings|my account/i, path: "/dashboard/settings", say: "Opening Account & Settings." },
  { re: /home estate|my home/i, path: "/dashboard/home", say: "Welcome to your Home Estate." },
  { re: /dashboard|overview/i, path: "/dashboard", say: "Here is your dashboard." },
];

export default function MagicalAssistant({ assistantName, firstName, sessionKey }: { assistantName: string; firstName: string; sessionKey: string }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const [on, setOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<UsedProvider | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const mutedRef = useRef(false);
  const prefs = useRef(loadPrefs());
  // The welcome is spoken once per SIGNED-IN SESSION. Keying on the session id
  // means it replays after a genuine sign-out/in, but never on toggles, reopens,
  // route changes, or refreshes within the same session.
  const welcomeKey = `mmr:welcome:${sessionKey || "anon"}`;

  const hasSR = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Restore session state (persists across route changes and reloads within the
  // session). NEVER speaks on mount — restoring is silent.
  useEffect(() => {
    try {
      const savedMsgs = JSON.parse(sessionStorage.getItem(MSG_KEY) || "[]");
      if (Array.isArray(savedMsgs) && savedMsgs.length) setMsgs(savedMsgs);
      if (sessionStorage.getItem(ON_KEY) === "1") {
        setOn(true); // reopen silently — do NOT re-greet
      } else if (prefs.current.autostart && sessionStorage.getItem(welcomeKey) !== "1") {
        setTimeout(() => activate(true), 700); // first entry only
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { try { sessionStorage.setItem(MSG_KEY, JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { try { sessionStorage.setItem(ON_KEY, on ? "1" : "0"); } catch {} }, [on]);
  useEffect(() => { if (on && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, on, busy]);
  // Stop all audio if the assistant unmounts (leaving the dashboard / sign-out).
  useEffect(() => () => cancelSpeech(), []);

  // Let other parts of the dashboard (e.g. a Journey area) open Journey with a
  // question already in the box. Opens WITHOUT re-greeting.
  useEffect(() => {
    function onOpen(e: Event) {
      const seed = (e as CustomEvent<{ seed?: string }>).detail?.seed;
      setOn(true);
      if (seed) setInput(seed);
    }
    window.addEventListener("mmr:open-magical", onOpen as EventListener);
    return () => window.removeEventListener("mmr:open-magical", onOpen as EventListener);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (mutedRef.current) { onDone?.(); return; } // muted → captions only, no audio
    speakNatural(text, { persona: "journey", onProvider: (p) => setVoiceProvider(p), onStart: () => setSpeaking(true), onEnd: () => { setSpeaking(false); onDone?.(); } });
  }, []);

  function chime() {
    const p = loadPrefs();
    if (!p.soundOn) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 0.4; master.connect(ctx.destination);
      const t0 = ctx.currentTime; const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i % 2 ? "sine" : "triangle"; o.frequency.value = f;
        const s = t0 + i * 0.14;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.2 / (i + 1) + 0.05, s + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 1.7);
        o.connect(g); g.connect(master); o.start(s); o.stop(s + 1.8);
      });
    } catch { /* ignore */ }
  }

  /** Play the FULL welcome. Once per session unless `force` (Replay welcome). */
  function playWelcome(force: boolean) {
    if (!force && sessionStorage.getItem(welcomeKey) === "1") return;
    sessionStorage.setItem(welcomeKey, "1");
    const greet = assistantGreeting({ assistantName, firstName, firstTime: msgs.length === 0 });
    setMsgs((m) => (m.length && m[m.length - 1].content === greet ? m : [...m, { role: "assistant", content: greet }]));
    setTimeout(() => speak(greet), prefs.current.soundOn ? 900 : 150);
  }

  function activate(auto = false) {
    setOn(true);
    const welcomed = sessionStorage.getItem(welcomeKey) === "1";
    if (!welcomed) {
      if (!auto) chime();
      playWelcome(false);
    } else if (!auto) {
      // Re-opening in the same session: a brief acknowledgement, never the intro.
      speak("I'm back. How can I help?");
    }
  }

  function turnOff() {
    setOn(false);
    stopListening();
    cancelSpeech();      // stop current speech immediately
    setSpeaking(false);  // history is kept; welcome flag is untouched
  }

  function toggle() { if (on) turnOff(); else activate(false); }

  function replayWelcome() {
    cancelSpeech();
    playWelcome(true);
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (next) cancelSpeech(); // muting stops any current speech
      return next;
    });
  }

  // ---- Voice input (browser Web Speech API) ----
  function ensureRecog() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    if (recogRef.current) return recogRef.current;
    const r = new SR(); r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    let finalText = "";
    r.onresult = (e: any) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; finalText = t; setInput(t); };
    r.onerror = () => setListening(false);
    r.onend = () => { setListening(false); const t = finalText.trim(); finalText = ""; if (t) handle(t); };
    recogRef.current = r; return r;
  }
  function startListening() {
    const r = ensureRecog(); if (!r) return;
    cancelSpeech(); setSpeaking(false); setInput("");
    try { r.start(); setListening(true); } catch {}
  }
  function stopListening() { setListening(false); try { recogRef.current?.stop(); } catch {} }

  async function handle(text: string) {
    const clean = text.trim(); if (!clean || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: clean }]);

    if (/\b(fly|flight|flights|airfare)\b/i.test(clean) && /\bto\b/i.test(clean)) {
      const dest = clean.match(/\bto\s+([A-Za-z][A-Za-z .'-]*?)(?:\s+(?:on|for|departing|leaving|next|this|from|,|and|\.|$))/i)?.[1]?.trim();
      const dates = parseTripDates(clean);
      const line = "Absolutely. I'll open flight search and compare the available test flights for you now.";
      setMsgs((m) => [...m, { role: "assistant", content: line }]);
      speak(line);
      const params = new URLSearchParams();
      if (dest) params.set("toLabel", dest);
      if (dates.depart) params.set("depart", dates.depart);
      if (dates.ret) params.set("return", dates.ret);
      const qs = params.toString();
      router.push(`/dashboard/concierge/flights${qs ? `?${qs}` : ""}`);
      return;
    }

    if (looksLikeConciergeRequest(clean)) {
      const line = "I'll bring in your Concierge to help with that.";
      setMsgs((m) => [...m, { role: "assistant", content: line }]);
      const openConcierge = () => window.dispatchEvent(new CustomEvent("mmr:open-concierge", { detail: { seed: clean } }));
      if (loadPrefs().voiceOn && !mutedRef.current) speak(line, openConcierge);
      else openConcierge();
      return;
    }
    const nav = NAV.find((n) => n.re.test(clean));
    if (nav) {
      setMsgs((m) => [...m, { role: "assistant", content: nav.say }]);
      speak(nav.say);
      router.push(nav.path);
      return;
    }
    setBusy(true);
    try {
      const history = [...msgs, { role: "user" as const, content: clean }];
      const res = await fetch("/api/ask-magical", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "magical", messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.reply || "I couldn't respond just now — please try again.";
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const err = "I couldn't reach my assistant service just now. Please try again in a moment.";
      setMsgs((m) => [...m, { role: "assistant", content: err }]);
    } finally { setBusy(false); }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handle(input); }
  }

  const status = !on ? "Off" : listening ? "Listening" : speaking ? "Speaking" : muted ? "Muted" : "Ready";

  return (
    <>
      {on && (
        <div className="ma-panel" role="dialog" aria-label={`${assistantName}, your Magical Assistant`}>
          <header className="ma-head">
            <div className="ma-head__id">
              <span className={`ma-orb${speaking ? " is-speaking" : ""}${listening ? " is-listening" : ""}`} aria-hidden="true">✦</span>
              <span className="ma-head__t">{assistantName}
                <small className={`ma-status ma-status--${status.toLowerCase()}`}>{status}{voiceProvider ? ` · ${PROVIDER_LABEL[voiceProvider]}` : ""}</small>
              </span>
            </div>
            <div className="ma-head__ctrls">
              <button type="button" className="ma-ctrl" onClick={toggleMute} aria-pressed={muted} title={muted ? "Unmute voice" : "Mute voice"}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" className="ma-ctrl ma-ctrl--off" onClick={turnOff} aria-label={`Turn off ${assistantName}`}>Turn Off</button>
            </div>
          </header>

          <div className="ma-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`ma-msg ma-msg--${m.role}`}>
                {m.role === "assistant" && <span className="ma-ava" aria-hidden="true">✦</span>}
                <div className="ma-bubble" dangerouslySetInnerHTML={fmt(m.content)} />
              </div>
            ))}
            {busy && <div className="ma-msg ma-msg--assistant"><span className="ma-ava" aria-hidden="true">✦</span><div className="ma-bubble ma-typing"><span></span><span></span><span></span></div></div>}
          </div>

          <div className="ma-input">
            <button
              type="button"
              className={`ma-mic${listening ? " is-on" : ""}`}
              onClick={() => (listening ? stopListening() : startListening())}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Tap to speak"}
              title={hasSR ? (listening ? "Listening — tap to stop" : "Tap to speak") : "Voice input needs Chrome or Edge"}
              disabled={!hasSR}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" /></svg>
            </button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} rows={1}
              placeholder={listening ? "Listening…" : `Ask ${assistantName}…`} aria-label={`Message ${assistantName}`} />
            <button type="button" className="ma-send" onClick={() => handle(input)} disabled={busy || !input.trim()} aria-label="Send">↑</button>
          </div>
          <p className="ma-fine">
            <button type="button" className="ma-replay" onClick={replayWelcome}>↻ Replay welcome</button>
            <span>{hasSR ? "Tap the mic to speak — I only listen while it's on." : "Voice input works in Chrome & Edge."}</span>
          </p>
        </div>
      )}

      {/* Persistent on/off control — glowing when off, active when on. */}
      <button
        type="button"
        className={`ma-toggle${on ? " is-on" : " is-off"}`}
        data-tour="assistant"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? `Turn off ${assistantName}` : `Turn on ${assistantName}, your Magical Assistant`}
      >
        <span className="ma-toggle__orb" aria-hidden="true">✦</span>
        <span className="ma-toggle__txt">{on ? "Turn Off" : "Turn On"} <b>{assistantName}</b></span>
      </button>
    </>
  );
}
