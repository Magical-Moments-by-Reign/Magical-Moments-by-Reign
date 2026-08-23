import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../SmartBackLink";
import { requireAccount } from "@/lib/guard";
import { getMyTeams, SPORT_CATALOG, searchSports } from "@/lib/discovery/sports/service";
import { unfollowAction, followTeamAction } from "../actions";
import "../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Teams — Magical Discovery", robots: { index: false } };

export default async function MyTeamsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports/my-teams");
  const { q } = await searchParams;
  const [teams, searchResults] = await Promise.all([
    getMyTeams(account.id),
    q?.trim() ? searchSports(q) : Promise.resolve(null),
  ]);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports</span>
        <h1 className="pg-title">My Teams</h1>
        <p className="pg-sub">The teams you follow, with their next matchup and most recent result.</p>
      </div>
      <SmartBackLink fallbackHref="/dashboard/discovery/sports" label="← Back to Sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }} />

      <div className="disc-section">
        <div className="disc-section__head"><h2>Add a Favorite Team</h2></div>
        <form className="disc-form" method="get">
          <input type="text" name="q" placeholder="Search sports, leagues, or teams" defaultValue={q ?? ""} aria-label="Search sports, leagues, or teams" />
          <button type="submit" className="btn btn--gold">Search</button>
        </form>
        {searchResults && (
          <>
            {searchResults.teams.length === 0 && searchResults.sports.length === 0 && <p className="disc-empty">No matches found.</p>}
            {searchResults.teams.length > 0 && (
              <div className="disc-grid" style={{ marginBottom: "1rem", marginTop: "1rem" }}>
                {searchResults.teams.map((t) => (
                  <form action={followTeamAction} key={`${t.sport}-${t.id}`} className="sports-team-row">
                    <input type="hidden" name="sport" value={t.sport} />
                    <input type="hidden" name="teamExternalId" value={t.id} />
                    <input type="hidden" name="teamName" value={t.name} />
                    {t.logoUrl && <input type="hidden" name="teamLogoUrl" value={t.logoUrl} />}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {t.logoUrl ? <img src={t.logoUrl} alt="" /> : null}
                    <span className="grow"><b>{t.name}</b><span>{SPORT_CATALOG.find((s) => s.slug === t.sport)?.label}</span></span>
                    <button type="submit" className="btn btn--sm">Follow</button>
                  </form>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {teams.length === 0 ? (
        <p className="disc-empty">You haven&rsquo;t followed any teams yet. Search above to follow one.</p>
      ) : (
        <div className="disc-section">
          <div className="disc-section__head"><h2>Following</h2></div>
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
