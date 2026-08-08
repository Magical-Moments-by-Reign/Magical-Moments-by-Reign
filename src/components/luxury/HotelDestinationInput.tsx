"use client";

// Destination autocomplete for hotel search. Debounced; calls our server route
// (which holds the Hotelbeds credentials) and shows REAL destination records.
// On select it fills a hidden destinationCode/destinationName so search uses the
// resolved code. Typing free text and submitting still works — the results page
// resolves it server-side (with disambiguation).

import { useEffect, useRef, useState } from "react";

interface Match { code: string; name: string; country?: string; region?: string; provider: string }

export default function HotelDestinationInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [text, setText] = useState(defaultValue);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Selecting a match sets `name` === text; don't re-query in that case.
    if (!text || text.length < 2 || text === name) { setMatches([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/luxury/hotel-destinations?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        setMatches(Array.isArray(data?.matches) ? data.matches : []);
        setOpen(true);
      } catch { setMatches([]); }
      finally { setLoading(false); }
    }, 250); // short debounce
    return () => clearTimeout(t);
  }, [text, name]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(m: Match) {
    const label = [m.name, m.country].filter(Boolean).join(", ");
    setText(label); setName(label); setCode(m.code); setMatches([]); setOpen(false);
  }

  return (
    <label className="cx-field ho-ac" ref={boxRef as never} htmlFor="ho-dest">
      <span className="cx-field__label">Destination *</span>
      <input
        id="ho-dest" name="location" required autoComplete="off"
        value={text}
        placeholder="City, area, or hotel name"
        onChange={(e) => { setText(e.target.value); setCode(""); setName(""); }}
        onFocus={() => matches.length && setOpen(true)}
      />
      {/* Resolved code travels internally; the member never sees or types it. */}
      <input type="hidden" name="destinationCode" value={code} />
      <input type="hidden" name="destinationName" value={name} />
      {open && (matches.length > 0 || loading) && (
        <div className="ho-ac__menu">
          {loading && matches.length === 0 && <div className="ho-ac__loading">Searching…</div>}
          {matches.map((m) => (
            <button key={`${m.code}-${m.name}`} type="button" className="ho-ac__item" onClick={() => choose(m)}>
              <span className="ho-ac__name">{m.name}</span>
              <span className="ho-ac__sub">{[m.region, m.country].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
