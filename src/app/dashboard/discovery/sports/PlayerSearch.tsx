"use client";
// Sports — player/team status search (CLIENT ONLY). Debounced fetch against
// /api/discovery/sports/player-search, which holds the SportsDataIO key
// server-side. Shows the provider's own status/transaction data verbatim —
// never fabricates a trade or roster move that didn't come back from the API.

import { useEffect, useRef, useState } from "react";

type League = "nfl" | "cfb" | "nba" | "wnba";

const LEAGUES: { value: League; label: string }[] = [
  { value: "nfl", label: "NFL" },
  { value: "cfb", label: "College Football" },
  { value: "nba", label: "NBA" },
  { value: "wnba", label: "WNBA" },
];

interface PlayerResult {
  playerId: string;
  name: string;
  team?: string;
  position?: string;
  status?: string;
  photoUrl?: string;
  movementLabel: "Trade" | "Roster Move";
  transactions: { date?: string; type?: string; team?: string; description?: string }[] | null;
}

export default function PlayerSearch() {
  const [league, setLeague] = useState<League>("nfl");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/discovery/sports/player-search?q=${encodeURIComponent(q)}&league=${league}`)
        .then((r) => r.json())
        .then((data) => setResults(Array.isArray(data?.results) ? data.results : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, league]);

  return (
    <div className="spx-search">
      <div className="spx-search__bar">
        <select value={league} onChange={(e) => setLeague(e.target.value as League)} aria-label="League">
          {LEAGUES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a player or team name…"
          aria-label="Search a player or team"
        />
      </div>

      {loading && <p className="spx-search__hint">Searching…</p>}
      {!loading && results && results.length === 0 && query.trim().length >= 2 && (
        <p className="spx-search__hint">No match found for &ldquo;{query.trim()}&rdquo; in {LEAGUES.find((l) => l.value === league)?.label}.</p>
      )}

      {results && results.length > 0 && (
        <div className="spx-search__results">
          {results.map((p) => (
            <div className="spx-search__card" key={p.playerId}>
              <div className="spx-search__photo">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt="" />
                ) : (
                  <span aria-hidden="true">{p.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="spx-search__info">
                <b>{p.name}</b>
                <span>{[p.position, p.team].filter(Boolean).join(" · ") || "Team unavailable"}</span>
                {p.status && <span className="spx-search__status">{p.status}</span>}
              </div>
              <div className="spx-search__moves">
                {p.transactions === null ? (
                  <span className="spx-search__muted">Transaction data not available for this league.</span>
                ) : p.transactions.length === 0 ? (
                  <span className="spx-search__muted">No recent {p.movementLabel.toLowerCase()} activity.</span>
                ) : (
                  p.transactions.slice(0, 2).map((t, i) => (
                    <span key={i} className="spx-search__move">
                      {t.type ?? p.movementLabel}{t.team ? ` — ${t.team}` : ""}{t.description ? `: ${t.description}` : ""}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
