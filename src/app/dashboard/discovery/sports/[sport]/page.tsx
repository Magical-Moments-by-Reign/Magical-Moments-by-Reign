import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { SPORT_CATALOG, getGamesByDate, getStandings, getMyTeams, searchTeamsForSport, getLeagueLogos, getFirstPreseasonGame } from "@/lib/discovery/sports/service";
import { ApiSportsProvider, defaultLeagueId, type SportSlug } from "@/lib/discovery/providers/sports";
import { followTeamAction, unfollowAction } from "../actions";
import SportBackdrop from "../SportBackdrop";
import "../../discovery.css";
import "../sports-home.css";

export const dynamic = "force-dynamic";

// API-Sports doesn't reliably return usable league artwork for American
// football — see the matching note in ../page.tsx.
const NO_LIVE_LOGO = new Set<SportSlug>(["nfl", "ncaaf"]);

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

  const [myTeams, searchResults, logos, firstPreseasonGame] = await Promise.all([
    getMyTeams(account.id),
    q?.trim() ? searchTeamsForSport(sport, q) : Promise.resolve([]),
    getLeagueLogos(),
    getFirstPreseasonGame(sport),
  ]);
  const leagueLogo = NO_LIVE_LOGO.has(sport) ? undefined : logos[sport];
  const myTeamsForSport = myTeams.filter((t) => t.follow.sport === sport);

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
  const standings = standingsResult.standings;
  const standingsRestricted = standingsResult.planRestricted;

  return (
    <div className="spx">
      <header className="spx-sport-header">
        <SportBackdrop sport={sport} />
        <Link href="/dashboard/discovery/sports" className="spx-sport-header__back">← All Sports</Link>
        <div className="spx-sport-header__brand">
          {leagueLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leagueLogo} alt="" className="spx-sport-header__logo" />
          ) : (
            <span className="spx-sport-header__mark" aria-hidden="true">{sportMeta.label.slice(0, 3).toUpperCase()}</span>
          )}
          <h1>{sportMeta.label}</h1>
        </div>
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
            ) : myTeamsForSport.map(({ follow }) => (
              <div className="spx-team-row" key={follow.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {follow.teamLogoUrl ? <img src={follow.teamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                <b>{follow.teamName}</b>
                <form action={unfollowAction} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="followId" value={follow.id} />
                  <button type="submit" className="spx-poll__actions" style={{ background: "none", border: "1px solid rgba(201,162,75,.4)", color: "var(--gold)", borderRadius: 6, padding: ".2rem .5rem", fontSize: ".64rem", cursor: "pointer" }}>Unfollow</button>
                </form>
              </div>
            ))}
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
