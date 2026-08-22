import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getMatchup, getLiveGameState, getGameTeamRecords, SPORT_CATALOG } from "@/lib/discovery/sports/service";
import { getGroupPicksForGame } from "@/lib/discovery/sports/pickem-groups-service";
import { MATCHUP_SPORTS, type SportSlug } from "@/lib/discovery/providers/sports";
import LiveGameCenter, { type LiveGameInitial } from "./LiveGameCenter";
import "../../../discovery.css";

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
  const [live, records, groupPicks] = await Promise.all([
    getLiveGameState(id),
    getGameTeamRecords(sport, game.league, game.homeTeamName, game.awayTeamName).catch(() => ({} as { home?: string; away?: string })),
    isMatchupSport ? getGroupPicksForGame(account.id, id).catch(() => []) : Promise.resolve([]),
  ]);

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
      <Link href="/dashboard/discovery/sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }}>← Back to Sports</Link>

      <LiveGameCenter initial={initial} />

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
