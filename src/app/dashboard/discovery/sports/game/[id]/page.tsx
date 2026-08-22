import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getMatchup, getLiveGameState, getGameTeamRecords, SPORT_CATALOG } from "@/lib/discovery/sports/service";
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

  const [live, records] = await Promise.all([
    getLiveGameState(id),
    getGameTeamRecords(sport, game.league, game.homeTeamName, game.awayTeamName).catch(() => ({} as { home?: string; away?: string })),
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
    isMatchupSport: MATCHUP_SPORTS.includes(sport),
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

      <p className="disc-empty" style={{ marginTop: "1.2rem" }}>
        Community pick percentages are Magical Moments votes only — never betting odds.
      </p>
    </div>
  );
}
