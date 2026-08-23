import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMyFantasyLeagues } from "@/lib/discovery/sports/fantasy-service";
import { createFantasyLeagueAction, joinFantasyLeagueAction } from "./actions";
import "../../discovery.css";
// .spx-fantasy — scoped warm-espresso re-theme of this page's .disc-*
// classes (see the block in sports-home.css for why this lives there).
import "../sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fantasy Football — Magical Discovery", robots: { index: false } };

const DRAFT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Draft not started",
  in_progress: "Draft in progress",
  complete: "Season underway",
};

export default async function FantasyFootballPage() {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagues = await getMyFantasyLeagues(account.id);

  return (
    <div className="disc spx-fantasy">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports · Fantasy Football</span>
        <h1 className="pg-title">Fantasy Football</h1>
        <p className="pg-sub">Real NFL players, your own private league — a separate game from Magical Picks.</p>
      </div>
      <Link href="/dashboard/discovery/sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }}>← Back to Sports</Link>

      <div className="disc-section">
        <div className="disc-section__head"><h2>Your Leagues</h2></div>
        {leagues.length === 0 && <p className="disc-empty" style={{ marginTop: 0 }}>You aren&apos;t in a fantasy league yet — create one or join with an invite code below.</p>}
        {leagues.length > 0 && (
          <div className="disc-chart">
            {leagues.map((l) => (
              <Link href={`/dashboard/discovery/sports/fantasy/${l.id}`} key={l.id} className="disc-chart__row" style={{ textDecoration: "none" }}>
                <div className="disc-chart__song"><b>{l.name}</b><span>{l.season} season · {l.teamCount} team{l.teamCount === 1 ? "" : "s"} · code {l.inviteCode}</span></div>
                <span className="disc-badge">{l.isCommissioner ? "Commissioner" : DRAFT_STATUS_LABEL[l.draftStatus] ?? l.draftStatus}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="disc-section">
        <div className="disc-section__head"><h2>Start or Join a League</h2></div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <form action={createFantasyLeagueAction} className="disc-form disc-form--compact" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <input type="text" name="name" placeholder="League name, e.g. Turner Family League" maxLength={60} required />
            <input type="text" name="teamName" placeholder="Your team name" maxLength={40} required />
            <label style={{ fontSize: "0.8rem", opacity: 0.8 }}>
              Playoff teams
              <select name="playoffTeams" defaultValue="4" style={{ display: "block", width: "100%", marginTop: "0.25rem" }}>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8">8</option>
              </select>
            </label>
            <label style={{ fontSize: "0.8rem", opacity: 0.8 }}>
              Regular season weeks
              <input type="number" name="regularSeasonWeeks" min={1} max={17} defaultValue={14} style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
            </label>
            <button type="submit" className="btn btn--sm">Create League</button>
          </form>
          <form action={joinFantasyLeagueAction} className="disc-form disc-form--compact" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <input type="text" name="code" placeholder="Invite code" maxLength={6} required style={{ textTransform: "uppercase" }} />
            <input type="text" name="teamName" placeholder="Your team name" maxLength={40} required />
            <button type="submit" className="btn btn--sm">Join League</button>
          </form>
        </div>
      </div>

      <p className="disc-empty">
        League creation, a real snake draft over the current NFL player pool, rosters and lineup management, weekly scoring
        from verified stats, waivers, trades, and a commissioner-configured playoff bracket that auto-seeds once the
        regular season ends.
      </p>
    </div>
  );
}
