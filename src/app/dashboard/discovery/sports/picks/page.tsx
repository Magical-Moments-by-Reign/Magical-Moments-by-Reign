import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../SmartBackLink";
import DiscoveryImage from "@/components/discovery/DiscoveryImage";
import { requireAccount } from "@/lib/guard";
import {
  getMagicalPicksProfile,
  getFamilyPicksLeaderboard,
  getFeaturedMatchupsForDate,
  getMyPickHistory,
} from "@/lib/discovery/sports/service";
import type { LeaderboardPeriod } from "@/lib/discovery/sports/picks";
import { getMyPickGroups } from "@/lib/discovery/sports/pickem-groups-service";
import { SPORTS_BADGES } from "@/lib/discovery/sports/badges";
import { createPickGroupAction, joinPickGroupAction, submitPickAction } from "../actions";
import "../../discovery.css";
import "../sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Picks — Magical Discovery", robots: { index: false } };

type Tab = "make" | "my" | "leaderboard";
const TABS: { key: Tab; label: string }[] = [
  { key: "make", label: "Make Picks" },
  { key: "my", label: "My Picks" },
  { key: "leaderboard", label: "Leaderboard" },
];

/** A 5-day window (yesterday through +3 days) as real calendar dates —
 *  same UTC-slice convention getGamesByDate/getGamesWithVoteContext already
 *  use elsewhere in Sports, so a date tab here always agrees with what
 *  those pages consider "today." */
function dateWindow(): string[] {
  return Array.from({ length: 5 }, (_, i) => new Date(Date.now() + (i - 1) * 86_400_000).toISOString().slice(0, 10));
}

function formatDateTab(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function formatGameTime(startsAt: Date): string {
  return startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function MagicalPicksPage({ searchParams }: { searchParams: Promise<{ tab?: string; date?: string; range?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports/picks");
  const { tab: tabParam, date: dateParam, range: rangeParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "make";
  const window5 = dateWindow();
  const date = window5.includes(dateParam ?? "") ? (dateParam as string) : window5[1];
  const VALID_RANGES: LeaderboardPeriod[] = ["today", "week", "month", "season", "all_time"];
  const range: LeaderboardPeriod = VALID_RANGES.includes(rangeParam as LeaderboardPeriod) ? (rangeParam as LeaderboardPeriod) : "week";

  const [profile, groups] = await Promise.all([
    getMagicalPicksProfile(account.id),
    getMyPickGroups(account.id),
  ]);
  const [featured, leaderboard, history] = await Promise.all([
    tab === "make" ? getFeaturedMatchupsForDate(date, account.id) : Promise.resolve([]),
    tab === "leaderboard" ? getFamilyPicksLeaderboard(account.id, range) : Promise.resolve(null),
    tab === "my" ? getMyPickHistory(account.id) : Promise.resolve([]),
  ]);
  const earnedIds = new Set(profile.badges.map((b) => b.id));

  const statsSidebar = (
    <div className="spx-panel">
      <div className="spx-panel__head"><h2>Your Stats</h2></div>
      <div className="mp-stats-card">
        <div className="mp-stat"><span>Correct Picks</span><b>{profile.correct}</b></div>
        <div className="mp-stat"><span>Current Streak</span><b>{profile.currentStreak}{profile.currentStreak > 0 ? " 🔥" : ""}</b></div>
        <div className="mp-stat"><span>Longest Streak</span><b>{profile.longestStreak}</b></div>
        <div className="mp-stat"><span>Pick Accuracy</span><b>{profile.accuracyPct}%</b></div>
        <div className="mp-stat"><span>Total Picks</span><b>{profile.total + profile.pending}</b></div>
        {profile.pending > 0 && <div className="mp-stat"><span>Pending</span><b>{profile.pending}</b></div>}
      </div>
    </div>
  );

  const streakSidebar =
    profile.currentStreak > 0 ? (
      <div className="spx-panel">
        <div className="spx-panel__head"><h2>Active Streak</h2></div>
        <div className="mp-streak">
          <span className="mp-streak__num">{profile.currentStreak}</span>
          <span className="mp-streak__label">Picks Correct In A Row</span>
          <div className="mp-streak__flames">{"🔥".repeat(Math.min(profile.currentStreak, 10))}</div>
        </div>
      </div>
    ) : null;

  return (
    <div className="spx">
      <nav className="disc-nav">
        <Link href="/dashboard/discovery/sports">Sports Hub</Link>
        <Link href="/dashboard/discovery/sports/picks" aria-current="page">Magical Picks</Link>
        <Link href="/dashboard/discovery/sports/fantasy">Fantasy Football</Link>
      </nav>

      <div className="disc-page-head">
        <span className="disc-page-head__eyebrow">Sports Hub · Magical Picks</span>
        <h1>Magical Picks</h1>
        <p>Pick across your favorite sports. Compete with family and friends. Build your prediction legacy — entertainment only, never real-money wagering.</p>
      </div>
      <SmartBackLink fallbackHref="/dashboard/discovery/sports" label="← Back to Sports" className="btn btn--sm" style={{ marginBottom: ".8rem", display: "inline-block" }} />

      <div className="mp-tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={`?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}>{t.label}</Link>
        ))}
      </div>

      {tab === "make" && (
        <>
          <div className="mp-dates">
            {window5.map((d) => (
              <Link key={d} href={`?tab=make&date=${d}`} aria-current={date === d ? "page" : undefined}>{formatDateTab(d)}</Link>
            ))}
          </div>
          <div className="mp-layout">
            <div>
              {featured.length === 0 ? (
                <p className="spx-panel__empty">No pickable matchups on {formatDateTab(date)} — try another date.</p>
              ) : (
                featured.map((group) => (
                  <div className="mp-sport-group" key={group.sport}>
                    <p className="mp-sport-group__label">{group.label}</p>
                    {group.contexts.map((ctx) => (
                      <div className="mp-row" key={ctx.game.id}>
                        <span className="mp-row__time">{formatGameTime(ctx.game.startsAt)}</span>
                        <div className="mp-row__teams">
                          <div className="mp-row__team">
                            <DiscoveryImage src={ctx.game.awayTeamLogoUrl} alt={ctx.game.awayTeamName} fallback={ctx.game.awayTeamName.slice(0, 3).toUpperCase()} />
                            <b>{ctx.game.awayTeamName}</b>
                          </div>
                          <span className="mp-row__vs">@</span>
                          <div className="mp-row__team">
                            <DiscoveryImage src={ctx.game.homeTeamLogoUrl} alt={ctx.game.homeTeamName} fallback={ctx.game.homeTeamName.slice(0, 3).toUpperCase()} />
                            <b>{ctx.game.homeTeamName}</b>
                          </div>
                        </div>
                        {!ctx.locked ? (
                          <form action={submitPickAction}>
                            <input type="hidden" name="gameId" value={ctx.game.id} />
                            <div className="mp-row__actions">
                              <button type="submit" name="teamPick" value="away" data-picked={ctx.myPick === "away"}>{ctx.game.awayTeamName}</button>
                              <button type="submit" name="teamPick" value="home" data-picked={ctx.myPick === "home"}>{ctx.game.homeTeamName}</button>
                            </div>
                          </form>
                        ) : (
                          <span className="mp-row__locked">{ctx.myPick ? `You picked ${ctx.myPick === "home" ? ctx.game.homeTeamName : ctx.game.awayTeamName}` : "Locked"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {statsSidebar}
              {streakSidebar}
            </div>
          </div>
        </>
      )}

      {tab === "my" && (
        <div className="mp-layout">
          <div>
            {history.length === 0 ? (
              <p className="spx-panel__empty">Make your first pick on a matchup to start your Magical Picks history.</p>
            ) : (
              history.map((h) => {
                const pickedName = h.teamPick === "home" ? h.homeTeamName : h.teamPick === "away" ? h.awayTeamName : null;
                const result = h.isCorrect === null ? "pending" : h.isCorrect ? "correct" : "incorrect";
                return (
                  <div className="mp-history-row" key={h.id}>
                    <div className="mp-history-row__meta">
                      <b>{h.awayTeamName} @ {h.homeTeamName}</b>
                      <span>{h.sportLabel} · {h.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · Picked {pickedName ?? "—"}</span>
                    </div>
                    <span className={`mp-history-row__result mp-history-row__result--${result}`}>
                      {result === "correct" ? "Correct" : result === "incorrect" ? "Incorrect" : "Pending"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {statsSidebar}
            {streakSidebar}
          </div>
        </div>
      )}

      {tab === "leaderboard" && leaderboard && (
        <div className="spx-panel">
          <div className="spx-panel__head">
            <h2>{leaderboard.hasFamily ? "Family Leaderboard" : "My Picks"}</h2>
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              <Link href="?tab=leaderboard&range=today" aria-current={range === "today" ? "page" : undefined}>Today</Link>
              <Link href="?tab=leaderboard&range=week" aria-current={range === "week" ? "page" : undefined}>This Week</Link>
              <Link href="?tab=leaderboard&range=month" aria-current={range === "month" ? "page" : undefined}>This Month</Link>
              <Link href="?tab=leaderboard&range=season" aria-current={range === "season" ? "page" : undefined}>Season</Link>
              <Link href="?tab=leaderboard&range=all_time" aria-current={range === "all_time" ? "page" : undefined}>All Time</Link>
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
      )}

      {Object.keys(profile.bySport).length > 0 && (
        <div className="disc-section" style={{ marginTop: "1.6rem" }}>
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
    </div>
  );
}
