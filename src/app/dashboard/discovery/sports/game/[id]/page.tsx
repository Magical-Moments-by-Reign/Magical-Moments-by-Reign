import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getMatchup, SPORT_CATALOG } from "@/lib/discovery/sports/service";
import { MatchupCard } from "../../MatchupCard";
import "../../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Matchup — Magical Discovery", robots: { index: false } };

export default async function MatchupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { id } = await params;
  const matchup = await getMatchup(id, account.id);
  if (!matchup) notFound();

  const { game, tally, myPick, myPickCorrect, locked } = matchup;
  const sportLabel = SPORT_CATALOG.find((s) => s.slug === game.sport)?.label ?? game.sport;

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports</span>
        <h1 className="pg-title">{game.awayTeamName} @ {game.homeTeamName}</h1>
        <p className="pg-sub">{sportLabel} · {game.league}</p>
      </div>
      <Link href="/dashboard/discovery/sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }}>← Back to Sports</Link>

      <div style={{ maxWidth: 460 }}>
        <MatchupCard game={game} tally={tally} myPick={myPick} myPickCorrect={myPickCorrect} locked={locked} sportLabel={sportLabel} />
      </div>

      <p className="disc-empty" style={{ marginTop: "1.2rem" }}>
        {game.source === "owner" ? "Owner-curated matchup." : "Game data via API-Sports."} Community pick percentages are Magical Moments votes only — never betting odds.
      </p>
    </div>
  );
}
