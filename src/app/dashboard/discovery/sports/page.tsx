import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import DiscoveryImage from "@/components/discovery/DiscoveryImage";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { SPORT_CATALOG, getMyTeams, getLeagueLogos, getSportsLandingGames, getGamesWithVoteContext, getMatchup, type MatchupCardContext } from "@/lib/discovery/sports/service";
import { MATCHUP_SPORTS, ApiSportsProvider, type SportSlug } from "@/lib/discovery/providers/sports";
import { getAwardRace, AWARD_RACES } from "@/lib/discovery/sports/awards";
import { getMyTrackedPlayers } from "@/lib/discovery/sports/tracked-players";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import { submitPickAction, untrackPlayerAction } from "./actions";
import SportsIcon from "./SportsIcons";
import PlayerSearch from "./PlayerSearch";
import "../discovery.css";
import "./sports-home.css";

// API-Sports doesn't reliably return usable league artwork for American
// football (confirmed repeatedly — a generic "no logo" placeholder image
// comes back looking like a broken icon rather than a real crest), so these
// two use Owner-provided static artwork instead of attempting a live logo
// render.
const STATIC_LOGO: Partial<Record<SportSlug, string>> = { nfl: "/discovery/leagues/nfl.png", ncaaf: "/discovery/leagues/ncaaf.png" };

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

  // SportsDataIO is still on a free trial known to return scrambled values
  // for some fields (e.g. a player's team) — every surface it powers stays
  // owner-only until SPORTSDATAIO_COMMERCIAL_DATA flips on, so members are
  // never shown unverified trial data. See sdioCommercialMode's doc comment.
  const isOwner = await isOwnerAccount(account.id);
  const showSdio = sdioConfigured() && (sdioCommercialMode() || isOwner);
  const previewOnly = showSdio && !sdioCommercialMode();

  const [logos, { live, upcoming }, featuredMatchup, awardRaces, trackedPlayers] = await Promise.all([
    getLeagueLogos(),
    getSportsLandingGames(followedSports.length ? followedSports : (["nfl", "nba", "mlb", "nhl"] as SportSlug[])),
    pickFeaturedMatchup(myTeams, followedSports, account.id),
    showSdio
      ? Promise.all(AWARD_RACES.map(async (r) => ({ ...r, entries: await getAwardRace(r.league, r.award) })))
      : Promise.resolve([]),
    showSdio ? getMyTrackedPlayers(account.id) : Promise.resolve([]),
  ]);
  const trackedKeys = trackedPlayers.map((t) => `${t.league}:${t.playerId}`);

  return (
    <div className="spx">
      <section className="spx-hero">
        <Image src="/discovery/stadium.png" alt="" fill priority sizes="100vw" className="spx-hero__photo" />
        <div className="spx-hero__shade" />
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
          const logo = STATIC_LOGO[s.slug] ?? logos[s.slug];
          return (
            <Link key={s.slug} href={`/dashboard/discovery/sports/${s.slug}`} className="spx-card">
              <DiscoveryImage src={logo} alt={`${s.label} league mark`} fallback={s.label.slice(0, 3).toUpperCase()} />
              <b>{s.label}</b>
              <span>{SPORT_KIND[s.slug]}</span>
            </Link>
          );
        })}
      </div>

      {showSdio && (
        <>
          {previewOnly && <div className="spx-admin-badge">Admin Preview — not shown to members</div>}

          <div className="spx-divider"><span>Player &amp; Team Status</span></div>
          <PlayerSearch trackedKeys={trackedKeys} />

          {trackedPlayers.length > 0 && (
            <div className="spx-tracked">
              <div className="spx-tracked__head"><span>My Tracked Players</span><em>{trackedPlayers.length} across {new Set(trackedPlayers.map((t) => t.league)).size} league{new Set(trackedPlayers.map((t) => t.league)).size === 1 ? "" : "s"}</em></div>
              <div className="spx-tracked__list">
                {trackedPlayers.map((t) => (
                  <div className="spx-tracked__item" key={t.id}>
                    <div className="spx-tracked__photo">
                      {t.live?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.live.photoUrl} alt="" />
                      ) : (
                        <span aria-hidden="true">{t.playerName.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="spx-tracked__info">
                      <b>{t.playerName}</b>
                      <span>{t.league.toUpperCase()} · {[t.position, t.team].filter(Boolean).join(" · ") || "Team unavailable"}</span>
                      {t.live?.status && <span className="spx-tracked__status">{t.live.status}</span>}
                    </div>
                    <form action={untrackPlayerAction}>
                      <input type="hidden" name="league" value={t.league} />
                      <input type="hidden" name="playerId" value={t.playerId} />
                      <button type="submit" className="spx-tracked__remove" aria-label={`Stop tracking ${t.playerName}`}>✕</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {awardRaces.length > 0 && awardRaces.some((r) => r.entries.length > 0) && (
            <>
              <div className="spx-divider"><span>Magical Watch — Award Races</span></div>
              <div className="spx-awards">
                {awardRaces.filter((r) => r.entries.length > 0).map((race) => (
                  <div className="spx-award" key={`${race.league}-${race.award}`}>
                    <div className="spx-award__head">
                      <h3>{race.label}</h3>
                      <span>Market consensus, not official voting</span>
                    </div>
                    <ol className="spx-award__list">
                      {race.entries.slice(0, 5).map((e) => (
                        <li key={e.playerId}>
                          <span className="spx-award__rank">{e.currentRank}</span>
                          <div className="spx-award__info">
                            <b>{e.playerName}</b>
                            <span>{[e.position, e.team].filter(Boolean).join(" · ") || "Team unavailable"}</span>
                            {e.seasonStats && <span className="spx-award__stats">{e.seasonStats}</span>}
                            {e.teamRecord && <span className="spx-award__record">Team: {e.teamRecord}</span>}
                          </div>
                          {e.futuresConsensus && <span className="spx-award__odds">{e.futuresConsensus}</span>}
                        </li>
                      ))}
                    </ol>
                    <p className="spx-award__foot">Updated {new Date(race.entries[0].lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

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
                  <DiscoveryImage src={g.awayTeamLogoUrl} alt={g.awayTeamName} fallback={g.awayTeamName.slice(0, 3).toUpperCase()} />
                  <b>{g.awayScore ?? "—"}</b>
                  <span>VS</span>
                  <b>{g.homeScore ?? "—"}</b>
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
                <DiscoveryImage src={g.awayTeamLogoUrl} alt={g.awayTeamName} fallback={g.awayTeamName.slice(0, 3).toUpperCase()} />
                <span className="spx-up-row__vs">@</span>
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
                <DiscoveryImage src={featuredMatchup.game.awayTeamLogoUrl} alt={featuredMatchup.game.awayTeamName} fallback={featuredMatchup.game.awayTeamName.slice(0, 3).toUpperCase()} />
                <b>{featuredMatchup.game.awayTeamName}</b>
                <em>VS</em>
                <b>{featuredMatchup.game.homeTeamName}</b>
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
