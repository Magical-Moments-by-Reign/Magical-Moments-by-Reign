import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../SmartBackLink";
import { requireAccount } from "@/lib/guard";
import { SPORT_CATALOG, getSportsLandingGames, getLiveScoresAcrossSports } from "@/lib/discovery/sports/service";
import LiveScoresPanel, { type LiveScoreGame } from "../LiveScoresPanel";
import "../../discovery.css";
import "../sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Scores & Schedule — Magical Moments Sports", robots: { index: false } };

export default async function SportsSchedulePage() {
  await requireAccount("/dashboard/discovery/sports/schedule");
  const allSports = SPORT_CATALOG.map((s) => s.slug);
  // Live Now pulls from the uncapped, dedicated live resolver — a busy
  // multi-sport night shouldn't silently truncate at getSportsLandingGames'
  // small landing-page preview size. Upcoming keeps using that capped
  // preview since it isn't the "must feel live" part of this page.
  const [liveGames, { upcoming }] = await Promise.all([
    getLiveScoresAcrossSports(allSports),
    getSportsLandingGames(allSports, 20),
  ]);
  const initialLiveGames: LiveScoreGame[] = liveGames.map((g) => ({
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

  return (
    <div className="spx">
      <div className="spx-divider" style={{ marginTop: "1.4rem" }}><span>Live Scores &amp; Schedule</span></div>
      <SmartBackLink fallbackHref="/dashboard/discovery/sports" label="← Back to Sports" className="spx-panel__cta" style={{ display: "inline-block", marginBottom: "1.4rem" }} />

      <div className="spx-panels" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <LiveScoresPanel initialGames={initialLiveGames} />

        <div className="spx-panel">
          <div className="spx-panel__head"><h2>Upcoming</h2></div>
          <div className="spx-panel__body">
            {upcoming.length === 0 ? (
              <p className="spx-panel__empty">No scheduled games found in the next week.</p>
            ) : upcoming.map((g) => (
              <Link key={g.id} href={`/dashboard/discovery/sports/game/${g.id}`} className="spx-up-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.awayTeamLogoUrl ? <img src={g.awayTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                <span className="spx-up-row__vs">@</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.homeTeamLogoUrl ? <img src={g.homeTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                <div className="spx-up-row__meta">
                  <b>{g.awayTeamName} @ {g.homeTeamName}</b>
                  <span>{SPORT_CATALOG.find((s) => s.slug === g.sport)?.label} · {g.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {g.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
