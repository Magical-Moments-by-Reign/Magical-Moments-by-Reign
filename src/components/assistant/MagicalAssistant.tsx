"use client";

// ── The named live Magical Assistant (Ask Magical) ──────────────
// A soft blinking gold button lives across the signed-in dashboard. When the
// member turns it ON it greets them by the assistant's chosen name, then stays
// available for the whole session (it does NOT re-greet on route changes). It
// can: navigate the app (working now), answer via the Qwen brain / honest
// offline fallback (connected but limited), speak responses + take voice input
// through the browser (connected but limited), and hand off Concierge requests.
//
// Privacy: the microphone is never accessed unless the member taps it; a visible
// "Listening" indicator shows whenever it is; no audio is stored.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { assistantGreeting } from "@/lib/assistant-name";
import { looksLikeConciergeRequest } from "@/lib/concierge-intent";
import { loadPrefs } from "@/lib/assistant-prefs";
import { speak as speakNatural, cancel as cancelSpeech } from "@/lib/voice/speech";
import "./magical-assistant.css";

interface Msg { role: "user" | "assistant"; content: string; }
const MSG_KEY = "mmr:assistant-msgs";
const ON_KEY = "mmr:assistant-on";
const GREET_KEY = "mmr:assistant-greeted";
const CONCIERGE_SEED = "mmr:concierge-seed";

function fmt(text: string): { __html: string } {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return { __html: esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") };
}

// Best-effort natural-date parse for the flight handoff ("October 10", "10/13",
// "Oct 10"). First date found = depart, second = return. Picks the next future
// occurrence. Returns ISO YYYY-MM-DD strings, or empty when unsure (never guesses
// flight data — only the dates the member actually typed).
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
  // Numeric M/D or M/D/YY as a fallback.
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

// Navigation commands the assistant can actually perform right now.
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

export default function MagicalAssistant({ assistantName, firstName }: { assistantName: string; firstName: string }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const [on, setOn] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const prefs = useRef(loadPrefs());

  const hasSR = typeof window !== "undefined" && (window as any).SpeechRecognition || (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);

  // Restore session state (persists across route changes and reloads within the session).
  useEffect(() => {
    try {
      const savedOn = sessionStorage.getItem(ON_KEY) === "1";
      const savedMsgs = JSON.parse(sessionStorage.getItem(MSG_KEY) || "[]");
      if (Array.isArray(savedMsgs) && savedMsgs.length) setMsgs(savedMsgs);
      if (savedOn) setOn(true);
      else if (prefs.current.autostart && sessionStorage.getItem(GREET_KEY) !== "1") {
        // Auto-start after entering (audio may require a tap; captions still show).
        setTimeout(() => activate(true), 700);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { try { sessionStorage.setItem(MSG_KEY, JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { try { sessionStorage.setItem(ON_KEY, on ? "1" : "0"); } catch {} }, [on]);
  useEffect(() => { if (on && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, on, busy]);

  const speak = useCallback((text: string) => {
    // Natural, style-shaped, sentence-chunked delivery (see lib/voice/speech).
    speakNatural(text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
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

  function activate(auto = false) {
    setOn(true);
    const firstThisSession = sessionStorage.getItem(GREET_KEY) !== "1";
    if (firstThisSession) {
      sessionStorage.setItem(GREET_KEY, "1");
      const greet = assistantGreeting({ assistantName, firstName, firstTime: msgs.length === 0 });
      setMsgs((m) => [...m, { role: "assistant", content: greet }]);
      if (!auto) chime();
      setTimeout(() => speak(greet), prefs.current.soundOn && !auto ? 1500 : 200);
    }
  }

  function turnOff() {
    setOn(false);
    stopListening();
    cancelSpeech();
    setSpeaking(false);
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
    cancelSpeech();  // interrupt speech when member talks
    setSpeaking(false); setInput("");
    try { r.start(); setListening(true); } catch {}
  }
  function stopListening() { setListening(false); try { recogRef.current?.stop(); } catch {} }

  // ---- Handle a member message (text or transcribed voice) ----
  async function handle(text: string) {
    const clean = text.trim(); if (!clean || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: clean }]);

    // 0) Flight SEARCH → open the luxury Flights page, carrying what we parsed
    //    (destination + dates) so the member never re-types it.
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

    // 1) Concierge handoff — never answered here.
    if (looksLikeConciergeRequest(clean)) {
      const line = "I'll bring in your Concierge to help with that.";
      setMsgs((m) => [...m, { role: "assistant", content: line }]);
      speak(line);
      try { sessionStorage.setItem(CONCIERGE_SEED, clean); } catch {}
      window.dispatchEvent(new CustomEvent("mmr:open-concierge", { detail: { seed: clean } }));
      return;
    }
    // 2) Navigation actions the assistant can really do now.
    const nav = NAV.find((n) => n.re.test(clean));
    if (nav) {
      setMsgs((m) => [...m, { role: "assistant", content: nav.say }]);
      speak(nav.say);
      router.push(nav.path);
      return;
    }
    // 3) Otherwise ask the general assistant brain (Qwen / honest offline).
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

  // ---- OFF: the soft blinking button ----
  if (!on) {
    return (
      <button type="button" className="ma-launch" data-tour="assistant" onClick={() => activate(false)} aria-label={`Turn on ${assistantName}, your Magical Assistant`}>
        <span className="ma-launch__orb" aria-hidden="true">✦</span>
        <span className="ma-launch__txt">Turn On <b>{assistantName}</b></span>
      </button>
    );
  }

  // ---- ON: the assistant panel ----
  return (
    <div className="ma-panel" role="dialog" aria-label={`${assistantName}, your Magical Assistant`}>
      <header className="ma-head">
        <div className="ma-head__id">
          <span className={`ma-orb${speaking ? " is-speaking" : ""}${listening ? " is-listening" : ""}`} aria-hidden="true">✦</span>
          <span className="ma-head__t">{assistantName}<small>Your Magical Assistant{listening ? " · Listening…" : ""}</small></span>
        </div>
        <div className="ma-head__ctrls">
          <button type="button" className="ma-ctrl" onClick={turnOff} aria-label="Turn off assistant" title="Turn off">Off</button>
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
        {hasSR ? "Tap the mic to speak — I only listen while it's on." : "Voice input works in Chrome & Edge. Typing works everywhere."}
      </p>
    </div>
  );
}
