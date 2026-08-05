"use client";

// ── First-time guided Magical Space tour ────────────────────────
// The member's named assistant personally walks them through the dashboard.
// Each step spotlights a real element (soft gold hole + glow) and narrates
// (spoken when voice is on; captions always). Controls: Back / Next / Skip /
// Replay audio / Voice on-off / Exit, with a "Step X of N" counter.
//
// Auto-offers only on first entry (autoOffer), never re-nags once finished or
// skipped (persisted server-side via completeTourAction). Replayable from
// Settings (which sets sessionStorage "mmr:tour-replay"). Degrades to a centered
// card when a target isn't on screen (e.g. mobile drawer), still narrated.

import { useCallback, useEffect, useRef, useState } from "react";
import { loadPrefs, savePrefs } from "@/lib/assistant-prefs";
import { completeTourAction } from "./tour-actions";
import "./guided-tour.css";

interface Step { target?: string; title: string; body: string; }

function steps(name: string): Step[] {
  return [
    { target: "home", title: "Your Home", body: "This is your Home inside Magical Moments. Here you'll see the occasions and Journeys included with your membership or purchased for your account — not the whole catalog." },
    { target: "journeys", title: "My Journeys", body: "This is where you'll find every Journey you own, create, or help build. Continue editing, preview your work, manage privacy, and share — all from here." },
    { target: "create", title: "Create a Moment", body: "When you're ready to begin something new, start here. Select an occasion, choose a design, add your story, and bring your moment to life. Some occasions may require a purchase — we'll always show that honestly." },
    { title: "My Memories", body: "Your photos, videos, stories, voice memories, documents, and treasured keepsakes are organized and preserved in My Memories." },
    { target: "family-vault", title: "Family Vault", body: "Your Family Vault is your private space for meaningful family memories, important documents, traditions, and treasured pieces of your story." },
    { target: "sharing", title: "Sharing", body: "Sharing gives you control over who can see or help with your Journeys — private links, public links, QR codes, and collaborator invitations." },
    { target: "messages", title: "Messages", body: "Here you'll find messages from collaborators, support, me, and your Concierge conversations." },
    { target: "assistant", title: `Meet ${name}`, body: `I'm ${name} — I help you understand Magical Moments, navigate the app, build Journeys, organize memories, and answer questions. You'll see my softly blinking button throughout your space; tap it anytime to turn me on or off.` },
    { target: "concierge", title: "Concierge", body: "Concierge is your hands-on service assistant for planning, dining, travel, reservations, vendors, and other eligible services connected to your membership or purchases. It's separate from me." },
    { target: "purchases", title: "Purchases & Membership", body: "Here you can view your plan, purchased occasions, included services, receipts, renewals, and available upgrades." },
    { target: "settings", title: "Account & Settings", body: "This is where you update your profile, my name and voice, privacy, notifications, security, membership, and preferences." },
  ];
}

export default function GuidedTour({ autoOffer, assistantName, firstName }: { autoOffer: boolean; assistantName: string; firstName: string }) {
  const [phase, setPhase] = useState<"idle" | "offer" | "running">("idle");
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const list = useRef<Step[]>(steps(assistantName));

  // Decide whether to show on mount: replay flag wins; else auto-offer once.
  useEffect(() => {
    setVoiceOn(loadPrefs().voiceOn);
    try {
      if (sessionStorage.getItem("mmr:tour-replay") === "1") {
        sessionStorage.removeItem("mmr:tour-replay");
        start();
        return;
      }
    } catch {}
    if (autoOffer) setPhase("offer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const p = loadPrefs(); u.rate = p.speed; u.pitch = 1.02;
      const vs = window.speechSynthesis.getVoices();
      const v = (p.voiceURI && vs.find((x) => x.voiceURI === p.voiceURI)) || vs.find((x) => /female|Samantha|Victoria|Zira|Aria|Jenny/i.test(x.name) && /en/i.test(x.lang));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch {}
  }, [voiceOn]);

  const locate = useCallback((idx: number) => {
    const step = list.current[idx];
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    // Measure after the scroll settles.
    setTimeout(() => { const r = el.getBoundingClientRect(); setRect(r.width && r.height ? r : null); }, 260);
  }, []);

  function goto(idx: number) {
    const clamped = Math.max(0, Math.min(list.current.length - 1, idx));
    setI(clamped);
    locate(clamped);
    const s = list.current[clamped];
    const intro = clamped === 0 ? `Welcome to your Magical Space, ${firstName || "friend"}. I'm ${assistantName}, your personal Magical Assistant. Let me show you around — each area will light up so you know exactly where to go. ` : "";
    speak(intro + s.title + ". " + s.body);
  }

  function start() { setPhase("running"); setTimeout(() => goto(0), 50); }
  async function finish(kind: "done" | "skip") {
    try { window.speechSynthesis?.cancel(); } catch {}
    setPhase("idle");
    try { await completeTourAction(); } catch {}
  }

  // Reposition on resize/scroll while running.
  useEffect(() => {
    if (phase !== "running") return;
    const on = () => locate(i);
    window.addEventListener("resize", on); window.addEventListener("scroll", on, true);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("scroll", on, true); };
  }, [phase, i, locate]);

  if (phase === "idle") return null;

  if (phase === "offer") {
    return (
      <div className="gt-scrim gt-scrim--offer" role="dialog" aria-label="Magical Space tour">
        <div className="gt-offer">
          <span className="gt-orb" aria-hidden="true">✦</span>
          <h2>Welcome, {firstName || "friend"}.</h2>
          <p>I&rsquo;m <b>{assistantName}</b>, your personal Magical Assistant. Would you like me to walk you through your new Magical Space? It only takes a minute.</p>
          <div className="gt-offer__cta">
            <button className="gt-btn gt-btn--gold" onClick={start}>Start the tour</button>
            <button className="gt-btn" onClick={() => finish("skip")}>Skip for now</button>
          </div>
          <p className="gt-fine">You can replay this anytime from Account &amp; Settings.</p>
        </div>
      </div>
    );
  }

  // running
  const s = list.current[i];
  const pad = 8;
  const hole = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  // Place the caption card: below the target if room, else centered.
  const cardStyle: React.CSSProperties = hole
    ? (hole.top + hole.height + 220 < window.innerHeight
        ? { top: hole.top + hole.height + 14, left: Math.max(14, Math.min(hole.left, window.innerWidth - 380)) }
        : { top: Math.max(14, hole.top - 210), left: Math.max(14, Math.min(hole.left, window.innerWidth - 380)) })
    : {};

  return (
    <div className="gt-scrim" role="dialog" aria-label={`Tour step ${i + 1}`}>
      {hole && <div className="gt-hole" style={hole} aria-hidden="true" />}
      <div className={`gt-card${hole ? "" : " gt-card--center"}`} style={cardStyle}>
        <div className="gt-card__top">
          <span className="gt-step">Step {i + 1} of {list.current.length}</span>
          <span className="gt-orb gt-orb--sm" aria-hidden="true">✦</span>
        </div>
        <h3>{s.title}</h3>
        <p className="gt-cap">{s.body}</p>
        <div className="gt-row">
          <button className="gt-btn gt-btn--sm" onClick={() => goto(i - 1)} disabled={i === 0}>Back</button>
          {i < list.current.length - 1
            ? <button className="gt-btn gt-btn--sm gt-btn--gold" onClick={() => goto(i + 1)}>Next</button>
            : <button className="gt-btn gt-btn--sm gt-btn--gold" onClick={() => finish("done")}>Finish</button>}
          <button className="gt-btn gt-btn--sm" onClick={() => speak(s.title + ". " + s.body)} title="Replay audio">↻ Audio</button>
          <button className="gt-btn gt-btn--sm" onClick={() => { const n = !voiceOn; setVoiceOn(n); savePrefs({ voiceOn: n }); if (!n) window.speechSynthesis?.cancel(); }}>
            {voiceOn ? "Voice off" : "Voice on"}
          </button>
        </div>
        <div className="gt-row gt-row--foot">
          <button className="gt-link" onClick={() => finish("skip")}>Skip tour</button>
          <button className="gt-link" onClick={() => finish("skip")}>Exit</button>
        </div>
      </div>
    </div>
  );
}
