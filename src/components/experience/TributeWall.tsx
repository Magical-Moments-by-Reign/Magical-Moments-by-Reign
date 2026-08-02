"use client";

import { useEffect, useState } from "react";

interface Tribute {
  id: string;
  name: string;
  relationship?: string | null;
  body: string;
  kind: string;
  createdAt: string;
}

/** A public wall where loved ones leave a message or a poem/tribute. */
export default function TributeWall({
  slug,
  kind,
  cta,
  placeholder,
  emptyText,
}: {
  slug: string;
  kind: "message" | "poem";
  cta: string;
  placeholder: string;
  emptyText: string;
}) {
  const [items, setItems] = useState<Tribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/tributes?slug=${encodeURIComponent(slug)}&kind=${kind}`)
      .then((r) => r.json())
      .then((d) => { if (active) setItems(d.tributes ?? []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, kind]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) { setError("Please add your name and a few words."); setStatus("error"); return; }
    setStatus("sending"); setError("");
    try {
      const res = await fetch("/api/tributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind, name, relationship, body }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); setStatus("error"); return; }
      setItems((prev) => [data, ...prev]);
      setName(""); setRelationship(""); setBody(""); setOpen(false); setStatus("idle");
    } catch {
      setError("Something went wrong. Please try again."); setStatus("error");
    }
  };

  return (
    <div className={`mbr-wall mbr-wall--${kind}`}>
      <div className="mbr-wall__actions">
        <button type="button" className="mbr-btn mbr-btn--accent" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : cta}
        </button>
      </div>

      {open && (
        <form className="mbr-wall__form" onSubmit={submit}>
          <div className="mbr-wall__row">
            <label>
              <span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </label>
            <label>
              <span>Relationship <em>(optional)</em></span>
              <input value={relationship} onChange={(e) => setRelationship(e.target.value)} maxLength={60} placeholder="Granddaughter, friend…" />
            </label>
          </div>
          <label>
            <span>{kind === "poem" ? "Your poem or tribute" : "Your message"}</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={kind === "poem" ? 6 : 4} placeholder={placeholder} maxLength={4000} required />
          </label>
          {status === "error" && <p className="mbr-wall__error">{error}</p>}
          <button type="submit" className="mbr-btn mbr-btn--primary" disabled={status === "sending"}>
            {status === "sending" ? "Sharing…" : "Share"}
          </button>
        </form>
      )}

      <div className="mbr-wall__list">
        {loading ? (
          <p className="mbr-wall__empty">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mbr-wall__empty">{emptyText}</p>
        ) : (
          items.map((t) => (
            <figure className={`mbr-wall__item mbr-wall__item--${t.kind}`} key={t.id}>
              <blockquote>{t.body}</blockquote>
              <figcaption>
                — {t.name}{t.relationship ? <span className="mbr-wall__rel">, {t.relationship}</span> : null}
              </figcaption>
            </figure>
          ))
        )}
      </div>
    </div>
  );
}
