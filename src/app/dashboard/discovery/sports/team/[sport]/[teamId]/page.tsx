import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { SPORT_CATALOG, resolveDefaultLeagueId, getStandings, getTeamSchedule, getTeamInjuries, getTeamFollow, sdioLeagueFor, type TeamScheduleGame } from "@/lib/discovery/sports/service";
import { getTeamById, hasVerifiedReference, getVerifiedStandingsFallback } from "@/lib/discovery/sports/team-directory";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import type { SportSlug } from "@/lib/discovery/providers/sports";
import { TeamRosterPanel } from "../../../TeamRosterPanel";
import { followTeamAction, unfollowAction } from "../../../actions";
import "../../../../discovery.css";
import "../../../sports-home.css";

export const dynamic = "force-dynamic";

// Same small display-casing convention [sport]/page.tsx's own Standings
// panel uses for a provider's real group/division label (e.g. a bare
// "east" reads as "Eastern Conference") — duplicated here rather than
// exported since it's a tiny, page-local presentation helper.
const GROUP_LABEL_OVERRIDES: Record<string, string> = { east: "Eastern Conference", west: "Western Conference" };
const KNOWN_ABBR = new Set(["afc", "nfc", "al", "nl", "ncaa"]);
function formatGroupLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (GROUP_LABEL_OVERRIDES[key]) return GROUP_LABEL_OVERRIDES[key];
  return raw
    .split(/\s+/)
    .map((word) => (KNOWN_ABBR.has(word.toLowerCase()) ? word.toUpperCase() : word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ sport: string; teamId: string }> }): Promise<Metadata> {
  const { sport } = await params;
  const meta = SPORT_CATALOG.find((s) => s.slug === sport);
  return { title: meta ? `Team — ${meta.label} — Magical Moments Sports` : "Team", robots: { index: false } };
}

function TeamGameRow({ game }: { game: TeamScheduleGame }) {
  const content = (
    <>
      <div className="spx-live-row__meta">
        {game.status === "live"
          ? (<><i />LIVE{game.period ? ` · ${game.period}` : ""}</>)
          : game.status === "final"
            ? "FINAL"
            : new Date(game.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </div>
      <div className="spx-live-row__score">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {game.awayTeam.logoUrl ? <img src={game.awayTeam.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
        <b>{game.awayScore ?? "—"}</b><span>VS</span><b>{game.homeScore ?? "—"}</b>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {game.homeTeam.logoUrl ? <img src={game.homeTeam.logoUrl} alt="" /> : <div className="spx-team-row__ph" />}
      </div>
      <div className="spx-live-row__names"><span>{game.awayTeam.name}</span><span>{game.homeTeam.name}</span></div>
    </>
  );
  return game.localId ? (
    <Link href={`/dashboard/discovery/sports/game/${game.localId}`} className="spx-live-row">{content}</Link>
  ) : (
    <div className="spx-live-row">{content}</div>
  );
}

export default async function TeamDetailPage({ params }: { params: Promise<{ sport: string; teamId: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { sport: sportParam, teamId } = await params;
  const sportMeta = SPORT_CATALOG.find((s) => s.slug === sportParam);
  if (!sportMeta) notFound();
  const sport = sportParam as SportSlug;
  // F1/MMA have no team concept (drivers/fighters, not teams — see
  // [sport]/page.tsx's Coming Soon state) — no real team can ever resolve
  // for them, so this route simply doesn't exist for these two sports.
  if (sport === "mma" || sport === "f1") notFound();

  const team = await getTeamById(sport, teamId);
  if (!team) notFound();

  const league = await resolveDefaultLeagueId(sport);

  const [standingsResult, schedule, follow, isOwner] = await Promise.all([
    league ? getStandings(sport, league) : Promise.resolve({ standings: [] as Awaited<ReturnType<typeof getStandings>>["standings"] }),
    getTeamSchedule(sport, team.id, league || undefined),
    getTeamFollow(account.id, sport, team.id),
    isOwnerAccount(account.id),
  ]);

  // NBA/NFL's verified conference/division reference fills in this team's
  // real group/division even when live standings hasn't posted a record for
  // it yet (allowZeroFill: false — an honest "—", never a fabricated 0-0;
  // that projection belongs to the Standings panel's own season-phase
  // check, not this simpler single-team lookup).
  const standingsRows = hasVerifiedReference(sport)
    ? await getVerifiedStandingsFallback(sport, standingsResult.standings ?? [], false).catch(() => standingsResult.standings ?? [])
    : standingsResult.standings ?? [];
  const teamStanding = standingsRows.find((s) => s.team.id === team.id);

  // Injuries: SportsDataIO only, for the sports it actually covers
  // (sdioLeagueFor), gated the same owner-preview/commercial-mode rule
  // every other SportsDataIO-driven member surface uses. Omitted entirely
  // (not an empty panel) for every API-Sports-only sport.
  const allowSdio = Boolean(sdioLeagueFor(sport)) && sdioConfigured() && (sdioCommercialMode() || isOwner);
  const injuries = allowSdio ? await getTeamInjuries(sport, team.name) : [];

  const hasPoints = teamStanding?.points != null;
  const recordLabel = teamStanding
    ? (teamStanding.summary ?? (teamStanding.wins == null && teamStanding.losses == null
        ? null
        : `${teamStanding.wins ?? 0}-${teamStanding.losses ?? 0}${teamStanding.ties ? `-${teamStanding.ties}` : ""}`))
    : null;

  return (
    <div className="spx spx-profile spx-team-detail">
      <Link href={`/dashboard/discovery/sports/${sport}`} className="spx-profile__back">← Back to {sportMeta.label}</Link>

      <section className="spx-profile__hero spx-team-detail__hero">
        <div className="spx-team-detail__logo">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoUrl} alt="" />
          ) : (
            <div className="spx-team-row__ph" style={{ width: "100%", height: "100%" }} />
          )}
        </div>
        <div className="spx-profile__identity">
          <h1>{team.name}</h1>
          <div className="spx-profile__chips">
            <span className="spx-profile__chip spx-profile__chip--team">{sportMeta.label}</span>
            {teamStanding?.group && <span className="spx-profile__chip">{formatGroupLabel(teamStanding.group)}</span>}
            {teamStanding?.division && <span className="spx-profile__chip">{formatGroupLabel(teamStanding.division)}</span>}
          </div>
          <form action={follow ? unfollowAction : followTeamAction} className="spx-team-detail__follow">
            {follow ? (
              <input type="hidden" name="followId" value={follow.id} />
            ) : (
              <>
                <input type="hidden" name="sport" value={sport} />
                <input type="hidden" name="league" value={league} />
                <input type="hidden" name="teamExternalId" value={team.id} />
                <input type="hidden" name="teamName" value={team.name} />
                {team.logoUrl && <input type="hidden" name="teamLogoUrl" value={team.logoUrl} />}
              </>
            )}
            <button type="submit" className="spx-panel__cta" style={{ marginTop: 0, display: "inline-block", padding: ".55rem 1.4rem" }}>
              {follow ? "Unfollow" : "Follow This Team"}
            </button>
          </form>
        </div>
      </section>

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Standings</h2></div>
        {teamStanding ? (
          <div className="spx-team-detail__standing">
            {teamStanding.rank != null && <span className="spx-team-detail__standing-rank">#{teamStanding.rank}</span>}
            <span>{recordLabel ?? "Record unavailable"}</span>
            {hasPoints && <span>{teamStanding.points} pts</span>}
          </div>
        ) : (
          <p className="spx-panel__empty">Standings aren&rsquo;t available for {team.name} right now.</p>
        )}
      </section>

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Upcoming Games</h2></div>
        {schedule.upcoming.length > 0 ? (
          <div className="spx-panels" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", marginBottom: 0 }}>
            {schedule.upcoming.map((g) => <TeamGameRow key={g.externalId} game={g} />)}
          </div>
        ) : (
          <p className="spx-panel__empty">No upcoming games scheduled for {team.name} yet.</p>
        )}
      </section>

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Recent Results</h2></div>
        {schedule.recent.length > 0 ? (
          <div className="spx-panels" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", marginBottom: 0 }}>
            {schedule.recent.map((g) => <TeamGameRow key={g.externalId} game={g} />)}
          </div>
        ) : (
          <p className="spx-panel__empty">No completed games on record for {team.name} yet.</p>
        )}
      </section>

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Roster</h2></div>
        <TeamRosterPanel sport={sport} team={{ id: team.id, name: team.name, logoUrl: team.logoUrl }} breadcrumb="" hideHead />
      </section>

      {allowSdio && (
        <section className="spx-panel spx-profile__section">
          <div className="spx-panel__head"><h2>Injury Report</h2></div>
          {injuries.length > 0 ? (
            <div className="spx-roster__grid">
              {injuries.map((inj) => (
                <div className="spx-roster__player" key={inj.playerId}>
                  <span className="spx-roster__name">{inj.playerName}</span>
                  <span className="spx-roster__meta">{inj.status ?? "Status unknown"}{inj.bodyPart ? ` · ${inj.bodyPart}` : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="spx-panel__empty">No current injuries on record for {team.name}.</p>
          )}
        </section>
      )}
    </div>
  );
}
