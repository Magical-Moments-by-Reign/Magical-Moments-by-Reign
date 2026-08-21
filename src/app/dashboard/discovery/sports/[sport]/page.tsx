import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { SPORT_CATALOG, getGamesByDate, getStandings, getMyTeams, searchTeamsForSport, getLeagueLogos, getFirstPreseasonGame, getFirstRegularSeasonGame, getTeamRoster, getNbaHeroState } from "@/lib/discovery/sports/service";
import { ApiSportsProvider, defaultLeagueId, type SportSlug } from "@/lib/discovery/providers/sports";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import { followTeamAction, unfollowAction } from "../actions";
import SportBackdrop from "../SportBackdrop";
import CountdownClock from "../CountdownClock";
import JerseyAvatar from "../JerseyAvatar";
import SportCardVisual from "../SportCardVisual";
import { SPORT_VISUALS } from "../visuals";
import "../../discovery.css";
import "../sports-home.css";

export const dynamic = "force-dynamic";

const BLUE_LEAGUE_TEXT: Partial<Record<SportSlug, true>> = { nfl: true, ncaaf: true };
// Sports with an Owner-provided backdrop photo (public/discovery/*) to use
// as the hero background instead of the generic stadium shot — none of
// these images carry team/league marks, just a real field/court.
const HERO_BACKDROP_IMAGE: Partial<Record<SportSlug, string>> = {
  nfl: "/discovery/football-field.png",
  ncaaf: "/discovery/football-field.png",
  nba: "/discovery/basketball-court.png",
};
// Sports whose hero countdown targets the real preseason opener until that
// game's kickoff passes, then automatically flips to the real regular-
// season opener — real dates/teams from API-Sports either way, never
// computed or guessed. Off by default (football's hero always targets the
// regular-season opener, with preseason as a separate footnote line).
const PRESEASON_PHASE_SPORTS: Partial<Record<SportSlug, true>> = { nba: true };

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<Metadata> {
  const { sport } = await params;
  const meta = SPORT_CATALOG.find((s) => s.slug === sport);
  return { title: meta ? `${meta.label} — Magical Moments Sports` : "Sports", robots: { index: false } };
}

export default async function SportPage({ params, searchParams }: { params: Promise<{ sport: string }>; searchParams: Promise<{ q?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { sport: sportParam } = await params;
  const { q } = await searchParams;
  const sportMeta = SPORT_CATALOG.find((s) => s.slug === sportParam);
  if (!sportMeta) notFound();
  const sport = sportParam as SportSlug;

  const connected = ApiSportsProvider.isConfigured(sport);
  const league = defaultLeagueId(sport);
  const hasLeague = Boolean(league);

  const [myTeams, searchResults, logos, firstPreseasonGame, firstRegularSeasonGame, nbaHeroState] = await Promise.all([
    getMyTeams(account.id),
    q?.trim() ? searchTeamsForSport(sport, q) : Promise.resolve([]),
    getLeagueLogos(),
    getFirstPreseasonGame(sport),
    getFirstRegularSeasonGame(sport),
    sport === "nba" ? getNbaHeroState() : Promise.resolve(null),
  ]);
  const leagueLogo = SPORT_VISUALS[sport].kind === "league-logo" ? logos[sport] : undefined;
  const myTeamsForSport = myTeams.filter((t) => t.follow.sport === sport);

  // Real rosters for followed teams — we can't show injuries (not part of
  // the connected plan), so this is the honest substitute: who's actually
  // on the roster this season. API-Sports first; SportsDataIO second (NBA
  // only) when API-Sports has nothing — gated to owner/admin preview or
  // sdioCommercialMode, matching every other SportsDataIO-driven member
  // surface, since player-team association is that provider's documented
  // trial-data weak spot (see sdioCommercialMode's doc comment).
  const isOwner = await isOwnerAccount(account.id);
  const allowSdioRoster = sport === "nba" && sdioConfigured() && (sdioCommercialMode() || isOwner);
  const rosters = new Map<string, Awaited<ReturnType<typeof getTeamRoster>>>();
  if (myTeamsForSport.length) {
    const rosterResults = await Promise.all(
      myTeamsForSport.map((t) =>
        t.follow.teamExternalId
          ? getTeamRoster(sport, t.follow.teamExternalId, { teamName: t.follow.teamName ?? undefined, allowSecondarySource: allowSdioRoster })
          : Promise.resolve([]),
      ),
    );
    myTeamsForSport.forEach((t, i) => rosters.set(t.follow.id, rosterResults[i]));
  }

  // Which real game the hero countdown targets: for PRESEASON_PHASE_SPORTS,
  // the preseason opener until its kickoff passes, then the regular-season
  // opener; every other sport always targets the regular-season opener.
  // NBA is special-cased through getNbaHeroState, which adds a SportsDataIO
  // fallback and a known-official-date last resort when neither provider
  // has posted the season yet — see that function for the full priority
  // order. heroGame is null in that last-resort state (a real date to count
  // down to, but no matchup to show yet — never a fabricated one).
  const preseasonKickoff = firstPreseasonGame ? +new Date(firstPreseasonGame.startsAt) : null;
  const preseasonNotYetStarted = preseasonKickoff !== null && preseasonKickoff > Date.now();
  const heroPhase: "preseason" | "regular" = PRESEASON_PHASE_SPORTS[sport] && preseasonNotYetStarted ? "preseason" : "regular";
  const heroGame = nbaHeroState ? nbaHeroState.game : heroPhase === "preseason" ? firstPreseasonGame : firstRegularSeasonGame;
  const resolvedHeroPhase = nbaHeroState ? nbaHeroState.phase : heroPhase;
  const heroTitle = resolvedHeroPhase === "preseason" ? "Preseason Countdown" : "Regular Season Countdown";
  const heroTargetISO = nbaHeroState ? nbaHeroState.targetISO : heroGame?.startsAt;
  // True only for NBA's known-date last resort: heroTargetISO is a bare
  // calendar date with no real time attached, so the matchup area shows a
  // plain "<phase> begins <date>" line instead of team blocks, and
  // CountdownClock is told not to display or count down to a fabricated
  // time of day.
  const heroDateOnly = nbaHeroState?.dateOnly ?? false;
  const heroTbdLabel = heroDateOnly
    ? `${resolvedHeroPhase === "preseason" ? "Preseason" : "Regular season"} begins ${(() => {
        const [y, m, d] = heroTargetISO!.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric" });
      })()}`
    : "Matchup announced soon";

  // Whole days until the hero's target — never shown once it's passed (a
  // real game becomes a normal schedule entry, not a countdown target).
  const daysUntilKickoff = heroTargetISO
    ? Math.ceil((+new Date(heroTargetISO) - Date.now()) / 86_400_000)
    : null;

  let games: Awaited<ReturnType<typeof getGamesByDate>>["games"] = [];
  let gamesLabel = "Today's Games";
  let planRestricted: string | undefined;
  if (connected) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const today = await getGamesByDate(sport, todayISO);
    planRestricted = today.planRestricted;
    games = today.games;
    if (!games.length && !planRestricted) {
      for (let daysOut = 1; daysOut <= 7 && !games.length; daysOut++) {
        const dateISO = new Date(Date.now() + daysOut * 86_400_000).toISOString().slice(0, 10);
        const next = await getGamesByDate(sport, dateISO);
        if (next.games.length) {
          games = next.games;
          gamesLabel = `Next Games — ${new Date(dateISO).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;
        }
      }
    }
  }

  const standingsResult = connected && hasLeague ? await getStandings(sport, league) : { standings: [] };
  const standings = standingsResult.standings ?? [];
  const standingsRestricted = standingsResult.planRestricted;

  // The real season-opener countdown is the hero's dominant state. Once
  // its target passes, both this gate and CountdownClock's own internal
  // clock guard turn it off — the header falls back to the plain
  // sport-identification brand row below rather than showing an expired
  // 00:00:00:00 clock. For PRESEASON_PHASE_SPORTS this re-evaluates on the
  // regular-season opener once heroGame has already flipped to it above.
  // Gated on heroTargetISO rather than heroGame so NBA's known-date
  // fallback (a real date, no matchup yet) still shows the hero.
  const showHeroCountdown = Boolean(heroTargetISO && daysUntilKickoff !== null && daysUntilKickoff > 0);
  // The Owner-provided backdrop photo is this sport's backdrop any time we're
  // on its page — not just while a countdown happens to be showing. Without
  // this, a sport with no upcoming game data yet (e.g. NBA's next season not
  // posted by API-Sports) would silently fall back to the generic stadium
  // photo and decorative line art instead.
  const heroBackdrop = HERO_BACKDROP_IMAGE[sport];
  const backdropSrc = heroBackdrop ?? "/discovery/stadium.png";

  return (
    <div className="spx">
      <header className={`spx-sport-header${showHeroCountdown ? " spx-sport-header--hero" : ""}`}>
        <Image src={backdropSrc} alt="" fill priority sizes="100vw" className="spx-sport-header__photo" />
        <div className="spx-sport-header__shade" />
        {!heroBackdrop && <SportBackdrop sport={sport} />}
        <Link href="/dashboard/discovery/sports" className="spx-sport-header__back">← All Sports</Link>

        {showHeroCountdown && heroTargetISO ? (
          <div className="spx-countdown--hero">
            <span className={`spx-countdown__league${BLUE_LEAGUE_TEXT[sport] ? " spx-countdown__league--blue" : ""}`}>{sportMeta.label}</span>
            <span className="spx-countdown__title">{heroTitle}</span>
            {heroGame ? (
              <div className="spx-countdown__matchup--hero">
                <div className="spx-countdown__side">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {heroGame.awayTeam.logoUrl ? <img src={heroGame.awayTeam.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                  <b>{heroGame.awayTeam.name}</b>
                </div>
                <span className="spx-countdown__vs">VS</span>
                <div className="spx-countdown__side">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {heroGame.homeTeam.logoUrl ? <img src={heroGame.homeTeam.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                  <b>{heroGame.homeTeam.name}</b>
                </div>
              </div>
            ) : (
              <p className="spx-countdown__tbd">{heroTbdLabel}</p>
            )}
            <CountdownClock targetISO={heroTargetISO} dateOnly={heroDateOnly} />
          </div>
        ) : (
          <div className="spx-sport-header__brand">
            <span className="spx-sport-header__logo">
              <SportCardVisual src={leagueLogo} alt={`${sportMeta.label} mark`} glyph={SPORT_VISUALS[sport].glyph} />
            </span>
            <h1>{sportMeta.label}</h1>
          </div>
        )}

        {firstPreseasonGame && !PRESEASON_PHASE_SPORTS[sport] && (
          <p className="spx-sport-header__preseason">
            Preseason begins {new Date(firstPreseasonGame.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" "}— {firstPreseasonGame.awayTeam.name} @ {firstPreseasonGame.homeTeam.name}
          </p>
        )}
      </header>

      <div className="spx-panel" style={{ marginBottom: "1.4rem" }}>
        <div className="spx-panel__head"><h2>{gamesLabel}</h2></div>
        {!connected ? (
          <div className="disc-pending"><b>Live {sportMeta.label} data pending</b>API-Sports isn&rsquo;t connected for this sport yet — nothing here is invented.</div>
        ) : !hasLeague ? (
          <div className="disc-pending"><b>Live game data isn&rsquo;t mapped for {sportMeta.label} yet</b>Fight/race results aren&rsquo;t shaped like a standard games schedule in our current integration — this isn&rsquo;t a &ldquo;no events&rdquo; result, it&rsquo;s a real gap we haven&rsquo;t built yet.</div>
        ) : planRestricted ? (
          <div className="disc-pending"><b>{sportMeta.label} data isn&rsquo;t available on the connected plan</b>The provider reported a plan restriction: &ldquo;{planRestricted}&rdquo;. This isn&rsquo;t a &ldquo;no games&rdquo; result.</div>
        ) : games.length === 0 ? (
          <p className="spx-panel__empty">No games found in the next week for {sportMeta.label}.</p>
        ) : (
          <div className="spx-panels" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {games.map((g) => (
              <Link key={g.id} href={`/dashboard/discovery/sports/game/${g.id}`} className="spx-live-row">
                <div className="spx-live-row__meta">{g.status === "live" ? (<><i />LIVE{g.period ? ` · ${g.period}` : ""}</>) : g.status === "final" ? "FINAL" : new Date(g.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                <div className="spx-live-row__score">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.awayTeamLogoUrl ? <img src={g.awayTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                  <b>{g.awayScore ?? "—"}</b><span>VS</span><b>{g.homeScore ?? "—"}</b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.homeTeamLogoUrl ? <img src={g.homeTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                </div>
                <div className="spx-live-row__names"><span>{g.awayTeamName}</span><span>{g.homeTeamName}</span></div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="spx-panels" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="spx-panel" id="standings">
          <div className="spx-panel__head"><h2>Standings</h2></div>
          {!connected || !hasLeague ? (
            <p className="spx-panel__empty">Standings aren&rsquo;t available for {sportMeta.label} yet.</p>
          ) : standingsRestricted ? (
            <p className="spx-panel__empty">Standings aren&rsquo;t available on the connected data plan for {sportMeta.label} right now.</p>
          ) : standings.length === 0 ? (
            <p className="spx-panel__empty">No standings data returned for the current season.</p>
          ) : (
            <div className="spx-panel__body">
              {standings.slice(0, 12).map((s, i) => (
                <div className="spx-team-row" key={s.team.id}>
                  <span style={{ color: "var(--gold)", fontSize: ".72rem", fontWeight: 800, width: 18 }}>{s.rank ?? i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.team.logoUrl ? <img src={s.team.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                  <b>{s.team.name}</b>
                  <span style={{ marginLeft: "auto", color: "#9c8f76", fontSize: ".72rem" }}>{s.summary ?? `${s.wins ?? 0}-${s.losses ?? 0}${s.ties ? `-${s.ties}` : ""}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="spx-panel">
          <div className="spx-panel__head"><h2>My {sportMeta.label} Teams</h2></div>
          <div className="spx-panel__body">
            {myTeamsForSport.length === 0 ? (
              <p className="spx-panel__empty">You haven&rsquo;t followed a {sportMeta.label} team yet.</p>
            ) : myTeamsForSport.map(({ follow }) => {
              const roster = rosters.get(follow.id) ?? [];
              return (
                <div key={follow.id} className="spx-my-team">
                  <div className="spx-team-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {follow.teamLogoUrl ? <img src={follow.teamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                    <b>{follow.teamName}</b>
                    <form action={unfollowAction} style={{ marginLeft: "auto" }}>
                      <input type="hidden" name="followId" value={follow.id} />
                      <button type="submit" className="spx-poll__actions" style={{ background: "none", border: "1px solid rgba(201,162,75,.4)", color: "var(--gold)", borderRadius: 6, padding: ".2rem .5rem", fontSize: ".64rem", cursor: "pointer" }}>Unfollow</button>
                    </form>
                  </div>
                  {roster.length > 0 && (
                    <details className="spx-roster">
                      <summary>Roster ({roster.length})</summary>
                      <div className="spx-roster__grid">
                        {roster.map((p) => (
                          <div className="spx-roster__player" key={p.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {p.photoUrl ? <img src={p.photoUrl} alt="" /> : <JerseyAvatar number={p.number} />}
                            <span className="spx-roster__name">{p.name}</span>
                            <span className="spx-roster__meta">{p.number != null ? `#${p.number}` : ""}{p.number != null && p.position ? " · " : ""}{p.position ?? ""}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {connected && (
            <form method="get" style={{ marginTop: "1rem", display: "flex", gap: ".4rem" }}>
              <input type="text" name="q" placeholder={`Search ${sportMeta.label} teams…`} defaultValue={q ?? ""} style={{ flex: 1, padding: ".5rem .7rem", borderRadius: 8, border: "1px solid rgba(201,162,75,.3)", background: "rgba(255,255,255,.04)", color: "#f4f1ea", fontSize: ".78rem" }} />
              <button type="submit" className="spx-panel__cta" style={{ marginTop: 0, whiteSpace: "nowrap" }}>Search</button>
            </form>
          )}
          {searchResults.length > 0 && (
            <div className="spx-panel__body" style={{ marginTop: ".8rem" }}>
              {searchResults.map((t) => (
                <form action={followTeamAction} key={t.id} className="spx-team-row">
                  <input type="hidden" name="sport" value={sport} />
                  <input type="hidden" name="teamExternalId" value={t.id} />
                  <input type="hidden" name="teamName" value={t.name} />
                  {t.logoUrl && <input type="hidden" name="teamLogoUrl" value={t.logoUrl} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.logoUrl ? <img src={t.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                  <b>{t.name}</b>
                  <button type="submit" className="spx-panel__cta" style={{ marginTop: 0, marginLeft: "auto", padding: ".3rem .7rem" }}>Follow</button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
