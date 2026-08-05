"use client";

// ── Magical Concierge — in-app chat ─────────────────────────────
// A floating, luxury chat assistant that lives inside the member dashboard.
// It is NOT a contact form: it opens in place (slide-out panel on desktop,
// full-height bottom sheet on mobile) and talks to /api/ask-magical, which is
// Qwen-backed with an honest offline fallback — it never fabricates an answer,
// a price, or a completed booking.
//
// Opened by its own floating button OR by any element that dispatches the
// window event `mmr:open-concierge` (e.g. the sidebar "OPEN CONCIERGE" button),
// so the Concierge is reachable from anywhere in the dashboard.

import { useEffect, useRef, useState } from "react";
import { CONCIERGE_OPENING } from "@/lib/concierge-intent";
import "./concierge.css";

interface Msg { role: "user" | "assistant"; content: string; }

const WELCOME: Msg = { role: "assistant", content: CONCIERGE_OPENING };

// Key used to hand a request off from Ask Magical (possibly across a page
// navigation) into the Concierge without the member repeating themselves.
const SEED_KEY = "mmr:concierge-seed";

// Suggested starters. "Ask a question" just focuses the input; the rest send.
const SUGGESTIONS = [
  "Help me plan a dinner",
  "Find ideas for my celebration",
  "Help me book a restaurant",
  "Create a checklist",
  "Help me plan a trip",
  "Find a vendor",
  "Set a reminder",
  "Help me build my Journey",
  "Ask a question",
];

// Minimal safe formatter: escape HTML, then render **bold** and line breaks.
function format(text: string): { __html: string } {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bolded = esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return { __html: bolded.replace(/\n/g, "<br/>") };
}

export default function ConciergeChat({ hideLauncher = false }: { hideLauncher?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHuman, setShowHuman] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, open, minimized, busy]);

  // Let the sidebar card (or Ask Magical's handoff) open the Concierge,
  // optionally seeding the original request so the member needn't repeat it.
  useEffect(() => {
    function onOpen(e: Event) {
      setOpen(true);
      setMinimized(false);
      const seed = (e as CustomEvent<{ seed?: string }>).detail?.seed;
      if (seed) setInput(seed);
    }
    window.addEventListener("mmr:open-concierge", onOpen as EventListener);
    return () => window.removeEventListener("mmr:open-concierge", onOpen as EventListener);
  }, []);

  // Pick up a request handed off from Ask Magical across a page navigation.
  useEffect(() => {
    try {
      const seed = sessionStorage.getItem(SEED_KEY);
      if (seed) {
        sessionStorage.removeItem(SEED_KEY);
        setOpen(true);
        setMinimized(false);
        setInput(seed);
      }
    } catch { /* sessionStorage unavailable — ignore */ }
  }, []);

  async function sendText(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...msgs, { role: "user" as const, content: clean }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask-magical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "concierge",
          messages: next.filter((m) => m !== WELCOME).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "Sorry — I couldn't respond just now. Please try again." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry — I couldn't reach the Concierge just now. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  function onSuggestion(s: string) {
    if (s === "Ask a question") {
      inputRef.current?.focus();
      return;
    }
    sendText(s);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(input); }
  }

  const showSuggestions = msgs.length <= 1;

  return (
    <>
      {(!open || minimized) && !hideLauncher && (
        <button
          type="button"
          className="cc-fab"
          onClick={() => { setOpen(true); setMinimized(false); }}
          aria-label="Open Magical Concierge"
        >
          <span className="cc-fab__mark" aria-hidden="true">✦</span>
          <span className="cc-fab__label">Concierge</span>
        </button>
      )}

      {open && !minimized && (
        <div className="cc-panel" role="dialog" aria-label="Magical Concierge">
          <header className="cc-head">
            <div className="cc-head__title">
              <span className="cc-head__mark" aria-hidden="true">✦</span>
              <span>
                Magical <i>Concierge</i>
                <small>Your personal luxury assistant</small>
              </span>
            </div>
            <div className="cc-head__ctrls">
              {!hideLauncher && <button type="button" className="cc-ctrl" onClick={() => setMinimized(true)} aria-label="Minimize" title="Minimize">–</button>}
              <button type="button" className="cc-ctrl" onClick={() => setOpen(false)} aria-label="Close" title="Close">×</button>
            </div>
          </header>

          <div className="cc-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`cc-msg cc-msg--${m.role}`}>
                {m.role === "assistant" && <span className="cc-ava" aria-hidden="true">✦</span>}
                <div className="cc-bubble" dangerouslySetInnerHTML={format(m.content)} />
              </div>
            ))}
            {busy && (
              <div className="cc-msg cc-msg--assistant">
                <span className="cc-ava" aria-hidden="true">✦</span>
                <div className="cc-bubble cc-typing"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>

          {showSuggestions && (
            <div className="cc-sugs" role="group" aria-label="Suggested prompts">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="cc-sug" onClick={() => onSuggestion(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="cc-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Tell me what you're planning…"
              aria-label="Message the Magical Concierge"
            />
            <button type="button" className="cc-send" onClick={() => sendText(input)} disabled={busy || !input.trim()} aria-label="Send">↑</button>
          </div>

          <div className="cc-foot">
            <button type="button" className="cc-human" onClick={() => setShowHuman((v) => !v)} aria-expanded={showHuman}>
              Need human support?
            </button>
            {showHuman && (
              <p className="cc-human__body">
                A real person is happy to help. Email{" "}
                <a href="mailto:info@magicalmomentsbyreign.com">info@magicalmomentsbyreign.com</a>{" "}
                or visit <a href="/contact">Contact</a>.
              </p>
            )}
            <p className="cc-fine">
              The Concierge helps you plan and organize. It never completes a reservation, payment, or
              vendor booking that isn&rsquo;t connected yet — it will say so and mark it “Coming Soon.”
            </p>
          </div>
        </div>
      )}
    </>
  );
}
