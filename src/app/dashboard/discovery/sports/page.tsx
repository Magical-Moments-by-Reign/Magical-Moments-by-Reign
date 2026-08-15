import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getSportsFeed } from "@/lib/discovery/service";
import { SPORT_CATALOG, getMyTeams, getGamesWithVoteContext, getMatchup, getFamilyPicksLeaderboard, type MatchupCardContext } from "@/lib/discovery/sports/service";
import { MATCHUP_SPORTS, ApiSportsProvider, type SportSlug } from "@/lib/discovery/providers/sports";
import { submitPickAction } from "./actions";
import MagicalSidebar from "../MagicalSidebar";
import PollCountdown from "./PollCountdown";
import "../discovery.css";
import "../discovery-shell.css";
import "./sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sports Home — Magical Moments by Reign", robots: { index: false } };

const SPORTS_PROMO = { title: "Bring the magic to game day!", body: "Create polls, invite your people, and make every game more memorable.", ctaLabel: "+ Create a Poll", ctaHref: "/dashboard/discovery/sports/picks" };

type MyTeams = Awaited<ReturnType<typeof getMyTeams>>;

/** Picks the one game to feature in "Game Day Live" + "Magical Picks":
 *  live > scheduled-today > the soonest upcoming game any followed team
 *  has, in that order. Real data only — never invents a matchup when a
 *  member follows nothing yet or nothing is happening today. Returns the
 *  full vote/pick context so the page never has to re-fetch it. */
async function pickPrimaryGame(myTeams: MyTeams, accountId: string): Promise<MatchupCardContext | null> {
  const followedSports = [...new Set(myTeams.map((t) => t.follow.sport))] as SportSlug[];
  const todayISO = new Date().toISOString().slice(0, 10);
  const followedTeamIds = new Set(myTeams.map((t) => t.follow.teamExternalId).filter(Boolean));

  const todaysContexts = (
    await Promise.all(followedSports.filter((s) => ApiSportsProvider.isConfigured(s)).map((s) => getGamesWithVoteContext(s, todayISO, accountId, 20)))
  ).flatMap((r) => r.contexts);

  const involvingMyTeam = todaysContexts.filter((c) => followedTeamIds.has(c.game.homeTeamId ?? "") || followedTeamIds.has(c.game.awayTeamId ?? ""));
  const pool = involvingMyTeam.length ? involvingMyTeam : todaysContexts;

  const live = pool.find((c) => c.game.status === "live");
  if (live) return live;
  const scheduledToday = pool.filter((c) => c.game.status === "scheduled").sort((a, b) => +a.game.startsAt - +b.game.startsAt)[0];
  if (scheduledToday) return scheduledToday;

  const nextUpcomingLocalId = myTeams
    .filter((t) => t.upcoming && t.upcomingLocalId)
    .sort((a, b) => +new Date(a.upcoming!.startsAt) - +new Date(b.upcoming!.startsAt))[0]?.upcomingLocalId;
  if (!nextUpcomingLocalId) return null;
  const matchup = await getMatchup(nextUpcomingLocalId, accountId);
  return matchup;
}

export default async function SportsPage({ searchParams }: { searchParams: Promise<{ location?: string; sport?: string; range?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { location, sport: sportParam, range: rangeParam } = await searchParams;
  const range: "week" | "all" = rangeParam === "all" ? "all" : "week";

  const [feed, myTeams, leaderboard] = await Promise.all([
    getSportsFeed(location),
    getMyTeams(account.id),
    getFamilyPicksLeaderboard(account.id, range),
  ]);

  if (sportParam === "high_school") {
    return (
      <div className="disc mm-shell">
        <MagicalSidebar active="High School Sports" promo={SPORTS_PROMO} />
        <div className="mm-main">
          <div className="pg-head">
            <span className="pg-eyebrow">Magical Discovery · Sports</span>
            <h1 className="pg-title">High School Sports</h1>
          </div>
          <div className="disc-pending">
            <b>High school sports — coming soon</b>
            We&rsquo;re working on a licensed high-school data partnership. No scores or schedules are shown here until a real, approved provider is connected — nothing on this page is invented.
          </div>
          <Link href="/dashboard/discovery/sports" className="btn btn--sm" style={{ marginTop: "1.2rem", display: "inline-block" }}>← Back to Sports Home</Link>
        </div>
      </div>
    );
  }

  const primaryGameContext = await pickPrimaryGame(myTeams, account.id);
  const primaryGame = primaryGameContext?.game ?? null;
  const primarySportLabel = primaryGame ? (SPORT_CATALOG.find((s) => s.slug === primaryGame.sport)?.label ?? primaryGame.sport) : null;

  // Upcoming Games strip: every followed team's next game, deduped (two
  // followed teams can share the same matchup), soonest first.
  const upcomingByGameId = new Map<string, { sport: string; league: string; homeTeamName: string; homeTeamLogoUrl: string | null; awayTeamName: string; awayTeamLogoUrl: string | null; startsAt: Date; localId: string | null }>();
  for (const t of myTeams) {
    if (!t.upcoming || !t.upcomingLocalId) continue;
    upcomingByGameId.set(t.upcomingLocalId, {
      sport: t.upcoming.sport, league: t.upcoming.league,
      homeTeamName: t.upcoming.homeTeam.name, homeTeamLogoUrl: t.upcoming.homeTeam.logoUrl ?? null,
      awayTeamName: t.upcoming.awayTeam.name, awayTeamLogoUrl: t.upcoming.awayTeam.logoUrl ?? null,
      startsAt: new Date(t.upcoming.startsAt), localId: t.upcomingLocalId,
    });
  }
  const upcomingGames = [...upcomingByGameId.values()].sort((a, b) => +a.startsAt - +b.startsAt);

  return (
    <div className="disc mm-shell">
      <MagicalSidebar active="Game Day" promo={SPORTS_PROMO} />

      <div className="mm-main">
        <section className="mm-hero" style={{ backgroundImage: "url(/story/sports.jpg)" }}>
          <div className="mm-hero__scrim">
            <span className="mm-hero__eyebrow">Sports, Together.</span>
            <h1>Your teams.<br />Your people.<br />Every game-day moment.</h1>
            <p>Stay close to the action and even closer to the people who matter.</p>
            <Link href="/dashboard/discovery/sports/my-teams" className="mm-hero__cta">+ Add Favorite Team</Link>
          </div>
        </section>

        <section className="mm-section">
          <div className="mm-section__head">
            <h2>My Favorite Teams</h2>
            <Link href="/dashboard/discovery/sports/my-teams">View All Teams →</Link>
          </div>
          {myTeams.length === 0 ? (
            <p className="disc-empty">You haven&rsquo;t followed any teams yet. <Link href="/dashboard/discovery/sports/my-teams">Add your first favorite team</Link> to see it here.</p>
          ) : (
            <div className="mm-cards">
              {myTeams.map(({ follow, upcoming }) => {
                const opponent = upcoming ? (upcoming.awayTeam.name === follow.teamName ? upcoming.homeTeam.name : upcoming.awayTeam.name) : null;
                return (
                  <div className="mm-card" key={follow.id}>
                    <div className="mm-card__head">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {follow.teamLogoUrl ? <img src={follow.teamLogoUrl} alt="" /> : <div className="mm-card__logo-ph" />}
                      <div>
                        <b>{follow.teamName}</b>
                        <span>{SPORT_CATALOG.find((s) => s.slug === follow.sport)?.label ?? follow.sport}</span>
                      </div>
                    </div>
                    {upcoming ? (
                      <>
                        <span className="mm-card__label">Next Game</span>
                        <p>vs {opponent}</p>
                        <p className="mm-card__when">{new Date(upcoming.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {new Date(upcoming.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                      </>
                    ) : (
                      <p className="mm-card__when">No scheduled games found</p>
                    )}
                    <Link href="/dashboard/discovery/sports/my-teams" className="mm-card__btn">🔔 Notify Me</Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="sph-cols">
          <div className="sph-col-main">
            <section className="mm-section" id="game-day">
              <div className="mm-section__head">
                <h2>Game Day Live</h2>
                {primaryGame?.status === "live" && <em className="sph-live-badge">LIVE</em>}
              </div>
              {!primaryGame ? (
                <p className="disc-empty">Follow a team to see today&rsquo;s live score and updates here.</p>
              ) : (
                <div className="sph-gameday">
                  <div className="sph-gameday__meta">{primarySportLabel} · {primaryGame.status === "live" ? "Live" : primaryGame.status === "final" ? "Final" : "Preseason/Upcoming"}</div>
                  <div className="sph-gameday__score">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {primaryGame.awayTeamLogoUrl ? <img src={primaryGame.awayTeamLogoUrl} alt="" /> : <div className="mm-card__logo-ph" />}
                    <b>{primaryGame.awayScore ?? "—"}</b>
                    <span className="sph-gameday__clock">{primaryGame.status === "live" ? (primaryGame.period ?? "Live") : primaryGame.status === "final" ? "Final" : new Date(primaryGame.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    <b>{primaryGame.homeScore ?? "—"}</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {primaryGame.homeTeamLogoUrl ? <img src={primaryGame.homeTeamLogoUrl} alt="" /> : <div className="mm-card__logo-ph" />}
                  </div>
                  <div className="sph-gameday__names">
                    <span>{primaryGame.awayTeamName}</span>
                    <span>{primaryGame.homeTeamName}</span>
                  </div>

                  <div className="sph-tabs">
                    <span className="is-on">Live Updates</span>
                    <span>Box Score</span>
                    <span>Plays</span>
                    <span>Team Stats</span>
                  </div>
                  <div className="disc-pending" style={{ marginTop: ".8rem" }}>
                    <b>Play-by-play isn&rsquo;t connected yet</b>
                    Score and status above are live from API-Sports. A pitch-by-pitch/play-by-play feed needs a separate provider endpoint we haven&rsquo;t wired up — nothing here is invented in the meantime.
                  </div>

                  <Link href={`/dashboard/discovery/sports/game/${primaryGame.id}`} className="sph-gameday__cta">View Full Game Center →</Link>
                </div>
              )}
            </section>

            <section className="mm-section">
              <div className="mm-section__head">
                <h2>Upcoming Games</h2>
                <Link href="/dashboard/discovery/sports/my-teams">View Full Schedule →</Link>
              </div>
              {upcomingGames.length === 0 ? (
                <p className="disc-empty">No upcoming games among your followed teams yet.</p>
              ) : (
                <div className="sph-upcoming">
                  {upcomingGames.map((g) => (
                    <Link key={g.localId} href={`/dashboard/discovery/sports/game/${g.localId}`} className="sph-upcoming__card">
                      <span className="sph-upcoming__league">{SPORT_CATALOG.find((s) => s.slug === g.sport)?.label ?? g.sport}</span>
                      <div className="sph-upcoming__teams">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {g.awayTeamLogoUrl ? <img src={g.awayTeamLogoUrl} alt="" /> : <div className="mm-card__logo-ph mm-card__logo-ph--sm" />}
                        <span>vs</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {g.homeTeamLogoUrl ? <img src={g.homeTeamLogoUrl} alt="" /> : <div className="mm-card__logo-ph mm-card__logo-ph--sm" />}
                      </div>
                      <span className="sph-upcoming__when">{g.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}<br />{g.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="sph-col-side">
            <section className="mm-section">
              <div className="mm-section__head">
                <h2>Magical Picks</h2>
                <Link href="/dashboard/discovery/sports/picks">View All →</Link>
              </div>
              {!primaryGame || !primaryGameContext || !MATCHUP_SPORTS.includes(primaryGame.sport as SportSlug) ? (
                <p className="disc-empty">No pickable matchup right now — follow a team to get a poll here.</p>
              ) : (
                <div className="sph-poll">
                  <b>Who wins {primaryGame.status === "live" ? "tonight" : "next"}?</b>
                  <span>{primarySportLabel} · {primaryGame.awayTeamName} vs {primaryGame.homeTeamName}</span>

                  <div className="sph-poll__option" data-picked={primaryGameContext.myPick === "away"}>
                    <span>{primaryGame.awayTeamName}</span>
                    <span>{primaryGameContext.tally.away.toLocaleString()} votes ({primaryGameContext.tally.awayPct}%)</span>
                    <div className="sph-poll__bar"><span style={{ width: `${primaryGameContext.tally.awayPct}%` }} /></div>
                  </div>
                  <div className="sph-poll__option" data-picked={primaryGameContext.myPick === "home"}>
                    <span>{primaryGame.homeTeamName}</span>
                    <span>{primaryGameContext.tally.home.toLocaleString()} votes ({primaryGameContext.tally.homePct}%)</span>
                    <div className="sph-poll__bar"><span style={{ width: `${primaryGameContext.tally.homePct}%` }} /></div>
                  </div>

                  <div className="sph-poll__foot">
                    <span>{primaryGameContext.tally.total.toLocaleString()} people have picked</span>
                    {!primaryGameContext.locked && <span>Poll closes in <PollCountdown lockAtISO={(primaryGame.locksAt ?? primaryGame.startsAt).toISOString()} /></span>}
                  </div>

                  {!primaryGameContext.locked ? (
                    <form action={submitPickAction}>
                      <input type="hidden" name="gameId" value={primaryGame.id} />
                      <div className="sph-poll__actions">
                        <button type="submit" name="teamPick" value="away" className="btn btn--sm" data-picked={primaryGameContext.myPick === "away"}>{primaryGameContext.myPick === "away" ? "✓ " : ""}{primaryGame.awayTeamName}</button>
                        <button type="submit" name="teamPick" value="home" className="btn btn--sm" data-picked={primaryGameContext.myPick === "home"}>{primaryGameContext.myPick === "home" ? "✓ " : ""}{primaryGame.homeTeamName}</button>
                      </div>
                    </form>
                  ) : (
                    <p className="disc-empty">Picks are locked for this matchup.</p>
                  )}

                  <button type="button" className="sph-poll__share">Share Poll</button>
                </div>
              )}
            </section>

            <section className="mm-section" id="leaderboard">
              <div className="mm-section__head">
                <h2>{leaderboard.hasFamily ? "Family Leaderboard" : "My Picks"}</h2>
                <div className="sph-range">
                  <Link href="?range=week" aria-current={range === "week"}>This Week</Link>
                  <Link href="?range=all" aria-current={range === "all"}>All Time</Link>
                </div>
              </div>
              <div className="sph-leaderboard">
                {leaderboard.entries.map((e) => (
                  <div className="sph-leaderboard__row" key={e.accountId}>
                    <span className="sph-leaderboard__rank" data-rank={e.rank}>{e.rank}</span>
                    <span className="grow">{e.isMe ? "You" : e.name}</span>
                    <b>{e.points} pts</b>
                  </div>
                ))}
              </div>
              {leaderboard.hasFamily && <Link href="/dashboard/discovery/sports/picks" className="btn btn--sm" style={{ marginTop: ".8rem", display: "inline-block" }}>View Full Leaderboard →</Link>}
            </section>
          </div>
        </div>

        <section className="mm-tiles">
          <div className="mm-tile">
            <div className="mm-tile__icon">📊</div>
            <b>Create a Poll</b>
            <p>Ask anything. Get answers. Start a poll for your family or friends.</p>
            <Link href="/dashboard/discovery/sports/picks" className="btn btn--sm">Create Poll</Link>
          </div>
          <div className="mm-tile">
            <div className="mm-tile__icon">👥</div>
            <b>Share with Your People</b>
            <p>Send polls and picks to family &amp; friends. Let the fun begin!</p>
            <Link href="/dashboard/discovery/sports/my-teams" className="btn btn--sm">Invite Now</Link>
          </div>
          <div className="mm-tile">
            <div className="mm-tile__icon">📡</div>
            <b>Live Game Updates</b>
            <p>Follow every quarter, inning and period in real-time.</p>
            <Link href="/dashboard/discovery/sports#game-day" className="btn btn--sm">View Live Games</Link>
          </div>
          <div className="mm-tile">
            <div className="mm-tile__icon">🏆</div>
            <b>Magical Picks</b>
            <p>Make predictions, earn points, and climb the leaderboard.</p>
            <Link href="/dashboard/discovery/sports/picks" className="btn btn--sm">Make Your Picks</Link>
          </div>
        </section>

        <section className="mm-banner" id="tickets">
          <b>Find Tickets to Your Next Magical Sports Experience</b>
          <p>NFL, NBA, MLB, NHL, NCAA and more.</p>
          <form method="get">
            <input type="text" name="location" placeholder="City or ZIP code" defaultValue={location ?? ""} aria-label="City or ZIP code" />
            <button type="submit" className="mm-banner__cta">Find Tickets</button>
          </form>
        </section>
        {location?.trim() && (
          <section className="mm-section">
            <div className="mm-section__head"><h2>Sporting Event Tickets Near You</h2></div>
            {feed.ticketedEvents.items.length ? (
              <div className="disc-grid">
                {feed.ticketedEvents.items.map((e) => (
                  <a key={e.id} className="disc-card" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
                    <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
                    <div className="disc-card__body">
                      <h3>{e.name}</h3>
                      <div className="disc-card__meta">
                        {e.startsAt && <span>{new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                        {e.venueName && <span>· {e.venueName}</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="disc-empty">No sporting-event tickets found for that search.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
