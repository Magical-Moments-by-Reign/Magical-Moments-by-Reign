import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { SPORT_CATALOG, getGamesByDate, getGamesWithVoteContext, getStandings, getStandingsWithOffSeasonFallback, getLeagueTeamCatalog, getMyTeams, searchTeamsForSport, getLeagueLogos, getFirstPreseasonGame, getFirstRegularSeasonGame, getFirstPostseasonGame, getTeamRoster, getTeamInjuries, resolveFollowedTeamRosters, resolveFollowedTeamInjuries, getNbaHeroState, getMlbPlayoffPicture, getNhlPlayoffPicture, getNbaPlayoffPicture, getWnbaPlayoffPicture, sdioLeagueFor, resolveDefaultLeagueId } from "@/lib/discovery/sports/service";
import { getMyFantasyLeagues } from "@/lib/discovery/sports/fantasy-service";
import { normalizeStandingsBySport, determineSeasonPhase, formatSeasonLabel } from "@/lib/discovery/sports/standings";
import { getPlayerIdDirectoryByName, resolveProfileLinksFromDirectory } from "@/lib/discovery/sports/player-profile";
import { getTeamDirectory, getVerifiedStandingsFallback, hasVerifiedReference, buildTeamDirectoryFromCatalog, type DirectoryGroup } from "@/lib/discovery/sports/team-directory";
import { formatGroupLabel } from "@/lib/discovery/sports/group-labels";
import TeamDirectory from "../TeamDirectory";
import StandingsTeamRow from "../StandingsTeamRow";
import { MagicalPicksPanel, FantasyFootballPanel } from "../PicksAndFantasyPanels";
import { ApiSportsProvider, MATCHUP_SPORTS, type SportSlug } from "@/lib/discovery/providers/sports";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import { followTeamAction, unfollowAction } from "../actions";
import SportBackdrop from "../SportBackdrop";
import CountdownClock from "../CountdownClock";
import JerseyAvatar from "../JerseyAvatar";
import PlayerAvatar from "../PlayerAvatar";
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
// Owner-supplied football photos for NFL/CFB's own small brand/logo badge —
// NOT the large hero/background above (HERO_BACKDROP_IMAGE). Overrides the
// live provider league logo for just these two sports, same as the Sports
// hub's card grid (see FOOTBALL_CARD_ICON in ../page.tsx).
const FOOTBALL_LOGO_BADGE: Partial<Record<SportSlug, string>> = {
  nfl: "/discovery/nfl-hero.png",
  ncaaf: "/discovery/college-football-hero.png",
};
// Sports whose hero countdown targets the real preseason opener until that
// game's kickoff passes, then automatically flips to the real regular-
// season opener — real dates/teams from API-Sports either way, never
// computed or guessed. Off by default (football's hero always targets the
// regular-season opener, with preseason as a separate footnote line).
const PRESEASON_PHASE_SPORTS: Partial<Record<SportSlug, true>> = { nba: true };

// Sports with a real, fully wired Playoff Bracket page today (see
// [sport]/bracket/page.tsx's own BRACKET_READY_SPORTS, which this mirrors).
// Used both to gate the spx-bracket-cta entry-point card below and to
// exclude these sports from the older list-based "Playoff Picture" panel
// (playoffPictureGroups) they've been superseded by.
const BRACKET_READY_SPORTS = new Set<SportSlug>(["nfl", "nba", "wnba", "mlb", "nhl"]);

// Body copy for the projected-phase Playoff Bracket CTA, per sport — real
// round names for each sport's own real postseason format (see bracket.ts's
// per-sport adapters). The postseason-phase copy stays sport-generic (uses
// sportMeta.label) since it doesn't need to spell out the round list.
const BRACKET_CTA_PROJECTED_COPY: Partial<Record<SportSlug, string>> = {
  nfl: "See the full AFC & NFC field if the playoffs started today — Wild Card through the Super Bowl.",
  nba: "See the full Eastern & Western field if the playoffs started today — Play-In through the NBA Finals.",
  wnba: "See the full field if the playoffs started today — First Round through the WNBA Finals.",
  mlb: "See the full AL & NL field if the playoffs started today — Wild Card Series through the World Series.",
  nhl: "See the full Eastern & Western field if the playoffs started today — First Round through the Stanley Cup Final.",
};

// F1/MMA Coming Soon copy — see the early-return above. Never claims a
// launch date; states plainly what isn't connected rather than what will
// eventually exist.
const COMING_SOON_COPY: Record<"f1" | "mma", { body: string; followNoun: string }> = {
  f1: {
    body: "Once a real Formula 1 data source is connected, this page will show real race schedules, results, and constructor/driver standings — and Race Winner Picks once that's genuinely ready. Nothing here is fabricated in the meantime.",
    followNoun: "a Driver or Team",
  },
  mma: {
    body: "Once a real MMA data source is connected, this page will show real event cards, results, and fighter records — and Fight Picks once that's genuinely ready. Nothing here is fabricated in the meantime.",
    followNoun: "a Fighter",
  },
};

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

  // F1 and MMA: ApiSportsProvider.isConfigured() hardcodes these to false
  // regardless of any API key (see that function — neither fits the
  // games/fixtures shape this provider maps today), so every dimension of
  // this page (games, standings, teams, follow, Magical Picks) is
  // structurally dead for them, not just unconfigured today. Rather than
  // render a page full of individually-empty panels (misleading — reads as
  // "broken", not "not built yet"), these two sports get one honest,
  // on-brand Coming Soon state instead of the normal page body. See
  // COMING_SOON_COPY below.
  if (sport === "mma" || sport === "f1") {
    const heroBackdrop = HERO_BACKDROP_IMAGE[sport];
    const copy = COMING_SOON_COPY[sport];
    return (
      <div className="spx">
        <header className="spx-sport-header">
          <Image src={heroBackdrop ?? "/discovery/stadium.png"} alt="" fill priority sizes="100vw" className="spx-sport-header__photo" />
          <div className="spx-sport-header__shade" />
          {!heroBackdrop && <SportBackdrop sport={sport} />}
          {/* "All Sports" is a fixed destination, not a contextual Back
            control — always the Sports hub, never history-aware. */}
        <Link href="/dashboard/discovery/sports" className="spx-sport-header__back">← All Sports</Link>
          <div className="spx-sport-header__brand">
            <span className="spx-sport-header__logo">
              <SportCardVisual alt={`${sportMeta.label} mark`} glyph={SPORT_VISUALS[sport].glyph} />
            </span>
            <h1>{sportMeta.label}</h1>
          </div>
        </header>

        <section className="spx-coming-soon">
          <h2>Coming Soon</h2>
          <p className="spx-coming-soon__lede">
            We don&rsquo;t have a live {sportMeta.label} data connection yet, so we&rsquo;re not going to show you a page full of empty panels pretending we do.
          </p>
          <p className="spx-coming-soon__body">{copy.body}</p>
          <div className="spx-coming-soon__grid">
            <div className="spx-coming-soon__item"><span>Schedule &amp; Results</span><i>Not connected yet</i></div>
            <div className="spx-coming-soon__item"><span>Standings</span><i>Not connected yet</i></div>
            <div className="spx-coming-soon__item"><span>Follow {copy.followNoun}</span><i>Not connected yet</i></div>
            <div className="spx-coming-soon__item"><span>Magical Picks</span><i>Not connected yet</i></div>
          </div>
        </section>
      </div>
    );
  }

  const connected = ApiSportsProvider.isConfigured(sport);
  // resolveDefaultLeagueId is a straight passthrough of SPORT_CONFIG's static
  // id for every sport except ncaabaseball, which has no fixed id — it asks
  // API-Sports' own /leagues catalog for a real NCAA/college match instead of
  // guessing (see that function's doc comment). `league` stays "" — never a
  // guessed id — until a real key resolves one; every panel below already
  // reads `hasLeague` and shows an honest "not available yet" state for that,
  // the same gate MMA/F1 rely on for their own permanently-empty default.
  const league = await resolveDefaultLeagueId(sport);
  const hasLeague = Boolean(league);

  const [myTeams, searchResults, logos, firstPreseasonGame, firstRegularSeasonGame, firstPostseasonGame, nbaHeroState] = await Promise.all([
    getMyTeams(account.id),
    q?.trim() ? searchTeamsForSport(sport, q) : Promise.resolve([]),
    getLeagueLogos(),
    getFirstPreseasonGame(sport, league || undefined),
    getFirstRegularSeasonGame(sport, league || undefined),
    getFirstPostseasonGame(sport, league || undefined),
    sport === "nba" ? getNbaHeroState() : Promise.resolve(null),
  ]);
  const leagueLogo = FOOTBALL_LOGO_BADGE[sport] ?? (SPORT_VISUALS[sport].kind === "league-logo" ? logos[sport] : undefined);
  const myTeamsForSport = myTeams.filter((t) => t.follow.sport === sport);

  // Real rosters for followed teams — the honest substitute where a real
  // Injuries panel (below) has nothing for this team yet. API-Sports first;
  // SportsDataIO second (any sport with a SportsDataIO product connected —
  // see sdioLeagueFor) when API-Sports has nothing — gated to owner/admin
  // preview or sdioCommercialMode, matching every other SportsDataIO-driven
  // member surface, since player-team association is that provider's
  // documented trial-data weak spot (see sdioCommercialMode's doc comment).
  const isOwner = await isOwnerAccount(account.id);
  const allowSdio = Boolean(sdioLeagueFor(sport)) && sdioConfigured() && (sdioCommercialMode() || isOwner);
  const allowSdioRoster = allowSdio;
  // A followed team's roster/injuries are real content, not core content —
  // the page (hero, games, standings, teams, Picks, Fantasy, bracket,
  // schedules) must render even if one team's fetch throws for a reason no
  // provider-level guard anticipated. resolveFollowedTeamRosters/
  // resolveFollowedTeamInjuries (service.ts) give every team-sport page
  // this same per-team failure isolation from one shared place, rather
  // than each page hand-rolling its own Promise.all.
  const followedTeamRefs = myTeamsForSport.map((t) => ({ followId: t.follow.id, teamExternalId: t.follow.teamExternalId, teamName: t.follow.teamName ?? null }));
  const rosters = myTeamsForSport.length
    ? await resolveFollowedTeamRosters(sport, followedTeamRefs, allowSdioRoster)
    : new Map<string, Awaited<ReturnType<typeof getTeamRoster>>>();

  // Real injury reports for followed teams — same SportsDataIO source/gate
  // as the roster fallback above (owner/admin preview until commercial
  // mode; see allowSdio's doc comment). Same per-team failure isolation.
  const injuries = myTeamsForSport.length && allowSdio
    ? await resolveFollowedTeamInjuries(sport, followedTeamRefs)
    : new Map<string, Awaited<ReturnType<typeof getTeamInjuries>>>();

  // Bridges each roster card to a real Player Profile — rosters here are
  // usually API-Sports-sourced (a different id space than the SportsDataIO
  // profile page needs), so each player is resolved to their real
  // SportsDataIO playerId by exact name match, same discipline as every
  // other cross-provider name match in this codebase. A player who doesn't
  // resolve confidently just isn't clickable — never a broken/guessed link.
  const sdioLeague = sdioLeagueFor(sport);
  // ONE bulk directory fetch for the whole roster, never one call per
  // player — player-profile click-through is optional enrichment and must
  // never be able to take the whole page down if the provider hiccups, so
  // this can't throw (empty Map on failure) and isn't a Promise.all of N
  // identical directory lookups racing each other.
  const profileLinks = allowSdio && sdioLeague
    ? resolveProfileLinksFromDirectory(Array.from(rosters.values()).flatMap((r) => r.players), await getPlayerIdDirectoryByName(sdioLeague).catch(() => new Map<string, string>()))
    : new Map<string, string | null>();

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

  // ncaabaseball has no static SPORT_CONFIG default league (see
  // resolveDefaultLeagueId's doc comment), so its games calls need the
  // resolved id passed explicitly — every other sport keeps passing
  // undefined here exactly as before (same cache key, same behavior),
  // since their `league` already equals SPORT_CONFIG's own static default.
  const gamesLeague = sport === "ncaabaseball" ? (league || undefined) : undefined;
  let games: Awaited<ReturnType<typeof getGamesByDate>>["games"] = [];
  let gamesLabel = "Today's Games";
  let planRestricted: string | undefined;
  if (connected) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const today = await getGamesByDate(sport, todayISO, gamesLeague);
    planRestricted = today.planRestricted;
    games = today.games;
    if (!games.length && !planRestricted) {
      for (let daysOut = 1; daysOut <= 7 && !games.length; daysOut++) {
        const dateISO = new Date(Date.now() + daysOut * 86_400_000).toISOString().slice(0, 10);
        const next = await getGamesByDate(sport, dateISO, gamesLeague);
        if (next.games.length) {
          games = next.games;
          gamesLabel = `Next Games — ${new Date(dateISO).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;
        }
      }
    }
  }

  // Real phase, from the same real dated openers used elsewhere on this
  // page (never a separately-guessed "today's season") — "preseason" here
  // covers both "before this season's preseason starts" and "we don't have
  // this season's schedule yet." Computed BEFORE the standings fetch below
  // so it can drive both: (a) whether an unresolved VERIFIED_REFERENCE
  // team's real record is corroborated 0-0 (season genuinely hasn't
  // started) or an honest gap ("—", a mid-season provider restriction), and
  // (b) for every other sport, whether an empty current-season result
  // should retry against the last real completed season rather than
  // showing a blank panel — see getStandingsWithOffSeasonFallback.
  const standingsPhase = determineSeasonPhase({
    now: Date.now(),
    preseasonGameStartsAt: firstPreseasonGame?.startsAt,
    regularGameStartsAt: firstRegularSeasonGame?.startsAt,
    postseasonGameStartsAt: firstPostseasonGame?.startsAt,
  });
  // NBA/NFL (hasVerifiedReference) keep the existing plain getStandings +
  // getVerifiedStandingsFallback 0-0-zero-fill pair, unchanged. Every other
  // sport uses the off-season fallback instead — real prior-season
  // standings when the current season has nothing posted yet, rather than
  // a blank panel (this is the fix for NHL/WNBA/etc. reading as empty
  // during their own off-seasons — see getStandingsWithOffSeasonFallback's
  // doc comment).
  const standingsResult = connected && hasLeague
    ? hasVerifiedReference(sport)
      ? await getStandings(sport, league)
      : await getStandingsWithOffSeasonFallback(sport, league, standingsPhase === "preseason")
    : { standings: [] };
  const standingsRestricted = standingsResult.planRestricted;
  // A sport with a verified, real conference/division reference (see
  // team-directory.ts) never shows a bare "No standings data returned" —
  // every real team appears, with its live record where the provider has
  // one and either a corroborated 0-0 (season confirmed not started yet)
  // or an honest "—" otherwise. Skipped when the plan itself is
  // restricted, since that's a different, already-honest message.
  const standings = !standingsRestricted && hasVerifiedReference(sport)
    ? await getVerifiedStandingsFallback(sport, standingsResult.standings ?? [], standingsPhase === "preseason").catch(() => standingsResult.standings ?? [])
    : standingsResult.standings ?? [];
  const standingsGroups = normalizeStandingsBySport(sport, standings);
  // Playoff Picture — real, current-standings projections via the
  // PostseasonRuleEngine (postseason.ts). Shown only during the real
  // regular season and never presented as an official bracket — see each
  // sport's own service function for its disclosed limitations (no
  // division tiebreaker data for any of them yet). Every sport's own real
  // seed/tag shape is normalized into one common row shape here so the
  // render below stays one piece of markup, not five near-duplicates.
  // NFL, NBA, WNBA, MLB, and NHL are deliberately excluded from this
  // list-based "Playoff Picture" panel — each is superseded there by its own
  // real Playoff Bracket page (see the spx-bracket-cta entry-point card
  // below and PlayoffBracket.tsx) so a member never sees both the old list
  // and the new bracket for the same sport. Any future sport keeps this
  // list treatment unchanged until its own bracket is built.
  let playoffPictureGroups: { label: string; rows: { teamId: string; teamName: string; teamLogoUrl?: string; seed?: number; tag?: string; clinched: boolean }[] }[] = [];
  if (standingsPhase === "regular" && standings.length > 0 && !BRACKET_READY_SPORTS.has(sport)) {
    if (sport === "mlb") {
      const [al, nl] = await Promise.all([getMlbPlayoffPicture("AL"), getMlbPlayoffPicture("NL")]);
      playoffPictureGroups = [al && { label: "AL", seeds: al }, nl && { label: "NL", seeds: nl }]
        .filter((g): g is { label: string; seeds: NonNullable<typeof al> } => !!g)
        .map((g) => ({ label: g.label, rows: g.seeds.map((s) => ({ teamId: s.teamId, teamName: s.teamName, teamLogoUrl: s.teamLogoUrl, seed: s.seed, tag: s.isDivisionWinner ? "Division Leader" : undefined, clinched: s.clinched })) }));
    } else if (sport === "nhl") {
      const [east, west] = await Promise.all([getNhlPlayoffPicture("Eastern"), getNhlPlayoffPicture("Western")]);
      playoffPictureGroups = [east && { label: "Eastern", seeds: east }, west && { label: "Western", seeds: west }]
        .filter((g): g is { label: string; seeds: NonNullable<typeof east> } => !!g)
        .map((g) => ({ label: g.label, rows: g.seeds.map((s) => ({ teamId: s.teamId, teamName: s.teamName, teamLogoUrl: s.teamLogoUrl, seed: s.seed, tag: s.isTopThreeInDivision ? "Top 3 in Division" : undefined, clinched: s.clinched })) }));
    } else if (sport === "nba") {
      const [east, west] = await Promise.all([getNbaPlayoffPicture("Eastern"), getNbaPlayoffPicture("Western")]);
      const tagFor = (status: string) => status === "DIRECT_BERTH" ? undefined : status === "PLAY_IN" ? "Play-In" : "Outside the Field";
      playoffPictureGroups = [east && { label: "Eastern", seeds: east }, west && { label: "Western", seeds: west }]
        .filter((g): g is { label: string; seeds: NonNullable<typeof east> } => !!g)
        .map((g) => ({ label: g.label, rows: g.seeds.filter((s) => s.status !== "OUTSIDE").map((s) => ({ teamId: s.teamId, teamName: s.teamName, teamLogoUrl: s.teamLogoUrl, seed: s.seed, tag: tagFor(s.status), clinched: s.clinched })) }));
    } else if (sport === "wnba") {
      const field = await getWnbaPlayoffPicture();
      if (field) playoffPictureGroups = [{ label: "", rows: field.filter((f) => f.inField).map((f) => ({ teamId: f.teamId, teamName: f.teamName, teamLogoUrl: f.teamLogoUrl, clinched: f.clinched })) }];
    }
  }

  // Magical Picks + Fantasy Football — first-class discoverability, not
  // hidden utility links (members shouldn't have to know these routes
  // exist). A real, pickable matchup when one is available: live > soonest
  // scheduled today, same priority the main Sports landing page's own
  // featured-matchup panel already uses (getGamesWithVoteContext) — never a
  // decorative placeholder. Magical Picks gets a first-class preview on
  // every MATCHUP_SPORTS sport's own page (not just NFL/WNBA); Fantasy
  // Football stays NFL-only, per explicit product scope — see
  // PicksAndFantasyPanels.
  let picksFeaturedMatchup: Awaited<ReturnType<typeof getGamesWithVoteContext>>["contexts"][number] | null = null;
  let myFantasyLeagues: Awaited<ReturnType<typeof getMyFantasyLeagues>> = [];
  if (MATCHUP_SPORTS.includes(sport)) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const [{ contexts }, leagues] = await Promise.all([
      ApiSportsProvider.isConfigured(sport) ? getGamesWithVoteContext(sport, todayISO, account.id, 20) : Promise.resolve({ contexts: [] }),
      sport === "nfl" ? getMyFantasyLeagues(account.id) : Promise.resolve([]),
    ]);
    picksFeaturedMatchup = contexts.find((c) => c.game.status === "live")
      ?? contexts.filter((c) => c.game.status === "scheduled").sort((a, b) => +a.game.startsAt - +b.game.startsAt)[0]
      ?? null;
    myFantasyLeagues = leagues;
  }
  // No provider returned a season string in the verified-fallback case
  // (both tiers came back empty) — fall back to the real year off whichever
  // real dated opener we already have (never a guess), labeled for the
  // real phase we're actually in, rather than showing no heading at all.
  const fallbackSeasonYear = firstRegularSeasonGame ? new Date(firstRegularSeasonGame.startsAt).getUTCFullYear() : firstPreseasonGame ? new Date(firstPreseasonGame.startsAt).getUTCFullYear() : null;
  const standingsSeasonLabel = formatSeasonLabel(standingsResult.season, standingsPhase)
    ?? (fallbackSeasonYear && standings.length > 0 ? `${fallbackSeasonYear} ${standingsPhase === "preseason" ? "Preseason" : standingsPhase === "postseason" ? "Postseason" : "Regular Season"} Standings` : null);

  // All Teams directory — every team in the league, with a live-resolved
  // logo. NBA/NFL have a verified static conference/division reference (see
  // team-directory.ts). Every other sport now sources this from the real,
  // live team catalog (getLeagueTeamCatalog — API-Sports' own /teams
  // endpoint) as its PRIMARY source, independent of Standings: a standings
  // failure (provider hiccup, plan restriction, off-season with no win-loss
  // data yet) must never make the All Teams panel disappear when the
  // provider's own team catalog is perfectly fine. Standings' own
  // conference/division grouping is applied only as presentation labeling
  // for teams it already covers (buildTeamDirectoryFromCatalog) — a team
  // with no matching standings row still appears, under an honest
  // "Standings unavailable" bucket rather than vanishing. Falls back to the
  // old standings-derived grouping only when the live catalog itself is
  // empty (unconfigured, league not resolved yet, or the provider genuinely
  // has no teams for this league) — never a blank directory when standings
  // happens to have something the catalog call couldn't reach.
  const teamCatalog = !hasVerifiedReference(sport) && hasLeague ? await getLeagueTeamCatalog(sport, league).catch(() => []) : [];
  const verifiedDirectory = hasVerifiedReference(sport)
    ? await getTeamDirectory(sport, standingsGroups, isOwner).catch(() => ({ groups: [], misses: [], liveCatalog: [] }))
    : null;
  // Owner-only: real static team names that had no match in the live
  // catalog on this render — the same data resolveDivisions already
  // computes for its console.warn, now visible on the page itself instead
  // of requiring server log access to see which teams are showing blank
  // logos/ids and why.
  const directoryMisses = isOwner ? (verifiedDirectory?.misses ?? []) : [];
  // TEMPORARY DIAGNOSTIC — the real live API-Sports catalog rows (id +
  // exact provider name), Owner-only, shown only alongside real misses so
  // the Owner can read off the correct provider identity herself rather
  // than anyone guessing an alias. Remove this and liveCatalog together
  // once VERIFIED_TEAM_ALIASES is filled in and every team resolves — see
  // team-directory.ts's own doc comments on both.
  const directoryLiveCatalog = isOwner ? (verifiedDirectory?.liveCatalog ?? []) : [];
  const directoryGroups: DirectoryGroup[] = verifiedDirectory
    ? verifiedDirectory.groups
    : teamCatalog.length
      ? buildTeamDirectoryFromCatalog(sportMeta.label, teamCatalog, standingsGroups, standings.length > 0 && !standingsRestricted)
      : standingsGroups.map((g) => ({
          label: g.label || sportMeta.label,
          divisions: g.divisions.map((d) => ({
            label: d.label,
            teams: d.rows.map((r) => ({ id: r.team.id, name: r.team.name, logoUrl: r.team.logoUrl })),
          })),
        }));

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
        {/* "All Sports" is a fixed destination, not a contextual Back
            control — always the Sports hub, never history-aware. */}
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

        {firstPreseasonGame && (
          <p className="spx-sport-header__preseason">
            Preseason begins {new Date(firstPreseasonGame.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" "}— {firstPreseasonGame.awayTeam.name} @ {firstPreseasonGame.homeTeam.name}
          </p>
        )}

        {firstPostseasonGame && (
          <p className="spx-sport-header__preseason">
            Postseason begins {new Date(firstPostseasonGame.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" "}— {firstPostseasonGame.awayTeam.name} @ {firstPostseasonGame.homeTeam.name}
          </p>
        )}
      </header>

      <div className="spx-panel" style={{ marginBottom: "var(--section-gap-standard)" }}>
        <div className="spx-panel__head"><h2>{gamesLabel}</h2></div>
        {!connected ? (
          <div className="disc-pending"><b>Live {sportMeta.label} data is coming soon</b></div>
        ) : !hasLeague ? (
          <div className="disc-pending"><b>{sportMeta.label} schedules aren&rsquo;t available yet</b></div>
        ) : planRestricted ? (
          <div className="disc-pending"><b>Live {sportMeta.label} schedule data isn&rsquo;t available right now</b>Check back soon.</div>
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

      {sport === "nfl" && (
        <div className="spx-panels spx-panels--picks-fantasy">
          <MagicalPicksPanel matchup={picksFeaturedMatchup} previewSportLabel="NFL" sport={sport} pageSport={sport} />
          <FantasyFootballPanel leagues={myFantasyLeagues} />
        </div>
      )}

      {/* Every other MATCHUP_SPORTS sport gets Magical Picks only — no
          Fantasy Football, which stays NFL-only (see PicksAndFantasyPanels'
          doc comment). Standalone (not the two-column picks/fantasy grid)
          since there's no second panel to pair it with here. F1 and MMA
          are deliberately excluded (not in MATCHUP_SPORTS — a race/fight
          card doesn't map onto a two-side "who you got" pick). */}
      {sport !== "nfl" && MATCHUP_SPORTS.includes(sport) && (
        <div className="spx-standard-solo" style={{ marginBottom: "var(--section-gap-standard)" }}>
          <MagicalPicksPanel matchup={picksFeaturedMatchup} previewSportLabel={sportMeta.label} sport={sport} pageSport={sport} />
        </div>
      )}

      {/* Playoff Bracket entry point — the 5 sports this bracket is fully
          wired for today (see BRACKET_READY_SPORTS above and
          [sport]/bracket/page.tsx's own copy of the same set). Visible from
          mid-season onward, not just once the postseason starts — a member
          should be able to follow the projected field the moment real
          standings exist, same as the old list-based Playoff Picture panel
          this supersedes for each of these sports (see the
          playoffPictureGroups computation above). Gated on `connected &&
          hasLeague` only (not on standings/playoffPictureGroups) since the
          bracket page itself already renders its own honest "not available
          yet" state when there's nothing to show. */}
      {BRACKET_READY_SPORTS.has(sport) && connected && hasLeague && (
        <Link href={`/dashboard/discovery/sports/${sport}/bracket`} className="spx-bracket-cta">
          <span className="spx-bracket-cta__icon" aria-hidden="true">🏆</span>
          <span className="spx-bracket-cta__copy">
            <b>{standingsPhase === "postseason" ? "Playoff Bracket" : "Projected Playoff Bracket"}</b>
            <span>
              {standingsPhase === "postseason"
                ? `Follow the real ${sportMeta.label} playoff bracket as results come in.`
                : BRACKET_CTA_PROJECTED_COPY[sport] ?? "See the full projected field if the playoffs started today."}
            </span>
          </span>
          <span className="spx-bracket-cta__go">View Bracket →</span>
        </Link>
      )}

      {playoffPictureGroups.length > 0 && (
        <div className="spx-panel spx-playoff-picture">
          <div className="spx-panel__head"><h2>Playoff Picture</h2></div>
          <p className="spx-panel__empty" style={{ marginTop: 0 }}>IF THE PLAYOFFS STARTED TODAY — projected from current standings, not an official bracket.</p>
          <div className="spx-playoff-picture__confs">
            {playoffPictureGroups.map((g) => (
              <div key={g.label || "field"} className="spx-playoff-picture__conf">
                {g.label && <h3>{g.label}</h3>}
                {g.rows.map((s) => (
                  <div key={s.teamId} className="spx-playoff-picture__row">
                    {s.seed != null && <span className="spx-playoff-picture__seed">{s.seed}</span>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.teamLogoUrl ? <img src={s.teamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                    <b>{s.teamName}</b>
                    {s.tag && <span className="spx-playoff-picture__tag">{s.tag}</span>}
                    {s.clinched && <span className="spx-playoff-picture__tag spx-playoff-picture__tag--clinched">Clinched</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="spx-panels" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="spx-panel" id="standings">
          <div className="spx-panel__head"><h2>Standings</h2></div>
          {standingsSeasonLabel && standings.length > 0 && <p className="spx-standings__season">{standingsSeasonLabel}</p>}
          {!connected || !hasLeague ? (
            <p className="spx-panel__empty">Standings aren&rsquo;t available for {sportMeta.label} yet.</p>
          ) : standingsRestricted ? (
            <p className="spx-panel__empty">Standings aren&rsquo;t available for {sportMeta.label} right now.</p>
          ) : standings.length === 0 ? (
            <p className="spx-panel__empty">
              Standings aren&rsquo;t available for the {standingsResult.season ? `${standingsResult.season} ` : ""}{sportMeta.label} season yet.
            </p>
          ) : (
            <details className="spx-standings">
              <summary>View Standings ({standings.length} teams)</summary>
              <div className="spx-panel__body">
                {standingsGroups.map((g) => (
                  <div key={g.label || "flat"} className="spx-standings__group">
                    {g.label && <h3 className="spx-standings__group-label">{formatGroupLabel(g.label)}</h3>}
                    {g.divisions.map((d) => {
                      // A points-based table (soccer's real 3/1/0 win/draw/
                      // loss points, per the provider) reads a Pts column
                      // instead of the win%-ranked-sports' Win% column —
                      // real data the provider returns, never a computed
                      // stand-in for a formula that differs by sport.
                      const hasPoints = d.rows.some((r) => r.points != null);
                      return (
                      <div key={d.label || "flat"} className="spx-standings__division">
                        {d.label && <h4 className="spx-standings__division-label">{formatGroupLabel(d.label)}</h4>}
                        <div className="spx-standings__cols">
                          <span>Team</span><span>{hasPoints ? "W-D-L" : "W-L"}</span><span>{hasPoints ? "Pts" : "Win%"}</span>{d.rows.some((r) => r.gb != null) && <span>GB</span>}
                        </div>
                        {d.rows.map((s) => (
                          <StandingsTeamRow key={s.team.id} sport={sport} team={{ id: s.team.id, name: s.team.name, logoUrl: s.team.logoUrl }}>
                            <span style={{ color: "var(--gold)", fontSize: ".72rem", fontWeight: 800, width: 18 }}>{s.displayRank}</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {s.team.logoUrl ? <img src={s.team.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                            <b style={{ flex: 1, textAlign: "left" }}>{s.team.name}</b>
                            <span style={{ color: "#9c8f76", fontSize: ".72rem", width: 48, textAlign: "right" }}>{s.summary ?? (s.wins == null && s.losses == null ? "—" : `${s.wins ?? 0}-${s.losses ?? 0}${s.ties ? `-${s.ties}` : ""}`)}</span>
                            <span style={{ color: "#9c8f76", fontSize: ".72rem", width: 40, textAlign: "right" }}>{hasPoints ? (s.points ?? "—") : s.wins == null && s.losses == null ? "—" : `${(((s.wins ?? 0) / Math.max((s.wins ?? 0) + (s.losses ?? 0), 1)) * 100).toFixed(1)}`}</span>
                            {d.rows.some((r) => r.gb != null) && <span style={{ color: "#9c8f76", fontSize: ".72rem", width: 32, textAlign: "right" }}>{s.gb == null ? "—" : s.gb === 0 ? "-" : s.gb}</span>}
                          </StandingsTeamRow>
                        ))}
                      </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="spx-panel">
          <div className="spx-panel__head"><h2>My {sportMeta.label} Teams</h2></div>
          <div className="spx-panel__body">
            {myTeamsForSport.length === 0 ? (
              <p className="spx-panel__empty">You haven&rsquo;t followed a {sportMeta.label} team yet.</p>
            ) : myTeamsForSport.map(({ follow }) => {
              const rosterResult = rosters.get(follow.id);
              const roster = rosterResult?.players ?? [];
              const teamInjuries = injuries.get(follow.id) ?? [];
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
                  {roster.length > 0 ? (
                    <details className="spx-roster">
                      <summary>Roster ({roster.length})</summary>
                      <div className="spx-roster__grid">
                        {roster.map((p) => {
                          const content = (
                            <>
                              <PlayerAvatar photoUrl={p.photoUrl} number={p.number} size="md" />
                              <span className="spx-roster__name">{p.name}</span>
                              <span className="spx-roster__meta">{p.number != null ? `#${p.number}` : ""}{p.number != null && p.position ? " · " : ""}{p.position ?? ""}</span>
                            </>
                          );
                          const linkedId = profileLinks.get(p.id);
                          return linkedId && sdioLeague ? (
                            <Link href={`/dashboard/discovery/sports/player/${sdioLeague}/${linkedId}`} className="spx-roster__player" key={p.id}>{content}</Link>
                          ) : (
                            <div className="spx-roster__player" key={p.id}>{content}</div>
                          );
                        })}
                      </div>
                    </details>
                  ) : (
                    <p className="spx-panel__empty" style={{ fontSize: ".72rem", margin: ".4rem 0 0" }}>
                      {rosterResult?.status === "plan_restricted"
                        ? "Roster data is unavailable from our current sports-data plan."
                        : `Roster not posted yet for ${follow.teamName}.`}
                    </p>
                  )}
                  {teamInjuries.length > 0 && (
                    <details className="spx-roster">
                      <summary>Injury Report ({teamInjuries.length})</summary>
                      <div className="spx-roster__grid">
                        {teamInjuries.map((inj) => (
                          <div className="spx-roster__player" key={inj.playerId}>
                            <JerseyAvatar />
                            <span className="spx-roster__name">{inj.playerName}</span>
                            <span className="spx-roster__meta">{inj.status ?? "Status unknown"}{inj.bodyPart ? ` · ${inj.bodyPart}` : ""}</span>
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

      {directoryGroups.length > 0 && (
        <div className="spx-panel" style={{ marginTop: "1.4rem" }}>
          <div className="spx-panel__head"><h2>All {sportMeta.label} Teams</h2></div>
          {directoryMisses.length > 0 && (
            <>
              <p className="spx-panel__owner-diagnostic">
                Owner diagnostic — {directoryMisses.length} team{directoryMisses.length === 1 ? "" : "s"} didn&rsquo;t match the live provider catalog (blank logo/record above): {directoryMisses.join(", ")}.
              </p>
              {directoryLiveCatalog.length > 0 && (
                <details className="spx-panel__owner-diagnostic">
                  <summary>Owner diagnostic — real live provider catalog ({directoryLiveCatalog.length} teams)</summary>
                  <p style={{ margin: ".5rem 0" }}>Compare against the unmatched names above — no automatic pairing is attempted.</p>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                    {directoryLiveCatalog.map((t) => (
                      <li key={t.id}>{t.name} <span style={{ opacity: 0.65 }}>(id: {t.id})</span></li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
          <TeamDirectory sport={sport} groups={directoryGroups} />
        </div>
      )}
    </div>
  );
}
