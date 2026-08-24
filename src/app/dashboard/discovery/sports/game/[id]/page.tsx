import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../../SmartBackLink";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getMatchup, getLiveGameState, getGameTeamRecords, getLiveScoresAcrossSports, SPORT_CATALOG } from "@/lib/discovery/sports/service";
import { getGroupPicksForGame } from "@/lib/discovery/sports/pickem-groups-service";
import { getMyFantasyPlayersInGame } from "@/lib/discovery/sports/fantasy-service";
import { MATCHUP_SPORTS, type SportSlug } from "@/lib/discovery/providers/sports";
import LiveGameCenter, { type LiveGameInitial } from "./LiveGameCenter";
import LiveScoresPanel, { type LiveScoreGame } from "../../LiveScoresPanel";
import "../../../discovery.css";
import "../../sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Game Center — Magical Discovery", robots: { index: false } };

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { id } = await params;
  const matchup = await getMatchup(id, account.id);
  if (!matchup) notFound();

  const { game, tally, myPick, myPickCorrect } = matchup;
  const sport = game.sport as SportSlug;
  const sportLabel = SPORT_CATALOG.find((s) => s.slug === sport)?.label ?? sport;

  const isMatchupSport = MATCHUP_SPORTS.includes(sport);
  // Same August-boundary NFL season convention used elsewhere in this
  // codebase (team-identity.ts's seasonYearFor, service.ts's sdioSeasonYear).
  const nflSeasonYear = game.startsAt.getUTCMonth() >= 7 ? game.startsAt.getUTCFullYear() : game.startsAt.getUTCFullYear() - 1;
  const [live, records, groupPicks, myFantasyPlayers, otherLiveGames] = await Promise.all([
    getLiveGameState(id),
    getGameTeamRecords(sport, game.league, game.homeTeamName, game.awayTeamName).catch(() => ({} as { home?: string; away?: string })),
    isMatchupSport ? getGroupPicksForGame(account.id, id).catch(() => []) : Promise.resolve([]),
    sport === "nfl" ? getMyFantasyPlayersInGame(account.id, game.homeTeamName, game.awayTeamName, nflSeasonYear).catch(() => []) : Promise.resolve([]),
    // Every other live game, across every sport — a member watching one
    // game shouldn't have to back out to the Schedule page to see what
    // else is live right now. Failure here degrades to an empty list,
    // never breaks the game page itself.
    getLiveScoresAcrossSports(SPORT_CATALOG.map((s) => s.slug)).catch(() => []),
  ]);
  const otherLiveGamesInitial: LiveScoreGame[] = otherLiveGames.map((g) => ({
    id: g.id,
    sport: g.sport,
    sportLabel: SPORT_CATALOG.find((s) => s.slug === g.sport)?.label ?? g.sport,
    status: g.status,
    period: g.period ?? null,
    homeTeamName: g.homeTeamName,
    homeTeamLogoUrl: g.homeTeamLogoUrl ?? null,
    awayTeamName: g.awayTeamName,
    awayTeamLogoUrl: g.awayTeamLogoUrl ?? null,
    homeScore: g.homeScore ?? null,
    awayScore: g.awayScore ?? null,
  }));

  const initial: LiveGameInitial = {
    id: game.id,
    sport,
    sportLabel,
    stage: live?.stage,
    homeTeamName: game.homeTeamName,
    homeTeamLogoUrl: game.homeTeamLogoUrl,
    awayTeamName: game.awayTeamName,
    awayTeamLogoUrl: game.awayTeamLogoUrl,
    homeRecord: records.home,
    awayRecord: records.away,
    startsAt: (live?.startsAt ?? game.startsAt.toISOString()),
    status: (live?.status ?? game.status) as "scheduled" | "live" | "final",
    period: live?.period ?? game.period ?? undefined,
    homeScore: live?.homeScore ?? game.homeScore,
    awayScore: live?.awayScore ?? game.awayScore,
    venue: live?.venue,
    isMatchupSport,
    tally,
    myPick,
    myPickCorrect,
  };

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports</span>
        <h1 className="pg-title">{game.awayTeamName} @ {game.homeTeamName}</h1>
        <p className="pg-sub">{[sportLabel, live?.stage].filter(Boolean).join(" · ")}</p>
      </div>
      <SmartBackLink fallbackHref={`/dashboard/discovery/sports/${game.sport}`} label="← Back to Sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }} />

      <LiveGameCenter initial={initial} />

      <div style={{ maxWidth: 520, marginTop: "1.4rem" }}>
        <LiveScoresPanel
          initialGames={otherLiveGamesInitial}
          title="Other Live Games"
          emptyMessage="No other games live across any sport right now."
          excludeGameId={game.id}
        />
      </div>

      {myFantasyPlayers.length > 0 && (
        <div className="disc-section" style={{ maxWidth: 520 }}>
          <div className="disc-section__head"><h2>My Fantasy Players</h2></div>
          <div className="disc-chart">
            {myFantasyPlayers.map((p) => (
              <div className="disc-chart__row" key={`${p.fantasyTeamId}-${p.playerId}`}>
                <div className="disc-chart__song">
                  <b>{p.playerName}</b>
                  <span>{p.position} · {p.leagueName}{p.isStarter ? "" : " · Bench"}</span>
                </div>
                <span className="disc-badge">
                  {p.points.toFixed(1)} pts{(live?.status ?? game.status) === "live" ? " LIVE" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupPicks.map((g) => (
        <div className="disc-section" key={g.groupId} style={{ maxWidth: 520 }}>
          <div className="disc-section__head"><h2>Family/Friend Picks — {g.groupName}</h2></div>
          {!g.locked && <p className="disc-empty" style={{ marginTop: 0 }}>Picks stay hidden from the group until kickoff, so nobody can copy anyone else&apos;s pick.</p>}
          <div className="disc-chart">
            {g.picks.map((p) => {
              const teamName = p.teamPick === "home" ? game.homeTeamName : p.teamPick === "away" ? game.awayTeamName : null;
              const label = g.locked ? (teamName ?? "No pick made") : p.hasPicked ? "Picked" : "No pick yet";
              return (
                <div className="disc-chart__row" key={p.accountId}>
                  <div className="disc-chart__song"><b>{p.isMe ? "You" : p.name}</b></div>
                  <span className="disc-badge">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="disc-empty" style={{ marginTop: "1.2rem" }}>
        Community pick percentages are Magical Moments votes only — never betting odds.
      </p>
    </div>
  );
}
