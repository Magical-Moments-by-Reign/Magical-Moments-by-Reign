import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMyTeams, SPORT_CATALOG } from "@/lib/discovery/sports/service";
import { unfollowAction } from "../actions";
import "../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Teams — Magical Discovery", robots: { index: false } };

export default async function MyTeamsPage() {
  const account = await requireAccount("/dashboard/discovery/sports/my-teams");
  const teams = await getMyTeams(account.id);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports</span>
        <h1 className="pg-title">My Teams</h1>
        <p className="pg-sub">The teams you follow, with their next matchup and most recent result.</p>
      </div>
      <Link href="/dashboard/discovery/sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }}>← Back to Sports</Link>

      {teams.length === 0 ? (
        <p className="disc-empty">You haven&rsquo;t followed any teams yet. Search for a team from the Sports page to follow it here.</p>
      ) : (
        <div className="disc-section">
          {teams.map(({ follow, upcoming, upcomingLocalId, recent }) => {
            const sportLabel = SPORT_CATALOG.find((s) => s.slug === follow.sport)?.label ?? follow.sport;
            return (
              <div key={follow.id} className="sports-team-row" style={{ marginBottom: ".7rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {follow.teamLogoUrl ? <img src={follow.teamLogoUrl} alt="" /> : <div style={{ width: 38, height: 38, borderRadius: 8, background: "#efe6d5" }} />}
                <span className="grow">
                  <b>{follow.teamName}</b>
                  <span>{sportLabel}{upcoming ? ` · Next: ${upcoming.awayTeam.name === follow.teamName ? upcoming.homeTeam.name : upcoming.awayTeam.name} on ${new Date(upcoming.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : recent ? ` · Last: ${recent.status === "final" ? `${recent.homeScore}-${recent.awayScore}` : recent.status}` : " · No scheduled games found"}</span>
                </span>
                {upcoming && upcomingLocalId && (
                  <Link href={`/dashboard/discovery/sports/game/${upcomingLocalId}`} className="btn btn--sm">View</Link>
                )}
                <form action={unfollowAction}>
                  <input type="hidden" name="followId" value={follow.id} />
                  <button type="submit" className="btn btn--sm btn--warn">Unfollow</button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
