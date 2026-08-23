import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../SmartBackLink";
import { requireAccount } from "@/lib/guard";
import { SPORT_CATALOG, getSportsLandingGames } from "@/lib/discovery/sports/service";
import "../../discovery.css";
import "../sports-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Scores & Schedule — Magical Moments Sports", robots: { index: false } };

export default async function SportsSchedulePage() {
  await requireAccount("/dashboard/discovery/sports/schedule");
  const allSports = SPORT_CATALOG.map((s) => s.slug);
  const { live, upcoming } = await getSportsLandingGames(allSports, 20);

  return (
    <div className="spx">
      <div className="spx-divider" style={{ marginTop: "1.4rem" }}><span>Live Scores &amp; Schedule</span></div>
      <SmartBackLink fallbackHref="/dashboard/discovery/sports" label="← Back to Sports" className="spx-panel__cta" style={{ display: "inline-block", marginBottom: "1.4rem" }} />

      <div className="spx-panels" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="spx-panel">
          <div className="spx-panel__head"><h2>Live Now</h2></div>
          <div className="spx-panel__body">
            {live.length === 0 ? (
              <p className="spx-panel__empty">Nothing&rsquo;s live across any sport right now.</p>
            ) : live.map((g) => (
              <Link key={g.id} href={`/dashboard/discovery/sports/game/${g.id}`} className="spx-live-row">
                <div className="spx-live-row__meta"><i />LIVE{g.period ? ` · ${g.period}` : ""} · {SPORT_CATALOG.find((s) => s.slug === g.sport)?.label}</div>
                <div className="spx-live-row__score">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.awayTeamLogoUrl ? <img src={g.awayTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                  <b>{g.awayScore ?? "—"}</b><span>VS</span><b>{g.homeScore ?? "—"}</b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.homeTeamLogoUrl ? <img src={g.homeTeamLogoUrl} alt="" /> : <div className="spx-team-row__ph" />}
                </div>
                <div className="spx-live-row__names"><span>{g.awayTeamName}</span><span>{g.homeTeamName}</span></div>
              </Link>
            ))}
          </div>
        </div>

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
