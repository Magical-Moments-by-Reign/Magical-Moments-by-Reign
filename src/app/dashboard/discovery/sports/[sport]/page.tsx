import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { SPORT_CATALOG, getGamesByDate, getStandings, getMyTeams, searchTeamsForSport, getLeagueLogos, getFirstPreseasonGame, getFirstRegularSeasonGame, getTeamRoster } from "@/lib/discovery/sports/service";
import { ApiSportsProvider, defaultLeagueId, type SportSlug } from "@/lib/discovery/providers/sports";
import { followTeamAction, unfollowAction } from "../actions";
import SportBackdrop from "../SportBackdrop";
import CountdownClock from "../CountdownClock";
import "../../discovery.css";
import "../sports-home.css";

export const dynamic = "force-dynamic";

// American football doesn't get a league mark image at all — API-Sports
// doesn't reliably return usable league artwork for it, and the official
// NFL/NCAA shields are trademarked marks we don't have rights to reproduce.
// Those sports fall back to the plain styled-text mark below instead.
const NO_LEAGUE_LOGO: Partial<Record<SportSlug, true>> = { nfl: true, ncaaf: true };
const BLUE_LEAGUE_TEXT: Partial<Record<SportSlug, true>> = { nfl: true, ncaaf: true };
// Football sports get a real CSS-drawn turf field (green grass, crisp white
// yard lines) as the hero backdrop instead of the generic stadium photo —
// no photo file, no AI-generated artwork, just gradients.
const FIELD_BACKDROP: Partial<Record<SportSlug, true>> = { nfl: true, ncaaf: true };

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

  const [myTeams, searchResults, logos, firstPreseasonGame, firstRegularSeasonGame] = await Promise.all([
    getMyTeams(account.id),
    q?.trim() ? searchTeamsForSport(sport, q) : Promise.resolve([]),
    getLeagueLogos(),
    getFirstPreseasonGame(sport),
    getFirstRegularSeasonGame(sport),
  ]);
  const leagueLogo = NO_LEAGUE_LOGO[sport] ? undefined : logos[sport];
  const myTeamsForSport = myTeams.filter((t) => t.follow.sport === sport);

  // Real rosters for followed teams — we can't show injuries (not part of
  // the connected plan), so this is the honest substitute: who's actually
  // on the roster this season, straight from API-Sports.
  const rosters = new Map<string, Awaited<ReturnType<typeof getTeamRoster>>>();
  if (connected && myTeamsForSport.length) {
    const rosterResults = await Promise.all(
      myTeamsForSport.map((t) => (t.follow.teamExternalId ? getTeamRoster(sport, t.follow.teamExternalId) : Promise.resolve([]))),
    );
    myTeamsForSport.forEach((t, i) => rosters.set(t.follow.id, rosterResults[i]));
  }

  // Whole days until the real regular-season opener's kickoff — never
  // shown once kickoff has passed (that game becomes a normal schedule
  // entry, not a countdown target).
  const daysUntilKickoff = firstRegularSeasonGame
    ? Math.ceil((+new Date(firstRegularSeasonGame.startsAt) - Date.now()) / 86_400_000)
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
  // that game's kickoff passes, both this gate and CountdownClock's own
  // internal clock guard turn it off — the header falls back to the plain
  // sport-identification brand row below rather than showing an expired
  // 00:00:00:00 clock.
  const showHeroCountdown = Boolean(firstRegularSeasonGame && daysUntilKickoff !== null && daysUntilKickoff > 0);
  const showFieldBackdrop = showHeroCountdown && FIELD_BACKDROP[sport];

  return (
    <div className="spx">
      <header className={`spx-sport-header${showHeroCountdown ? " spx-sport-header--hero" : ""}${showFieldBackdrop ? " spx-sport-header--field" : ""}`}>
        {!showFieldBackdrop && <Image src="/discovery/stadium.png" alt="" fill priority sizes="100vw" className="spx-sport-header__photo" />}
        <div className="spx-sport-header__shade" />
        {!showHeroCountdown && <SportBackdrop sport={sport} />}
        <Link href="/dashboard/discovery/sports" className="spx-sport-header__back">← All Sports</Link>

        {showHeroCountdown && firstRegularSeasonGame ? (
          <div className="spx-countdown--hero">
            <span className={`spx-countdown__league${BLUE_LEAGUE_TEXT[sport] ? " spx-countdown__league--blue" : ""}`}>{sportMeta.label}</span>
            <span className="spx-countdown__title">Regular Season Countdown</span>
            <div className="spx-countdown__matchup--hero">
              <div className="spx-countdown__side">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {firstRegularSeasonGame.awayTeam.logoUrl ? <img src={firstRegularSeasonGame.awayTeam.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                <b>{firstRegularSeasonGame.awayTeam.name}</b>
              </div>
              <span className="spx-countdown__vs">VS</span>
              <div className="spx-countdown__side">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {firstRegularSeasonGame.homeTeam.logoUrl ? <img src={firstRegularSeasonGame.homeTeam.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                <b>{firstRegularSeasonGame.homeTeam.name}</b>
              </div>
            </div>
            <CountdownClock targetISO={firstRegularSeasonGame.startsAt} />
          </div>
        ) : (
          <div className="spx-sport-header__brand">
            {leagueLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leagueLogo} alt="" className="spx-sport-header__logo" />
            ) : (
              <span className="spx-sport-header__mark" aria-hidden="true">{sportMeta.label.slice(0, 3).toUpperCase()}</span>
            )}
            <h1>{sportMeta.label}</h1>
          </div>
        )}

        {firstPreseasonGame && (
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
                            {p.photoUrl ? <img src={p.photoUrl} alt="" /> : <div className="spx-roster__ph" />}
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
