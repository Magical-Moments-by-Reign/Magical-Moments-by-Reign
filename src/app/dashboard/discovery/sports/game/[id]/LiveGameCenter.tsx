"use client";
// Live Game Center (CLIENT ONLY) — the client-side live-data layer for one
// game. Server-rendered initial state comes in as props; from there this
// component polls /api/discovery/sports/game/[id]/live on its own, on an
// interval that adapts to the real game status — frequent while genuinely
// live, rare while scheduled and far from kickoff, stopped entirely once
// final (a final score never changes again) — so the member can leave the
// page open and watch it update without ever refreshing.
//
// GAME CENTER TABS: sport-specific feeds (Play-by-Play, Box Score, Team
// Stats, Player Stats) mount here only once this codebase has a verified,
// real field mapping for them from a connected provider — see the sport
// module registry below. Today that's none, so only Overview renders; the
// tab strip is deliberately data-driven so a real feed just adds itself
// here rather than needing a rewrite.

import { useEffect, useState } from "react";
import { submitPickAction } from "../../actions";
import type { VoteTally } from "@/lib/discovery/sports/picks";

export interface LiveGameInitial {
  id: string;
  sport: string;
  sportLabel: string;
  stage?: string;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  homeRecord?: string;
  awayRecord?: string;
  startsAt: string; // ISO
  status: "scheduled" | "live" | "final";
  period?: string;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
  isMatchupSport: boolean;
  tally: VoteTally;
  myPick: "home" | "away" | null;
  myPickCorrect: boolean | null;
}

interface LiveState {
  status: "scheduled" | "live" | "final";
  period?: string;
  homeScore?: number;
  awayScore?: number;
  startsAt: string;
  venue?: string;
  stage?: string;
}

// Poll cadence — matched to how fast the underlying reality actually
// changes, not a single blanket interval: a live game's score/clock moves
// constantly; a scheduled game mostly just waits for kickoff; a final
// game's result never changes again, so polling stops outright.
const POLL_LIVE_MS = 15_000;
const POLL_SCHEDULED_MS = 60_000;

function useCountdown(targetISO: string, active: boolean): string | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!active || now == null) return null;
  const diff = +new Date(targetISO) - now;
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveGameCenter({ initial }: { initial: LiveGameInitial }) {
  const [state, setState] = useState<LiveState>({
    status: initial.status,
    period: initial.period,
    homeScore: initial.homeScore ?? undefined,
    awayScore: initial.awayScore ?? undefined,
    startsAt: initial.startsAt,
    venue: initial.venue,
    stage: initial.stage,
  });

  useEffect(() => {
    if (state.status === "final") return; // a final score never changes again — no reason to keep polling
    let cancelled = false;
    const interval = state.status === "live" ? POLL_LIVE_MS : POLL_SCHEDULED_MS;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/discovery/sports/game/${initial.id}/live`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setState((prev) => ({ ...prev, ...data }));
      } catch {
        // A single failed poll just tries again next tick — never surfaced to the member.
      }
    }, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [initial.id, state.status]);

  const countdown = useCountdown(state.startsAt, state.status === "scheduled");
  const locked = state.status !== "scheduled" || (countdown == null && +new Date(state.startsAt) <= Date.now());
  const startsAtLocal = new Date(state.startsAt);

  const headerLine = [initial.sportLabel, state.stage].filter(Boolean).join(" · ");

  return (
    <div className="lgc">
      <div className="lgc__meta">
        <span>{headerLine}</span>
        <span className={`lgc__status lgc__status--${state.status}`}>
          {state.status === "live" ? "● LIVE" : state.status === "final" ? "FINAL" : startsAtLocal.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="lgc__teams">
        <div className="lgc__team">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {initial.awayTeamLogoUrl ? <img src={initial.awayTeamLogoUrl} alt="" /> : <div className="lgc__team-ph" />}
          <span>{initial.awayTeamName}</span>
          {initial.awayRecord && <em className="lgc__record">{initial.awayRecord}</em>}
          {(state.status === "live" || state.status === "final") && <b className="lgc__score">{state.awayScore ?? "—"}</b>}
        </div>
        <span className="lgc__vs">VS</span>
        <div className="lgc__team">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {initial.homeTeamLogoUrl ? <img src={initial.homeTeamLogoUrl} alt="" /> : <div className="lgc__team-ph" />}
          <span>{initial.homeTeamName}</span>
          {initial.homeRecord && <em className="lgc__record">{initial.homeRecord}</em>}
          {(state.status === "live" || state.status === "final") && <b className="lgc__score">{state.homeScore ?? "—"}</b>}
        </div>
      </div>

      {state.status === "scheduled" && (
        <div className="lgc__when">
          {startsAtLocal.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
          {countdown && <span className="lgc__countdown"> · kicks off in {countdown}</span>}
        </div>
      )}
      {state.status === "live" && state.period && <div className="lgc__when">{state.period}</div>}
      {state.venue && <div className="lgc__venue">{state.venue}</div>}

      {initial.isMatchupSport && (
        <div className="lgc__vote">
          <div className="lgc__vote-bar">
            <span style={{ width: `${initial.tally.awayPct}%` }} />
            <span style={{ width: `${initial.tally.homePct}%` }} />
          </div>
          <div className="lgc__vote-labels">
            <span>{initial.awayTeamName} {initial.tally.awayPct}%</span>
            <span>{initial.tally.total.toLocaleString()} Magical Picks</span>
            <span>{initial.homeTeamName} {initial.tally.homePct}%</span>
          </div>
        </div>
      )}

      {initial.isMatchupSport && !locked && (
        <form action={submitPickAction}>
          <input type="hidden" name="gameId" value={initial.id} />
          <div className="lgc__pick">
            <button type="submit" name="teamPick" value="away" data-picked={initial.myPick === "away"}>{initial.awayTeamName}</button>
            <button type="submit" name="teamPick" value="home" data-picked={initial.myPick === "home"}>{initial.homeTeamName}</button>
          </div>
        </form>
      )}
      {initial.isMatchupSport && locked && state.status === "final" && initial.myPick && (
        <div className={`lgc__result lgc__result--${initial.myPickCorrect ? "correct" : "incorrect"}`}>
          {initial.myPickCorrect ? "✓ You called it!" : "Not this time — next matchup!"}
        </div>
      )}
      {initial.isMatchupSport && locked && state.status !== "final" && <div className="lgc__locked">Picks locked</div>}

      <div className="lgc__tabs">
        <button type="button" className="lgc__tab lgc__tab--active">Overview</button>
      </div>
    </div>
  );
}
