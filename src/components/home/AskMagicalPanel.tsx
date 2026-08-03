"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// The personal concierge panel. Speaks in the customer's chosen name ("Ask
// Journey"), always with a quiet "Powered by Magical" lockup — the technology
// is Magical; the relationship is theirs. Backed by the real /api/ask-magical
// seam, which answers honestly and, when the live assistant isn't switched on,
// says so rather than fabricating.

interface Msg { role: "user" | "assistant"; content: string; }

export default function AskMagicalPanel({
  conciergeName,
  nudgeForName,
}: {
  conciergeName: string;
  nudgeForName: boolean;
}) {
  const opener: Msg = {
    role: "assistant",
    content: `Hi, I'm ${conciergeName}. I'm here to help you plan, organize, celebrate, and preserve life's meaningful moments. What's on your mind today?`,
  };

  const [messages, setMessages] = useState<Msg[]>([opener]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Remember the customer's show/hide preference for the panel (a display
  // choice — a durable per-account preference can replace this later).
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("mmr.concierge.collapsed") === "1"); } catch {}
  }, []);
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("mmr.concierge.collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  // Refresh the opener if the concierge is (re)named without a full reload.
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "assistant" ? [opener] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conciergeName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      // Only real user/assistant turns go to the API (not the display opener).
      const payload = next.filter((_, i) => i !== 0);
      const res = await fetch("/api/ask-magical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json().catch(() => null);
      const reply = data?.reply
        ?? "I couldn't reach my assistant just now. Please try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "I couldn't reach my assistant just now. Please try again in a moment.",
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="askm" aria-label={`Ask ${conciergeName}`}>
      <div className="askm__head">
        <div className="askm__ident">
          <span className="askm__avatar" aria-hidden="true">✨</span>
          <span className="askm__names">
            <span className="askm__name">Ask {conciergeName}</span>
            <span className="askm__powered">Powered by Magical</span>
          </span>
        </div>
        <button type="button" className="askm__collapse" onClick={toggleCollapsed}
          aria-expanded={!collapsed}>
          {collapsed ? "Open" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <>
          {nudgeForName && (
            <p className="askm__nudge">
              I&apos;d love a name whenever you&apos;re ready.{" "}
              <Link href="/home?welcome=1" className="askm__nudge-link">Give me a name →</Link>
            </p>
          )}

          <div className="askm__log" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`askm__msg askm__msg--${m.role}`}>{m.content}</div>
            ))}
            {busy && <div className="askm__msg askm__msg--assistant askm__msg--typing">…</div>}
          </div>

          <form className="askm__form" onSubmit={send}>
            <input
              className="askm__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${conciergeName} anything…`}
              aria-label={`Message ${conciergeName}`}
              disabled={busy}
            />
            <button type="submit" className="askm__send" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </>
      )}
    </section>
  );
}
