"use client";

// Floating "Ask Magical" AI concierge, available site-wide. Talks to
// /api/ask-magical (Qwen-backed, with a graceful offline reply). Warm,
// brief, never pushy — per the Founder Constitution, Article V.

import { useEffect, useRef, useState } from "react";
import "./ask-magical.css";

interface Msg { role: "user" | "assistant"; content: string; }

const WELCOME: Msg = {
  role: "assistant",
  content: "Hi, I'm **Magical AI** ✨ — your guide to weddings, babies, vacations, new homes and every Life Journey. Ask me anything, or tell me what you're planning.",
};

// Minimal, safe formatter: escape HTML, then render **bold** and line breaks.
function format(text: string): { __html: string } {
  const esc = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bolded = esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return { __html: bolded.replace(/\n/g, "<br/>") };
}

export default function AskMagical() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask-magical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== WELCOME).map((m) => ({ role: m.role, content: m.content })) }),
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
      {!open && (
        <button type="button" className="am-fab" onClick={() => setOpen(true)} aria-label="Ask Magical AI">
          <span className="am-fab__mark" aria-hidden="true">✦</span>
          <span className="am-fab__label">Ask Magical</span>
        </button>
      )}

      {open && (
        <div className="am-panel" role="dialog" aria-label="Ask Magical AI">
          <div className="am-head">
            <div className="am-head__title"><span aria-hidden="true">✦</span> Magical AI</div>
            <button type="button" className="am-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="am-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`am-msg am-msg--${m.role}`}>
                <div className="am-bubble" dangerouslySetInnerHTML={format(m.content)} />
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
              placeholder="Ask about a Journey, pricing, planning…"
              aria-label="Message Magical AI"
            />
            <button type="button" className="am-send" onClick={send} disabled={busy || !input.trim()} aria-label="Send">↑</button>
          </div>
          <p className="am-fine">Magical AI can make mistakes. For legal, medical, or financial matters, please consult a licensed professional.</p>
        </div>
      )}
    </>
  );
}
