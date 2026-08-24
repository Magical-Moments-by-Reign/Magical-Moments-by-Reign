"use client";
// Shared "Live Now" panel — polls /api/discovery/sports/live-scores every
// 15s and swaps in the fresh game list, so scores/periods actually update
// without a manual page reload. Same poll-and-replace pattern as
// LiveGameCenter.tsx's single-game poll. Reused in two places:
//   - the Schedule page (src/.../schedule/page.tsx) — every live game,
//     across every sport, as its own dedicated "Live Now" section.
//   - the individual Live Game Center (src/.../game/[id]/page.tsx) — the
//     SAME cross-sport list, minus the game already being viewed, so a
//     member can jump straight to another live game without backing out.
// Server-rendered `initialGames` avoids a blank flash on first paint; the
// panel then keeps itself current on its own.

import { useEffect, useState } from "react";
import Link from "next/link";

const POLL_MS = 15_000;

export interface LiveScoreGame {
  id: string;
  sport: string;
  sportLabel: string;
  status: string;
  period: string | null;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

function LiveRow({ g }: { g: LiveScoreGame }) {
  return (
    <Link href={`/dashboard/discovery/sports/game/${g.id}`} className="spx-live-row">
      <div className="spx-live-row__meta"><i />LIVE{g.period ? ` · ${g.period}` : ""} · {g.sportLabel}</div>
      <div className="spx-live-row__score">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {g.awayTeamLogoUrl ? <img src={g.awayTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
        <b>{g.awayScore ?? "—"}</b><span>VS</span><b>{g.homeScore ?? "—"}</b>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {g.homeTeamLogoUrl ? <img src={g.homeTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
      </div>
      <div className="spx-live-row__names"><span>{g.awayTeamName}</span><span>{g.homeTeamName}</span></div>
    </Link>
  );
}

export default function LiveScoresPanel({
  initialGames,
  title = "Live Now",
  emptyMessage = "Nothing’s live across any sport right now.",
  excludeGameId,
}: {
  initialGames: LiveScoreGame[];
  title?: string;
  emptyMessage?: string;
  /** The game already being viewed on this page (if any) — filtered out of
   *  both the initial list and every subsequent poll so it never appears
   *  as a duplicate link to itself. */
  excludeGameId?: string;
}) {
  const [games, setGames] = useState(initialGames.filter((g) => g.id !== excludeGameId));
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/discovery/sports/live-scores");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.games)) return;
        setGames((data.games as LiveScoreGame[]).filter((g) => g.id !== excludeGameId));
        setLastUpdated(new Date());
      } catch {
        // A single failed poll just tries again next tick — never surfaced to the member.
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [excludeGameId]);

  return (
    <div className="spx-panel">
      <div className="spx-panel__head">
        <h2>{title}</h2>
        {games.length > 0 && <span className="spx-live-updated"><i />Updating automatically</span>}
      </div>
      <div className="spx-panel__body">
        {games.length === 0 ? (
          <p className="spx-panel__empty">{emptyMessage}</p>
        ) : (
          games.map((g) => <LiveRow key={g.id} g={g} />)
        )}
      </div>
      {lastUpdated && <p className="spx-live-updated__stamp">Last updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</p>}
    </div>
  );
}
