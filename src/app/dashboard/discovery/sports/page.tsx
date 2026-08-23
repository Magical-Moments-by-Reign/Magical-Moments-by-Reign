import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import DiscoveryImage from "@/components/discovery/DiscoveryImage";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { SPORT_CATALOG, getMyTeams, getLeagueLogos, getSportsLandingGames, getGamesWithVoteContext, getMatchup, type MatchupCardContext, type SportCategory } from "@/lib/discovery/sports/service";
import { getMyFantasyLeagues } from "@/lib/discovery/sports/fantasy-service";
import { MATCHUP_SPORTS, ApiSportsProvider, type SportSlug } from "@/lib/discovery/providers/sports";
import { getAwardRace, AWARD_RACES, getCollegeFootballRankings } from "@/lib/discovery/sports/awards";
import { getMyTrackedPlayers } from "@/lib/discovery/sports/tracked-players";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import { untrackPlayerAction } from "./actions";
import { MagicalPicksPanel, FantasyFootballPanel } from "./PicksAndFantasyPanels";
import SportsIcon from "./SportsIcons";
import SportGlyph from "./SportGlyph";
import SportCardVisual from "./SportCardVisual";
import { SPORT_VISUALS } from "./visuals";
import PlayerSearch from "./PlayerSearch";
import PlayerAvatar from "./PlayerAvatar";
import DiscoveryNav from "../_nav";
import "../discovery.css";
import "./sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Moments Sports", robots: { index: false } };

// Category word under each Explore card — presentational only, not provider
// data. Matches the reference's FOOTBALL/BASKETBALL/etc. sub-labels.
const SPORT_KIND: Record<SportSlug, string> = {
  nfl: "Football", ncaaf: "Football", nba: "Basketball", wnba: "Basketball", ncaab: "Basketball", mlb: "Baseball", ncaabaseball: "Baseball",
  soccer: "Football", nhl: "Hockey", mma: "Mixed Martial Arts",
  rugby: "Rugby", volleyball: "Volleyball", f1: "Racing",
};

const CATEGORY_LABEL: Record<SportCategory, string> = {
  pro: "Pro Leagues",
  college: "College Sports",
  world: "World & Other Sports",
};

// Owner-supplied football photos for NFL/CFB's own small card icon —
// deliberately shown here instead of the live provider league logo (unlike
// every other league-logo sport). Not the large per-sport hero/background
// (see HERO_BACKDROP_IMAGE in [sport]/page.tsx, which no longer uses these).
const FOOTBALL_CARD_ICON: Partial<Record<SportSlug, string>> = {
  nfl: "/discovery/nfl-hero.png",
  ncaaf: "/discovery/college-football-hero.png",
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

  const [logos, { live, upcoming }, featuredMatchup, myFantasyLeagues, awardRaces, rankings, trackedPlayers] = await Promise.all([
    getLeagueLogos(),
    getSportsLandingGames(followedSports.length ? followedSports : (["nfl", "nba", "mlb", "nhl"] as SportSlug[])),
    pickFeaturedMatchup(myTeams, followedSports, account.id),
    getMyFantasyLeagues(account.id),
    showSdio
      ? Promise.all(AWARD_RACES.map(async (r) => ({ ...r, entries: await getAwardRace(r.league, r.award) })))
      : Promise.resolve([]),
    showSdio ? getCollegeFootballRankings() : Promise.resolve([]),
    showSdio ? getMyTrackedPlayers(account.id) : Promise.resolve([]),
  ]);
  const featuredMatchupSportLabel = featuredMatchup ? SPORT_CATALOG.find((s) => s.slug === featuredMatchup.game.sport)?.label : undefined;
  const trackedKeys = trackedPlayers.map((t) => `${t.league}:${t.playerId}`);

  return (
    <div className="spx">
      <DiscoveryNav active="/dashboard/discovery/sports" />

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
      {(["pro", "college", "world"] as SportCategory[]).map((category) => (
        <div key={category} className="spx-category">
          <h3 className="spx-category__label">{CATEGORY_LABEL[category]}</h3>
          <div className="spx-grid">
            {SPORT_CATALOG.filter((s) => s.category === category).map((s) => {
              const visual = SPORT_VISUALS[s.slug];
              return (
                <Link key={s.slug} href={`/dashboard/discovery/sports/${s.slug}`} className="spx-card">
                  <SportCardVisual
                    src={FOOTBALL_CARD_ICON[s.slug] ?? (visual.kind === "league-logo" ? logos[s.slug] : undefined)}
                    alt={`${s.label} mark`}
                    glyph={visual.glyph}
                  />
                  <b>{s.label}</b>
                  <span>{SPORT_KIND[s.slug]}</span>
                </Link>
              );
            })}
            {category === "world" && (
              <span className="spx-card spx-card--soon" aria-disabled="true">
                <SportGlyph sport="golf" />
                <b>Golf</b>
                <span>Coming Soon</span>
              </span>
            )}
          </div>
        </div>
      ))}

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
                    <Link href={`/dashboard/discovery/sports/player/${t.league}/${t.playerId}`} className="spx-search__linkarea">
                      <PlayerAvatar photoUrl={t.live?.photoUrl} size="sm" />
                      <div className="spx-tracked__info">
                        <b>{t.playerName}</b>
                        <span>{t.league.toUpperCase()} · {[t.position, t.team].filter(Boolean).join(" · ") || "Team unavailable"}</span>
                        {t.live?.status && <span className="spx-tracked__status">{t.live.status}</span>}
                      </div>
                    </Link>
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
                      {race.entries.slice(0, 5).map((e) => {
                        // A real SportsDataIO PlayerID is purely numeric; the
                        // futures feed occasionally has no id at all, in
                        // which case fetchAwardFutures falls back to a
                        // synthetic key that can't resolve a real profile —
                        // only link when it's the real thing.
                        const hasRealId = /^\d+$/.test(e.playerId);
                        const info = (
                          <div className="spx-award__info">
                            <b>{e.playerName}</b>
                            <span>{[e.position, e.team].filter(Boolean).join(" · ") || "Team unavailable"}</span>
                            {e.seasonStats && <span className="spx-award__stats">{e.seasonStats}</span>}
                            {e.teamRecord && <span className="spx-award__record">Team: {e.teamRecord}</span>}
                          </div>
                        );
                        return (
                          <li key={e.playerId}>
                            <span className="spx-award__rank">{e.currentRank}</span>
                            {hasRealId ? <Link href={`/dashboard/discovery/sports/player/${race.league}/${e.playerId}`} className="spx-search__linkarea">{info}</Link> : info}
                            {e.futuresConsensus && <span className="spx-award__odds">{e.futuresConsensus}</span>}
                          </li>
                        );
                      })}
                    </ol>
                    <p className="spx-award__foot">Updated {new Date(race.entries[0].lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {rankings.length > 0 && (
            <>
              <div className="spx-divider"><span>College Football Rankings</span></div>
              <div className="spx-awards">
                <div className="spx-award">
                  <div className="spx-award__head">
                    <h3>{rankings[0]?.poll ?? "Poll Rankings"}</h3>
                    <span>Per the provider&rsquo;s own current poll</span>
                  </div>
                  <ol className="spx-award__list">
                    {rankings.slice(0, 25).map((r) => (
                      <li key={`${r.rank}-${r.team}`}>
                        <span className="spx-award__rank">{r.rank}</span>
                        <div className="spx-award__info">
                          <b>{r.team}</b>
                          {r.previousRank != null && r.previousRank !== r.rank && (
                            <span>Previously #{r.previousRank}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
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

        <MagicalPicksPanel matchup={featuredMatchup} previewSportLabel={featuredMatchupSportLabel} sport={featuredMatchup?.game.sport as SportSlug | undefined} />

        <FantasyFootballPanel leagues={myFantasyLeagues} />

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
        <Link href="/dashboard/discovery/sports/fantasy" className="spx-bar__item"><SportsIcon name="grid" /><span><b>Fantasy Football</b><i>Draft real NFL players, run your own league</i></span></Link>
        <Link href="/dashboard" className="spx-bar__item"><SportsIcon name="star" /><span><b>Magical Moments</b><i>Make every game unforgettable</i></span></Link>
        <span className="spx-bar__item spx-bar__item--soon"><SportsIcon name="play" /><span><b>Highlights</b><i>Relive the action</i></span><span className="spx-bar__soon-pill">Coming Soon</span></span>
      </nav>
    </div>
  );
}
