import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMyFantasyLeagues } from "@/lib/discovery/sports/fantasy-service";
import { createFantasyLeagueAction, joinFantasyLeagueAction } from "./actions";
import "../../discovery.css";

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
    <div className="disc">
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
        This phase covers league creation, a real snake draft over the current NFL player pool, rosters, and lineup management.
        Weekly scoring from live stats, waivers, and playoffs are coming in a follow-up phase.
      </p>
    </div>
  );
}
