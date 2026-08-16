import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMagicalPicksProfile, getFamilyPicksLeaderboard } from "@/lib/discovery/sports/service";
import { SPORTS_BADGES } from "@/lib/discovery/sports/badges";
import "../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Picks — Magical Discovery", robots: { index: false } };

export default async function MagicalPicksPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports/picks");
  const { range: rangeParam } = await searchParams;
  const range: "week" | "all" = rangeParam === "all" ? "all" : "week";
  const [profile, leaderboard] = await Promise.all([
    getMagicalPicksProfile(account.id),
    getFamilyPicksLeaderboard(account.id, range),
  ]);
  const earnedIds = new Set(profile.badges.map((b) => b.id));

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports</span>
        <h1 className="pg-title">Magical Picks</h1>
        <p className="pg-sub">Your prediction profile — entertainment only, never real-money wagering.</p>
      </div>
      <Link href="/dashboard/discovery/sports" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }}>← Back to Sports</Link>

      <div className="sports-stats">
        <div className="sports-stat"><b>🏆 {profile.correct}</b><span>Correct</span></div>
        <div className="sports-stat"><b>🔥 {profile.currentStreak}</b><span>Current Streak</span></div>
        <div className="sports-stat"><b>🎯 {profile.accuracyPct}%</b><span>Pick Accuracy</span></div>
        <div className="sports-stat"><b>{profile.longestStreak}</b><span>Longest Streak</span></div>
        <div className="sports-stat"><b>{profile.total}</b><span>Total Picks</span></div>
      </div>

      {Object.keys(profile.bySport).length > 0 && (
        <div className="disc-section">
          <div className="disc-section__head"><h2>Sport-by-Sport Accuracy</h2></div>
          <div className="disc-chart">
            {Object.entries(profile.bySport).map(([sport, stat]) => (
              <div className="disc-chart__row" key={sport}>
                <div className="disc-chart__song"><b>{sport.toUpperCase()}</b><span>{stat.correct} of {stat.total} correct</span></div>
                <span className="disc-badge">{stat.accuracyPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="disc-section">
        <div className="disc-section__head"><h2>Badges</h2></div>
        <div className="sports-badges">
          {SPORTS_BADGES.map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <div key={b.id} className={`sports-badge${earned ? "" : " sports-badge--locked"}`}>
                <span className="icon">{b.icon}</span>
                <b>{b.label}</b>
                <span>{b.description}</span>
              </div>
            );
          })}
        </div>
      </div>

      {profile.total === 0 && (
        <p className="disc-empty">Make your first pick on a matchup to start your Magical Picks profile.</p>
      )}

      <div className="disc-section">
        <div className="disc-section__head">
          <h2>{leaderboard.hasFamily ? "Family Leaderboard" : "My Picks"}</h2>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <Link href="?range=week" className="btn btn--sm" aria-current={range === "week"}>This Week</Link>
            <Link href="?range=all" className="btn btn--sm" aria-current={range === "all"}>All Time</Link>
          </div>
        </div>
        <div className="disc-chart">
          {leaderboard.entries.map((e) => (
            <div className="disc-chart__row" key={e.accountId}>
              <div className="disc-chart__song"><b>#{e.rank} {e.isMe ? "You" : e.name}</b></div>
              <span className="disc-badge">{e.points} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
