import type { Metadata } from "next";
import Link from "next/link";
import DiscoveryImage from "@/components/discovery/DiscoveryImage";
import { requireAccount } from "@/lib/guard";
import { SPORT_CATALOG, getMyTeams, getLeagueLogos, getSportsLandingGames, getGamesWithVoteContext, getMatchup, type MatchupCardContext } from "@/lib/discovery/sports/service";
import { MATCHUP_SPORTS, ApiSportsProvider, type SportSlug } from "@/lib/discovery/providers/sports";
import { submitPickAction } from "./actions";
import SportsIcon from "./SportsIcons";
import "../discovery.css";
import "./sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Moments Sports", robots: { index: false } };

// Category word under each Explore card — presentational only, not provider
// data. Matches the reference's FOOTBALL/BASKETBALL/etc. sub-labels.
const SPORT_KIND: Record<SportSlug, string> = {
  nfl: "Football", ncaaf: "Football", nba: "Basketball", mlb: "Baseball",
  soccer: "Football", nhl: "Hockey", mma: "Mixed Martial Arts",
  rugby: "Rugby", volleyball: "Volleyball", f1: "Racing",
};

type MyTeams = Awaited<ReturnType<typeof getMyTeams>>;

/** One real matchup to feature in the Magical Picks panel: live > soonest
 *  scheduled today > soonest upcoming among followed teams. Never invents a
 *  matchup — returns null when nothing pickable is available yet. */
async function pickFeaturedMatchup(myTeams: MyTeams, followedSports: SportSlug[], accountId: string): Promise<MatchupCardContext | null> {
  const todayISO = new Date().toISOString().slice(0, 10);
  const sports = (followedSports.length ? followedSports : (["nfl"] as SportSlug[])).filter((s) => MATCHUP_SPORTS.includes(s) && ApiSportsProvider.isConfigured(s));
  const todaysContexts = (await Promise.all(sports.map((s) => getGamesWithVoteContext(s, todayISO, accountId, 20)))).flatMap((r) => r.contexts);
  const live = todaysContexts.find((c) => c.game.status === "live");
  if (live) return live;
  const scheduledToday = todaysContexts.filter((c) => c.game.status === "scheduled").sort((a, b) => +a.game.startsAt - +b.game.startsAt)[0];
  if (scheduledToday) return scheduledToday;
  const nextUpcomingLocalId = myTeams
    .filter((t) => t.upcoming && t.upcomingLocalId && MATCHUP_SPORTS.includes(t.follow.sport as SportSlug))
    .sort((a, b) => +new Date(a.upcoming!.startsAt) - +new Date(b.upcoming!.startsAt))[0]?.upcomingLocalId;
  return nextUpcomingLocalId ? getMatchup(nextUpcomingLocalId, accountId) : null;
}

export default async function SportsPage() {
  const account = await requireAccount("/dashboard/discovery/sports");

  const myTeams = await getMyTeams(account.id);
  const followedSports = [...new Set(myTeams.map((t) => t.follow.sport as SportSlug))];

  const [logos, { live, upcoming }, featuredMatchup] = await Promise.all([
    getLeagueLogos(),
    getSportsLandingGames(followedSports.length ? followedSports : (["nfl", "nba", "mlb", "nhl"] as SportSlug[])),
    pickFeaturedMatchup(myTeams, followedSports, account.id),
  ]);

  return (
    <div className="spx">
      <section className="spx-hero">
        <div className="spx-hero__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-champagne.png" alt="" />
          <div className="spx-hero__word"><b>Magical Moments</b><span>SPORTS</span></div>
        </div>
        <h1>EVERY GAME. EVERY MOMENT.</h1>
        <p className="spx-hero__sub">LIVE SCORES • REAL-TIME STATS • PICKS • UNFORGETTABLE MOMENTS</p>
      </section>

      <div className="spx-divider"><span>Explore All Sports</span></div>
      <div className="spx-grid">
        {SPORT_CATALOG.map((s) => {
          const logo = logos[s.slug];
          return (
            <Link key={s.slug} href={`/dashboard/discovery/sports/${s.slug}`} className="spx-card">
              <DiscoveryImage src={logo} alt={`${s.label} league mark`} fallback={s.label.slice(0, 3).toUpperCase()} />
              <b>{s.label}</b>
              <span>{SPORT_KIND[s.slug]}</span>
            </Link>
          );
        })}
      </div>

      <div className="spx-panels">
        <div className="spx-panel" id="live-games">
          <div className="spx-panel__head"><h2>Live Games</h2><Link href="/dashboard/discovery/sports/schedule">View All →</Link></div>
          <div className="spx-panel__body">
            {live.length === 0 ? (
              <p className="spx-panel__empty">Nothing&rsquo;s live right now — check Upcoming Games for what&rsquo;s next.</p>
            ) : live.map((g) => (
              <Link key={g.id} href={`/dashboard/discovery/sports/game/${g.id}`} className="spx-live-row">
                <div className="spx-live-row__meta"><i />LIVE{g.period ? ` · ${g.period}` : ""}</div>
                <div className="spx-live-row__score">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <DiscoveryImage src={g.awayTeamLogoUrl} alt={g.awayTeamName} fallback={g.awayTeamName.slice(0, 3).toUpperCase()} />
                  <b>{g.awayScore ?? "—"}</b>
                  <span>VS</span>
                  <b>{g.homeScore ?? "—"}</b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <DiscoveryImage src={g.homeTeamLogoUrl} alt={g.homeTeamName} fallback={g.homeTeamName.slice(0, 3).toUpperCase()} />
                </div>
                <div className="spx-live-row__names"><span>{g.awayTeamName}</span><span>{g.homeTeamName}</span></div>
              </Link>
            ))}
          </div>
          <Link href="/dashboard/discovery/sports/schedule" className="spx-panel__cta">All Live Scores</Link>
        </div>

        <div className="spx-panel">
          <div className="spx-panel__head"><h2>Upcoming Games</h2><Link href="/dashboard/discovery/sports/schedule">View All →</Link></div>
          <div className="spx-panel__body">
            {upcoming.length === 0 ? (
              <p className="spx-panel__empty">No scheduled games found in the next week for your sports.</p>
            ) : upcoming.map((g) => (
              <Link key={g.id} href={`/dashboard/discovery/sports/game/${g.id}`} className="spx-up-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <DiscoveryImage src={g.awayTeamLogoUrl} alt={g.awayTeamName} fallback={g.awayTeamName.slice(0, 3).toUpperCase()} />
                <span className="spx-up-row__vs">@</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <DiscoveryImage src={g.homeTeamLogoUrl} alt={g.homeTeamName} fallback={g.homeTeamName.slice(0, 3).toUpperCase()} />
                <div className="spx-up-row__meta">
                  <b>{g.awayTeamName} @ {g.homeTeamName}</b>
                  <span>{g.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {g.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/dashboard/discovery/sports/schedule" className="spx-panel__cta">Full Schedule</Link>
        </div>

        <div className="spx-panel">
          <div className="spx-panel__head"><h2>Magical Picks</h2><Link href="/dashboard/discovery/sports/picks">View All →</Link></div>
          {!featuredMatchup ? (
            <p className="spx-panel__empty">Follow a team to get a pickable matchup here.</p>
          ) : (
            <div className="spx-panel__body">
              <p className="spx-poll__sport">{SPORT_CATALOG.find((s) => s.slug === featuredMatchup.game.sport)?.label} · Who will win this game?</p>
              <div className="spx-poll__vs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <DiscoveryImage src={featuredMatchup.game.awayTeamLogoUrl} alt={featuredMatchup.game.awayTeamName} fallback={featuredMatchup.game.awayTeamName.slice(0, 3).toUpperCase()} />
                <b>{featuredMatchup.game.awayTeamName}</b>
                <em>VS</em>
                <b>{featuredMatchup.game.homeTeamName}</b>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <DiscoveryImage src={featuredMatchup.game.homeTeamLogoUrl} alt={featuredMatchup.game.homeTeamName} fallback={featuredMatchup.game.homeTeamName.slice(0, 3).toUpperCase()} />
              </div>
              <div className="spx-poll__bar">
                <span style={{ width: `${featuredMatchup.tally.awayPct || 50}%` }}>{featuredMatchup.tally.awayPct}%</span>
                <span style={{ width: `${featuredMatchup.tally.homePct || 50}%` }}>{featuredMatchup.tally.homePct}%</span>
              </div>
              <p className="spx-poll__votes">{featuredMatchup.tally.total.toLocaleString()} votes</p>
              {!featuredMatchup.locked ? (
                <form action={submitPickAction}>
                  <input type="hidden" name="gameId" value={featuredMatchup.game.id} />
                  <div className="spx-poll__actions">
                    <button type="submit" name="teamPick" value="away" data-picked={featuredMatchup.myPick === "away"}>{featuredMatchup.game.awayTeamName}</button>
                    <button type="submit" name="teamPick" value="home" data-picked={featuredMatchup.myPick === "home"}>{featuredMatchup.game.homeTeamName}</button>
                  </div>
                </form>
              ) : (
                <p className="spx-panel__empty">Picks are locked for this matchup.</p>
              )}
            </div>
          )}
          <Link href="/dashboard/discovery/sports/picks" className="spx-panel__cta">See All Picks</Link>
        </div>

        <div className="spx-panel">
          <div className="spx-panel__head"><h2>My Teams</h2><Link href="/dashboard/discovery/sports/my-teams">Manage →</Link></div>
          <div className="spx-panel__body">
            {myTeams.length === 0 ? (
              <p className="spx-panel__empty">You haven&rsquo;t followed any teams yet.</p>
            ) : myTeams.slice(0, 4).map(({ follow }) => (
              <div className="spx-team-row" key={follow.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <DiscoveryImage src={follow.teamLogoUrl} alt={follow.teamName ?? "Followed team"} fallback={(follow.teamName ?? "Team").slice(0, 3).toUpperCase()} />
                <div><b>{follow.teamName}</b><span>{SPORT_CATALOG.find((s) => s.slug === follow.sport)?.label}</span></div>
                <div className="spx-team-row__icons"><SportsIcon name="star" /><SportsIcon name="bell" /></div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/discovery/sports/my-teams" className="spx-panel__cta">View All My Teams</Link>
        </div>
      </div>

      <nav className="spx-bar" aria-label="Sports quick links">
        <Link href="/dashboard/discovery/sports/schedule" className="spx-bar__item"><SportsIcon name="bolt" /><span><b>Live Scores</b><i>Real-time updates every second</i></span></Link>
        <Link href={`/dashboard/discovery/sports/${followedSports[0] ?? "nfl"}#standings`} className="spx-bar__item"><SportsIcon name="chart" /><span><b>Stats &amp; Standings</b><i>In-depth stats and league standings</i></span></Link>
        <Link href="/dashboard/discovery/sports/picks" className="spx-bar__item"><SportsIcon name="trophy" /><span><b>Magical Picks</b><i>Make picks, create polls and win together</i></span></Link>
        <Link href="/dashboard/discovery/sports/schedule" className="spx-bar__item"><SportsIcon name="play" /><span><b>Live Games</b><i>Follow live action as it happens</i></span></Link>
        <Link href="/dashboard/discovery/sports/picks" className="spx-bar__item"><SportsIcon name="people" /><span><b>Community</b><i>Share moments, challenge friends</i></span></Link>
        <Link href="/dashboard" className="spx-bar__item"><SportsIcon name="star" /><span><b>Magical Moments</b><i>Make every game unforgettable</i></span></Link>
        <span className="spx-bar__item spx-bar__item--soon"><SportsIcon name="play" /><span><b>Highlights</b><i>Relive the action</i></span><span className="spx-bar__soon-pill">Coming Soon</span></span>
      </nav>
    </div>
  );
}
