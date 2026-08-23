import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../../../SmartBackLink";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getGroupLeaderboard } from "@/lib/discovery/sports/pickem-groups-service";
import { weeklyChampion } from "@/lib/discovery/sports/pickem-groups";
import { leavePickGroupAction } from "../../../actions";
import "../../../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pick'em Group — Magical Discovery", robots: { index: false } };

export default async function PickGroupPage({ params, searchParams }: { params: Promise<{ groupId: string }>; searchParams: Promise<{ range?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports/picks");
  const { groupId } = await params;
  const { range: rangeParam } = await searchParams;
  const range: "week" | "season" = rangeParam === "week" ? "week" : "season";
  const board = await getGroupLeaderboard(account.id, groupId, range);
  if (!board) notFound();
  const weekBoard = range === "week" ? board : await getGroupLeaderboard(account.id, groupId, "week");
  const champion = weekBoard ? weeklyChampion(weekBoard.entries) : null;

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports · Pick&apos;em Groups</span>
        <h1 className="pg-title">{board.groupName}</h1>
        <p className="pg-sub">Entertainment predictions only — no money, wagering, spreads, or betting odds.</p>
      </div>
      <SmartBackLink fallbackHref="/dashboard/discovery/sports/picks" label="← Back to Magical Picks" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }} />

      {champion && (
        <p className="disc-empty" style={{ marginTop: 0, fontWeight: 700 }}>
          🏆 This Week&apos;s Champion: {champion.isMe ? "You" : champion.name} ({champion.weeklyRecord})
        </p>
      )}

      <div className="disc-section">
        <div className="disc-section__head">
          <h2>Standings</h2>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <Link href="?range=week" className="btn btn--sm" aria-current={range === "week"}>This Week</Link>
            <Link href="?range=season" className="btn btn--sm" aria-current={range === "season"}>Season</Link>
          </div>
        </div>
        <div className="disc-chart">
          {board.entries.map((e) => (
            <div className="disc-chart__row" key={e.accountId}>
              <div className="disc-chart__song">
                <b>#{e.rank} {e.isMe ? "You" : e.name}</b>
                <span>
                  Weekly {e.weeklyRecord} · Season {e.seasonWins}-{e.seasonLosses} ({e.winPct}%) ·
                  {" "}{e.currentStreak > 0 ? `🔥 ${e.currentStreak} current streak` : "no active streak"} · Longest streak {e.longestStreak}
                </span>
              </div>
              <span className="disc-badge">{range === "week" ? `${e.weeklyCorrect} this week` : `Rank #${e.rank} · ${e.seasonCorrect} pts`}</span>
            </div>
          ))}
        </div>
      </div>

      <form action={leavePickGroupAction}>
        <input type="hidden" name="groupId" value={groupId} />
        <button type="submit" className="btn btn--sm">Leave Group</button>
      </form>
    </div>
  );
}
