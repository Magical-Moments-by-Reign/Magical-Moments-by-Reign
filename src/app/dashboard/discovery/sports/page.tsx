import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getSportsFeed } from "@/lib/discovery/service";
import { SPORT_CATALOG, getGamesWithVoteContext, getMySportsFollows, searchSports } from "@/lib/discovery/sports/service";
import { MATCHUP_SPORTS, ApiSportsProvider, type SportSlug } from "@/lib/discovery/providers/sports";
import { followSportAction, followTeamAction } from "./actions";
import { MatchupCard } from "./MatchupCard";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sports — Magical Discovery", robots: { index: false } };

export default async function SportsPage({ searchParams }: { searchParams: Promise<{ location?: string; sport?: string; q?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { location, sport: sportParam, q } = await searchParams;

  const [feed, myFollows] = await Promise.all([getSportsFeed(location), getMySportsFollows(account.id)]);
  const sport = (sportParam && SPORT_CATALOG.some((s) => s.slug === sportParam) ? sportParam : myFollows[0]?.sport || "nfl") as SportSlug;
  const sportMeta = SPORT_CATALOG.find((s) => s.slug === sport)!;
  const todayISO = new Date().toISOString().slice(0, 10);

  const connected = ApiSportsProvider.isConfigured(sport);
  const { contexts: gamesForVote, planRestricted } = connected
    ? await getGamesWithVoteContext(sport, todayISO, account.id)
    : { contexts: [], planRestricted: undefined as string | undefined };

  const searchResults = q?.trim() ? await searchSports(q) : null;
  const isFollowingSport = myFollows.some((f) => f.sport === sport && f.kind === "sport");

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Sports</h1>
        <p className="pg-sub">Discover, follow, predict, and play — a Magical Moments take on game day, never a betting product.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/sports" />

      <form className="disc-form" method="get">
        <input type="hidden" name="sport" value={sport} />
        <input type="text" name="q" placeholder="Search sports, leagues, or teams" defaultValue={q ?? ""} aria-label="Search sports, leagues, or teams" />
        <button type="submit" className="btn btn--gold">Search</button>
      </form>

      {searchResults && (
        <div className="disc-section">
          <div className="disc-section__head"><h2>Search Results</h2></div>
          {searchResults.teams.length === 0 && searchResults.sports.length === 0 && <p className="disc-empty">No matches found.</p>}
          {searchResults.teams.length > 0 && (
            <div className="disc-grid" style={{ marginBottom: "1rem" }}>
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
        </div>
      )}

      <div className="sports-hero">
        <div>
          <h2>My Sports</h2>
          <p>{myFollows.length ? myFollows.map((f) => f.label).join(" · ") : "Follow a sport to personalize your Discovery feed."}</p>
        </div>
        <div style={{ display: "flex", gap: ".6rem" }}>
          <Link href="/dashboard/discovery/sports/my-teams" className="btn btn--sm">My Teams</Link>
          <Link href="/dashboard/discovery/sports/picks" className="btn btn--sm btn--gold">Magical Picks</Link>
        </div>
      </div>

      <div className="disc-filters">
        {SPORT_CATALOG.map((s) => (
          <Link key={s.slug} href={`/dashboard/discovery/sports?sport=${s.slug}`} aria-current={s.slug === sport}>{s.label}</Link>
        ))}
        <Link href="/dashboard/discovery/sports?sport=high_school" aria-current={sportParam === "high_school"}>High School</Link>
      </div>

      {sportParam === "high_school" ? (
        <div className="disc-pending">
          <b>High school sports — coming soon</b>
          We&rsquo;re working on a licensed high-school data partnership. No scores or schedules are shown here until a real, approved provider is connected — nothing on this page is invented.
        </div>
      ) : (
        <div className="disc-section">
          <div className="disc-section__head">
            <h2>{sportMeta.label} — Today</h2>
            {!isFollowingSport && (
              <form action={followSportAction}><input type="hidden" name="sport" value={sport} /><button type="submit" className="btn btn--sm">Follow {sportMeta.label}</button></form>
            )}
          </div>
          {!connected ? (
            <div className="disc-pending">
              <b>Live {sportMeta.label} data pending</b>
              API-Sports isn&rsquo;t connected yet, so nothing here is invented — games will appear the moment a key is configured.
            </div>
          ) : planRestricted && gamesForVote.length === 0 ? (
            <div className="disc-pending">
              <b>{sportMeta.label} data isn&rsquo;t available for today on the connected plan</b>
              This isn&rsquo;t a &ldquo;no games today&rdquo; result — the provider reported a plan restriction: &ldquo;{planRestricted}&rdquo;. We&rsquo;ll show live games again automatically once the connected plan covers this date; an Owner can confirm details on the Sports diagnostics page.
            </div>
          ) : gamesForVote.length === 0 ? (
            <p className="disc-empty">No {sportMeta.label} games found for today.</p>
          ) : (
            <div className="disc-grid disc-grid--wide">
              {gamesForVote.map(({ game, tally, myPick, myPickCorrect, locked }) => (
                <MatchupCard key={game.id} game={game} tally={tally} myPick={myPick} myPickCorrect={myPickCorrect} locked={locked} sportLabel={sportMeta.label} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="disc-section">
        <div className="disc-section__head"><h2>Sporting Event Tickets — Near You</h2></div>
        <form className="disc-form" method="get">
          <input type="hidden" name="sport" value={sport} />
          <input type="text" name="location" placeholder="City or ZIP code" defaultValue={location ?? ""} aria-label="City or ZIP code" />
          <button type="submit" className="btn btn--gold">Find Sporting Events</button>
        </form>
        {location?.trim() ? (
          feed.ticketedEvents.items.length ? (
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
          )
        ) : (
          <p className="disc-empty">Enter a city to see sporting event tickets nearby, via Near You.</p>
        )}
      </div>
    </div>
  );
}
