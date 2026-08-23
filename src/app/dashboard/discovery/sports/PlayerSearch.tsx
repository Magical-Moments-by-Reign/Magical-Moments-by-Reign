"use client";
// Sports — player/team status search (CLIENT ONLY). Debounced fetch against
// /api/discovery/sports/player-search, which holds the SportsDataIO key
// server-side. Shows the provider's own status/transaction data verbatim —
// never fabricates a trade or roster move that didn't come back from the API.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trackPlayerAction, untrackPlayerAction } from "./actions";
import PlayerAvatar from "./PlayerAvatar";

type League = "nfl" | "cfb" | "nba" | "wnba";

const LEAGUES: { value: League; label: string }[] = [
  { value: "nfl", label: "NFL" },
  { value: "cfb", label: "College Football" },
  { value: "nba", label: "NBA" },
  { value: "wnba", label: "WNBA" },
];

interface PlayerResult {
  playerId: string;
  league: League;
  name: string;
  team?: string;
  position?: string;
  status?: string;
  photoUrl?: string;
  age?: number;
  college?: string;
  experienceYears?: number;
  movementLabel: "Trade" | "Roster Move";
  transactions: { date?: string; type?: string; team?: string; description?: string }[] | null;
  withCurrentTeamSince?: { date?: string; via?: string };
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function trackedKey(league: string, playerId: string): string {
  return `${league}:${playerId}`;
}

export default function PlayerSearch({ trackedKeys }: { trackedKeys: string[] }) {
  const [league, setLeague] = useState<League>("nfl");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState<Set<string>>(() => new Set(trackedKeys));
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
          {results.map((p) => {
            const key = trackedKey(p.league, p.playerId);
            const isTracked = tracked.has(key);
            return (
            <div className="spx-search__card" key={p.playerId}>
              <div className="spx-search__top">
                <Link href={`/dashboard/discovery/sports/player/${p.league}/${p.playerId}`} className="spx-search__linkarea">
                  <PlayerAvatar photoUrl={p.photoUrl} size="lg" />
                  <div className="spx-search__info">
                    <b>{p.name}</b>
                    <span>{[p.position, p.team].filter(Boolean).join(" · ") || "Team unavailable"}</span>
                    {p.status && <span className="spx-search__status">{p.status}</span>}
                  </div>
                </Link>
                <form
                  action={isTracked ? untrackPlayerAction : trackPlayerAction}
                  onSubmit={() => setTracked((prev) => { const next = new Set(prev); if (isTracked) next.delete(key); else next.add(key); return next; })}
                >
                  <input type="hidden" name="league" value={p.league} />
                  <input type="hidden" name="playerId" value={p.playerId} />
                  {!isTracked && <input type="hidden" name="playerName" value={p.name} />}
                  {!isTracked && p.team && <input type="hidden" name="team" value={p.team} />}
                  {!isTracked && p.position && <input type="hidden" name="position" value={p.position} />}
                  <button type="submit" className={isTracked ? "spx-search__track spx-search__track--on" : "spx-search__track"}>
                    {isTracked ? "✓ Tracking" : "+ Track"}
                  </button>
                </form>
              </div>

              {(p.age || p.college || p.experienceYears || p.withCurrentTeamSince?.date) && (
                <dl className="spx-search__bio">
                  {p.age && <div><dt>Age</dt><dd>{p.age}</dd></div>}
                  {p.college && <div><dt>College</dt><dd>{p.college}</dd></div>}
                  {typeof p.experienceYears === "number" && <div><dt>Experience</dt><dd>{p.experienceYears} season{p.experienceYears === 1 ? "" : "s"}</dd></div>}
                  {formatDate(p.withCurrentTeamSince?.date) && <div><dt>With {p.team ?? "team"}</dt><dd>Since {formatDate(p.withCurrentTeamSince?.date)}</dd></div>}
                </dl>
              )}

              {p.transactions && p.transactions.length > 0 && (
                <div className="spx-search__moves">
                  <span className="spx-search__label">Recent {p.movementLabel === "Trade" ? "transactions" : "roster moves"}</span>
                  {p.transactions.slice(0, 2).map((t, i) => (
                    <span key={i} className="spx-search__move">
                      {formatDate(t.date) && <b>{formatDate(t.date)}: </b>}
                      {t.type ?? p.movementLabel}{t.team ? ` — ${t.team}` : ""}{t.description ? `: ${t.description}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
