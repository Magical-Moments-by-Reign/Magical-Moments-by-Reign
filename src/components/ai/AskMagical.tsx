"use client";

// Floating "Ask Magical" — the general app guide, available to everyone
// (signed in or not). It answers questions about how Magical Moments works
// (memberships, pricing, Journeys, features, navigation). It does NOT perform
// hands-on concierge services: when a visitor asks for one (book a flight,
// reserve dinner, find a vendor…), it hands off to the member-only Concierge.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { looksLikeConciergeRequest, CONCIERGE_SIGNIN_PROMPT } from "@/lib/concierge-intent";
import "./ask-magical.css";

interface Msg { role: "user" | "assistant"; content: string; actions?: "signin" }

const WELCOME: Msg = {
  role: "assistant",
  content: "Hi, I'm **Magical AI** ✨ — your guide to Magical Moments. Ask me about memberships, pricing, Journeys, or how anything works. For hands-on planning and bookings, your **Concierge** takes over inside your member account.",
};

const SEED_KEY = "mmr:concierge-seed";

function format(text: string): { __html: string } {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bolded = esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return { __html: bolded.replace(/\n/g, "<br/>") };
}

export default function AskMagical() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  // Inside the member dashboard, the member's NAMED Magical Assistant takes over,
  // so the generic site-wide widget steps aside to avoid two assistants at once.
  const hiddenHere = pathname.startsWith("/dashboard");

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open, busy]);

  // Know whether the visitor is signed in (drives the Concierge handoff).
  useEffect(() => {
    let alive = true;
    fetch("/api/me").then((r) => r.json()).then((d) => { if (alive) setSignedIn(Boolean(d?.signedIn)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    function onOpen(e: Event) {
      setOpen(true);
      const seed = (e as CustomEvent<{ seed?: string }>).detail?.seed;
      if (seed) setInput(seed);
    }
    window.addEventListener("mmr:ask-magical", onOpen as EventListener);
    return () => window.removeEventListener("mmr:ask-magical", onOpen as EventListener);
  }, []);

  // Route a hands-on service request to the Concierge instead of answering it.
  function handoff(text: string) {
    try { sessionStorage.setItem(SEED_KEY, text); } catch { /* ignore */ }
    if (signedIn) {
      setMsgs((m) => [...m, { role: "assistant", content: "That's a Concierge request ✦ — bringing in your **Magical Concierge** now." }]);
      if (pathname.startsWith("/dashboard")) {
        window.dispatchEvent(new CustomEvent("mmr:open-concierge", { detail: { seed: text } }));
        setOpen(false);
      } else {
        window.location.href = "/dashboard"; // Concierge auto-opens from the saved seed
      }
    } else {
      setMsgs((m) => [...m, { role: "assistant", content: CONCIERGE_SIGNIN_PROMPT, actions: "signin" }]);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");

    if (looksLikeConciergeRequest(text)) { handoff(text); return; }

    setBusy(true);
    try {
      const history = [...msgs, { role: "user" as const, content: text }].filter((m) => m !== WELCOME);
      const res = await fetch("/api/ask-magical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "magical", messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "Sorry — I couldn't respond just now. Please try again." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry — I couldn't reach the assistant. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {!open && !hiddenHere && (
        <button type="button" className="am-fab" onClick={() => setOpen(true)} aria-label="Ask Magical AI">
          <span className="am-fab__mark" aria-hidden="true">✨</span>
          <span className="am-fab__label">Ask Magical</span>
        </button>
      )}

      {open && !hiddenHere && (
        <div className="am-panel" role="dialog" aria-label="Ask Magical AI">
          <div className="am-head">
            <div className="am-head__title"><span aria-hidden="true">✨</span> Ask Magical</div>
            <button type="button" className="am-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="am-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`am-msg am-msg--${m.role}`}>
                <div className="am-bubble" dangerouslySetInnerHTML={format(m.content)} />
                {m.actions === "signin" && (
                  <div className="am-cta">
                    <a className="am-cta__b am-cta__b--gold" href="/login?next=/dashboard">SIGN IN</a>
                    <a className="am-cta__b" href="/membership">VIEW MEMBERSHIPS</a>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="am-msg am-msg--assistant"><div className="am-bubble am-typing"><span></span><span></span><span></span></div></div>}
          </div>

          <div className="am-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask about memberships, pricing, Journeys…"
              aria-label="Message Ask Magical"
            />
            <button type="button" className="am-send" onClick={send} disabled={busy || !input.trim()} aria-label="Send">↑</button>
          </div>
          <p className="am-fine">Ask Magical explains Magical Moments. For hands-on planning &amp; bookings, use the member Concierge.</p>
        </div>
      )}
    </>
  );
}
