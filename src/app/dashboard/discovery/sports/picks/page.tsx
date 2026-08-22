import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMagicalPicksProfile, getFamilyPicksLeaderboard } from "@/lib/discovery/sports/service";
import type { LeaderboardPeriod } from "@/lib/discovery/sports/picks";
import { getMyPickGroups } from "@/lib/discovery/sports/pickem-groups-service";
import { SPORTS_BADGES } from "@/lib/discovery/sports/badges";
import { createPickGroupAction, joinPickGroupAction } from "../actions";
import "../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Picks — Magical Discovery", robots: { index: false } };

export default async function MagicalPicksPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports/picks");
  const { range: rangeParam } = await searchParams;
  const VALID_RANGES: LeaderboardPeriod[] = ["today", "week", "month", "season", "all_time"];
  const range: LeaderboardPeriod = VALID_RANGES.includes(rangeParam as LeaderboardPeriod) ? (rangeParam as LeaderboardPeriod) : "week";
  const [profile, leaderboard, groups] = await Promise.all([
    getMagicalPicksProfile(account.id),
    getFamilyPicksLeaderboard(account.id, range),
    getMyPickGroups(account.id),
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
        <div className="disc-section__head"><h2>Pick&apos;em Groups</h2></div>
        <p className="disc-empty" style={{ marginTop: 0 }}>Private groups you create and invite family or friends into — entertainment predictions only, never wagering.</p>
        {groups.length > 0 && (
          <div className="disc-chart">
            {groups.map((g) => (
              <Link href={`/dashboard/discovery/sports/picks/groups/${g.id}`} key={g.id} className="disc-chart__row" style={{ textDecoration: "none" }}>
                <div className="disc-chart__song"><b>{g.name}</b><span>{g.memberCount} member{g.memberCount === 1 ? "" : "s"} · code {g.inviteCode}</span></div>
                <span className="disc-badge">{g.isOwner ? "Owner" : "Member"}</span>
              </Link>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <form action={createPickGroupAction} className="disc-form disc-form--compact">
            <input type="text" name="name" placeholder="e.g. Turner Family NFL Picks" maxLength={60} required />
            <button type="submit" className="btn btn--sm">Create Group</button>
          </form>
          <form action={joinPickGroupAction} className="disc-form disc-form--compact">
            <input type="text" name="code" placeholder="Invite code" maxLength={6} required style={{ textTransform: "uppercase" }} />
            <button type="submit" className="btn btn--sm">Join Group</button>
          </form>
        </div>
      </div>

      <div className="disc-section">
        <div className="disc-section__head">
          <h2>{leaderboard.hasFamily ? "Family Leaderboard" : "My Picks"}</h2>
          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
            <Link href="?range=today" className="btn btn--sm" aria-current={range === "today"}>Today</Link>
            <Link href="?range=week" className="btn btn--sm" aria-current={range === "week"}>This Week</Link>
            <Link href="?range=month" className="btn btn--sm" aria-current={range === "month"}>This Month</Link>
            <Link href="?range=season" className="btn btn--sm" aria-current={range === "season"}>Season</Link>
            <Link href="?range=all_time" className="btn btn--sm" aria-current={range === "all_time"}>All Time</Link>
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
