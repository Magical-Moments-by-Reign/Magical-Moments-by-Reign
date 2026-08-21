"use client";
// Live typeahead for the Near You search box — debounced, calls our own
// /api/near-you/suggest route (which holds the Ticketmaster key server-side)
// and shows only real Ticketmaster attraction/venue matches, grouped the
// same way Ticketmaster's own search does. Typing free text and submitting
// without picking a suggestion still works normally.

import { useEffect, useRef, useState } from "react";

interface Suggestion { id: string; name: string; kind: "attraction" | "venue"; subtitle?: string; imageUrl?: string }

export default function NearYouSearchInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [text, setText] = useState(defaultValue);
  const [matches, setMatches] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickedName, setPickedName] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!text || text.length < 2 || text === pickedName) { setMatches([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/near-you/suggest?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        setMatches(Array.isArray(data?.matches) ? data.matches : []);
        setOpen(true);
      } catch { setMatches([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [text, pickedName]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(m: Suggestion) {
    setText(m.name); setPickedName(m.name); setMatches([]); setOpen(false);
  }

  const attractions = matches.filter((m) => m.kind === "attraction");
  const venues = matches.filter((m) => m.kind === "venue");

  return (
    <div className="near-search__seg-text near-search__ac" ref={boxRef}>
      <label htmlFor="near-q">Search</label>
      <input
        id="near-q" type="text" name="q" placeholder="Artist, event, or venue" autoComplete="off"
        value={text}
        onChange={(e) => { setText(e.target.value); setPickedName(""); }}
        onFocus={() => matches.length && setOpen(true)}
      />
      {open && (matches.length > 0 || loading) && (
        <div className="near-search__ac-menu">
          {loading && matches.length === 0 && <div className="near-search__ac-loading">Searching…</div>}
          {attractions.length > 0 && (
            <>
              <div className="near-search__ac-group">Artists, Teams &amp; Attractions</div>
              {attractions.map((m) => (
                <button key={m.id} type="button" className="near-search__ac-item" onClick={() => choose(m)}>
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt="" />
                  ) : <span className="near-search__ac-fallback" aria-hidden="true">✦</span>}
                  <span>
                    <b>{m.name}</b>
                    {m.subtitle && <span>{m.subtitle}</span>}
                  </span>
                </button>
              ))}
            </>
          )}
          {venues.length > 0 && (
            <>
              <div className="near-search__ac-group">Venues</div>
              {venues.map((m) => (
                <button key={m.id} type="button" className="near-search__ac-item" onClick={() => choose(m)}>
                  <span className="near-search__ac-fallback" aria-hidden="true">📍</span>
                  <span>
                    <b>{m.name}</b>
                    {m.subtitle && <span>{m.subtitle}</span>}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
