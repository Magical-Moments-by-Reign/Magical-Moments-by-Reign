// ── Magical Picks + Fantasy Football — shared first-class panels ────────
// Reused verbatim on the main Sports landing page and on the NFL page (and
// any future sport page), so the two features read identically everywhere
// a member encounters them — never a second, drifting copy of the same
// card. Real data only: a matchup preview is either a real, current/
// upcoming game the member can actually pick, or an honest empty state —
// never a fabricated placeholder game.
//
// Product scope, kept explicit in the copy itself so it survives future
// edits: Magical Picks spans every sport Magical Moments supports (NFL,
// college football, NBA, WNBA, college basketball, MLB, NHL, soccer, MMA,
// rugby, volleyball, F1, and whatever's added later) — this panel's own
// preview may show one sport's matchup, but the panel must never read as
// if Picks itself is limited to that sport. Fantasy Football is, for now,
// NFL fantasy only — the copy says so plainly rather than implying a
// broader "Magical Fantasy Sports" that doesn't exist yet.

import Link from "next/link";
import DiscoveryImage from "@/components/discovery/DiscoveryImage";
import { submitPickAction } from "./actions";
import PickConfirmButton from "./PickConfirmButton";
import { ConfidencePicker, ConfidenceStars } from "./ConfidenceStars";
import type { MatchupCardContext } from "@/lib/discovery/sports/service";
import type { FantasyLeagueSummary } from "@/lib/discovery/sports/fantasy-service";
import type { SportSlug } from "@/lib/discovery/providers/sports";

export function MagicalPicksPanel({ matchup, previewSportLabel, sport, pageSport }: { matchup: MatchupCardContext | null; previewSportLabel?: string; sport?: SportSlug; pageSport?: SportSlug }) {
  // Real 5-day-ahead window (today, +1 .. +4) that Make Picks itself
  // resolves the date tabs from — this link jumps straight into that same
  // list, filtered to this sport, rather than the one game shown here.
  const selectAnotherHref = sport ? `/dashboard/discovery/sports/picks?tab=make&sport=${sport}` : "/dashboard/discovery/sports/picks?tab=make";
  // pageSport is the SPORT PAGE this panel is rendered on (e.g. the NFL
  // page) — distinct from `sport` (the currently-previewed matchup's
  // sport, which the Sports Hub also sets even though the Hub itself isn't
  // scoped to one sport). Only a real sport-page context should narrow
  // "View All"/"Go to Magical Picks" to that one sport; the Hub's identical
  // links must keep showing every sport, matching its own "Pick winners
  // across every sport" copy just below.
  const allPicksHref = pageSport ? `/dashboard/discovery/sports/picks?tab=make&sport=${pageSport}` : "/dashboard/discovery/sports/picks";
  return (
    <div className="spx-panel">
      <div className="spx-panel__head"><h2>Magical Picks</h2><Link href={allPicksHref}>View All →</Link></div>
      <p className="spx-panel__empty" style={{ margin: "0 0 .8rem" }}>
        {pageSport
          ? `Pick winners in ${previewSportLabel ?? "this sport"} and see how you stack up against family and friends.`
          : "Pick winners across every sport on Magical Moments — NFL, college football, NBA, MLB, NHL, soccer, MMA, F1, and more — and see how you stack up against family and friends."}
      </p>
      {!matchup ? (
        <p className="spx-panel__empty">No pickable {previewSportLabel ?? ""} matchup right now — check back closer to kickoff.</p>
      ) : (
        <div className="spx-panel__body">
          {previewSportLabel && <p className="spx-poll__sport">{previewSportLabel} · Who will win this game?</p>}
          <div className="spx-poll__vs">
            <DiscoveryImage src={matchup.game.awayTeamLogoUrl} alt={matchup.game.awayTeamName} fallback={matchup.game.awayTeamName.slice(0, 3).toUpperCase()} />
            <b>{matchup.game.awayTeamName}</b>
            <em>VS</em>
            <b>{matchup.game.homeTeamName}</b>
            <DiscoveryImage src={matchup.game.homeTeamLogoUrl} alt={matchup.game.homeTeamName} fallback={matchup.game.homeTeamName.slice(0, 3).toUpperCase()} />
          </div>
          <div className="spx-poll__bar">
            <span style={{ width: `${matchup.tally.awayPct || 50}%` }}>{matchup.tally.awayPct}%</span>
            <span style={{ width: `${matchup.tally.homePct || 50}%` }}>{matchup.tally.homePct}%</span>
          </div>
          <p className="spx-poll__votes">{matchup.tally.total.toLocaleString()} votes</p>
          {!matchup.locked ? (
            <form action={submitPickAction}>
              <input type="hidden" name="gameId" value={matchup.game.id} />
              <div className="spx-poll__actions">
                <PickConfirmButton name="teamPick" value="away" label={matchup.game.awayTeamName} logoUrl={matchup.game.awayTeamLogoUrl} picked={matchup.myPick === "away"} confirmLabel={`${matchup.game.awayTeamName} to beat ${matchup.game.homeTeamName}`} />
                <PickConfirmButton name="teamPick" value="home" label={matchup.game.homeTeamName} logoUrl={matchup.game.homeTeamLogoUrl} picked={matchup.myPick === "home"} confirmLabel={`${matchup.game.homeTeamName} to beat ${matchup.game.awayTeamName}`} />
              </div>
              <div className="spx-poll__confidence">
                <span>Confidence</span>
                <ConfidencePicker gameId={matchup.game.id} myConfidence={matchup.myConfidence} />
              </div>
            </form>
          ) : (
            <>
              <p className="spx-panel__empty">Picks are locked for this matchup.</p>
              <ConfidenceStars value={matchup.myConfidence} />
            </>
          )}
        </div>
      )}
      <Link href={selectAnotherHref} className="spx-poll__select-other">Select Another Game →</Link>
      <Link href={allPicksHref} className="spx-panel__cta">Go to Magical Picks</Link>
    </div>
  );
}

/** One league row's real, state-aware next action — never a generic label
 *  when a specific one is more useful. */
function fantasyLeagueAction(l: FantasyLeagueSummary): string {
  if (l.draftStatus === "in_progress") return "Continue Draft →";
  if (l.draftStatus === "scheduled") return l.isCommissioner ? "Start Draft →" : "Waiting for Draft";
  return "Manage Team →";
}

export function FantasyFootballPanel({ leagues }: { leagues: FantasyLeagueSummary[] }) {
  return (
    <div className="spx-panel">
      <div className="spx-panel__head"><h2>Fantasy Football</h2><Link href="/dashboard/discovery/sports/fantasy">View All →</Link></div>
      <p className="spx-panel__empty" style={{ margin: "0 0 .8rem" }}>
        The NFL fantasy experience: draft real NFL players, manage your roster and lineup, make trades, work the waiver wire, chase the standings, and compete through the fantasy playoffs to crown a league champion.
      </p>
      {leagues.length === 0 ? (
        <div className="spx-panel__body">
          <p className="spx-panel__empty" style={{ margin: 0 }}>You aren&rsquo;t in a fantasy league yet.</p>
          <div className="spx-poll__actions">
            <Link href="/dashboard/discovery/sports/fantasy" className="spx-panel__cta" style={{ marginTop: 0 }}>Create a League</Link>
            <Link href="/dashboard/discovery/sports/fantasy" className="spx-panel__cta" style={{ marginTop: 0 }}>Join a League</Link>
          </div>
        </div>
      ) : (
        <div className="disc-chart">
          {leagues.slice(0, 3).map((l) => (
            <Link href={`/dashboard/discovery/sports/fantasy/${l.id}`} key={l.id} className="disc-chart__row" style={{ textDecoration: "none" }}>
              <div className="disc-chart__song"><b>{l.name}</b><span>{l.season} season · {l.teamCount} team{l.teamCount === 1 ? "" : "s"}</span></div>
              <span className="disc-badge">{fantasyLeagueAction(l)}</span>
            </Link>
          ))}
        </div>
      )}
      <Link href="/dashboard/discovery/sports/fantasy" className="spx-panel__cta">View My Leagues</Link>
    </div>
  );
}
