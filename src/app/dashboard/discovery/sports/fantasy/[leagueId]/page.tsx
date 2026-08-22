import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import {
  getFantasyLeagueDetail,
  getAvailablePlayers,
  getFantasyTeamRoster,
  getFantasyMatchupsForWeek,
  getFantasyStandings,
  getCurrentNflWeekAndSeason,
} from "@/lib/discovery/sports/fantasy-service";
import { draftPickLabel } from "@/lib/discovery/sports/fantasy";
import { startFantasyDraftAction, draftPlayerAction, setLineupSlotAction, syncFantasyWeekScoresAction } from "../actions";
import "../../../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fantasy League — Magical Discovery", robots: { index: false } };

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];

export default async function FantasyLeaguePage({ params, searchParams }: { params: Promise<{ leagueId: string }>; searchParams: Promise<{ pos?: string; team?: string; week?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const { leagueId } = await params;
  const { pos: posParam, team: teamParam, week: weekParam } = await searchParams;
  const league = await getFantasyLeagueDetail(account.id, leagueId);
  if (!league) notFound();

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports · Fantasy Football</span>
        <h1 className="pg-title">{league.name}</h1>
        <p className="pg-sub">{league.season} season · invite code {league.inviteCode} · {league.teams.length} team{league.teams.length === 1 ? "" : "s"}</p>
      </div>
      <Link href="/dashboard/discovery/sports/fantasy" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }}>← Back to Fantasy Football</Link>

      {league.draftStatus === "scheduled" && (
        <div className="disc-section">
          <div className="disc-section__head"><h2>Teams</h2></div>
          <div className="disc-chart">
            {league.teams.map((t) => (
              <div className="disc-chart__row" key={t.id}>
                <div className="disc-chart__song"><b>{t.teamName}</b><span>{t.isMe ? "You" : "League member"}</span></div>
              </div>
            ))}
          </div>
          {league.isCommissioner && (
            <form action={startFantasyDraftAction} style={{ marginTop: "1rem" }}>
              <input type="hidden" name="leagueId" value={league.id} />
              <button type="submit" className="btn btn--sm" disabled={league.teams.length < 2}>Start Draft</button>
              {league.teams.length < 2 && <p className="disc-empty">Needs at least 2 teams before the draft can start.</p>}
            </form>
          )}
          {!league.isCommissioner && <p className="disc-empty">Waiting for the commissioner to start the draft. Share code {league.inviteCode} to invite more teams first.</p>}
        </div>
      )}

      {league.draftStatus === "in_progress" && (
        <FantasyDraftBoard league={league} leagueId={leagueId} pos={posParam && POSITIONS.includes(posParam.toUpperCase()) ? posParam.toUpperCase() : "QB"} />
      )}

      {league.draftStatus === "complete" && (
        <>
          <FantasyMatchupsAndStandings accountId={account.id} leagueId={leagueId} season={league.season} weekParam={weekParam} />
          <FantasyRostersView league={league} leagueId={leagueId} teamParam={teamParam} accountId={account.id} />
        </>
      )}
    </div>
  );
}

async function FantasyDraftBoard({ league, leagueId, pos }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; pos: string }) {
  const [available] = await Promise.all([getAvailablePlayers(leagueId)]);
  const onClockTeam = league.teams.find((t) => t.id === league.onTheClockTeamId);
  const myTurn = league.onTheClockTeamId === league.myTeamId;
  const { round, pickInRound } = draftPickLabel(league.draftPickIndex, league.teams.length);
  const filtered = available.filter((p) => p.position === pos).slice(0, 100);

  return (
    <div className="disc-section">
      <div className="disc-section__head">
        <h2>Draft — Round {round}, Pick {pickInRound}</h2>
        <span className="disc-badge">{myTurn ? "Your pick" : `${onClockTeam?.teamName ?? "—"} is on the clock`}</span>
      </div>
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {POSITIONS.map((p) => (
          <Link key={p} href={`?pos=${p}`} className="btn btn--sm" aria-current={pos === p}>{p}</Link>
        ))}
      </div>
      <div className="disc-chart">
        {filtered.length === 0 && <p className="disc-empty">No available {pos}s remaining — try another position.</p>}
        {filtered.map((p) => (
          <div className="disc-chart__row" key={p.playerId}>
            <div className="disc-chart__song"><b>{p.name}</b><span>{p.position} · {p.team ?? "Free Agent"}</span></div>
            {myTurn ? (
              <form action={draftPlayerAction}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="playerId" value={p.playerId} />
                <button type="submit" className="btn btn--sm">Draft</button>
              </form>
            ) : (
              <span className="disc-badge">Available</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

async function FantasyMatchupsAndStandings({ accountId, leagueId, season, weekParam }: { accountId: string; leagueId: string; season: number; weekParam?: string }) {
  const parsedWeek = weekParam ? Number(weekParam) : NaN;
  const defaultWeek = Number.isFinite(parsedWeek) && parsedWeek >= 1 ? parsedWeek : (await getCurrentNflWeekAndSeason(season)).week;
  const [matchups, standings] = await Promise.all([
    getFantasyMatchupsForWeek(accountId, leagueId, defaultWeek),
    getFantasyStandings(accountId, leagueId),
  ]);

  return (
    <>
      <div className="disc-section">
        <div className="disc-section__head">
          <h2>Week {defaultWeek} Matchups</h2>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <Link href={`?week=${Math.max(1, defaultWeek - 1)}`} className="btn btn--sm">← Prev</Link>
            <Link href={`?week=${defaultWeek + 1}`} className="btn btn--sm">Next →</Link>
          </div>
        </div>
        {!matchups || matchups.length === 0 ? (
          <p className="disc-empty">No matchups scheduled for week {defaultWeek}.</p>
        ) : (
          <>
            <div className="disc-chart">
              {matchups.map((m) => (
                <div className="disc-chart__row" key={m.id}>
                  <div className="disc-chart__song">
                    <b>{m.awayTeamName} @ {m.homeTeamName}</b>
                    <span>{m.final ? "Final" : "In progress"}</span>
                  </div>
                  <span className="disc-badge">{m.awayScore.toFixed(2)} – {m.homeScore.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <form action={syncFantasyWeekScoresAction} style={{ marginTop: ".8rem" }}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="week" value={defaultWeek} />
              <button type="submit" className="btn btn--sm">Sync This Week&apos;s Scores</button>
            </form>
          </>
        )}
      </div>

      <div className="disc-section">
        <div className="disc-section__head"><h2>Standings</h2></div>
        {!standings || standings.entries.length === 0 ? (
          <p className="disc-empty">No games played yet this season.</p>
        ) : (
          <div className="disc-chart">
            {standings.entries.map((e) => (
              <div className="disc-chart__row" key={e.teamId}>
                <div className="disc-chart__song">
                  <b>#{e.rank} {e.isMe ? "You" : e.teamName}</b>
                  <span>{e.wins}-{e.losses}{e.ties ? `-${e.ties}` : ""} · {e.pointsFor.toFixed(1)} PF · {e.pointsAgainst.toFixed(1)} PA</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

async function FantasyRostersView({ league, leagueId, teamParam, accountId }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; teamParam?: string; accountId: string }) {
  const viewingTeamId = teamParam || league.myTeamId || league.teams[0]?.id;
  if (!viewingTeamId) return <p className="disc-empty">No teams in this league.</p>;
  const roster = await getFantasyTeamRoster(accountId, leagueId, viewingTeamId);
  if (!roster) notFound();
  const isMyTeam = roster.teamId === league.myTeamId;
  const starters = roster.players.filter((p) => p.lineupSlot !== "BENCH");
  const bench = roster.players.filter((p) => p.lineupSlot === "BENCH");

  return (
    <div className="disc-section">
      <div className="disc-section__head">
        <h2>{roster.teamName}{roster.isMe ? " (Your Team)" : ""}</h2>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
          {league.teams.map((t) => (
            <Link key={t.id} href={`?team=${t.id}`} className="btn btn--sm" aria-current={t.id === viewingTeamId}>{t.teamName}</Link>
          ))}
        </div>
      </div>

      <h3 style={{ marginTop: "1rem" }}>Starting Lineup</h3>
      <div className="disc-chart">
        {league.rosterSlots.map((slot, i) => {
          // Slots like "RB" appear twice in rosterSlots — the Nth occurrence
          // of a label pairs with the Nth starter holding that same label,
          // so two RBs each get their own row instead of both showing the
          // first one.
          const occurrence = league.rosterSlots.slice(0, i).filter((s) => s === slot).length;
          const p = starters.filter((s) => s.lineupSlot === slot)[occurrence];
          return (
            <div className="disc-chart__row" key={`${slot}-${i}`}>
              <div className="disc-chart__song"><b>{slot}</b><span>{p ? `${p.playerName} · ${p.position}` : "Empty"}</span></div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: "1.2rem" }}>Bench</h3>
      <div className="disc-chart">
        {bench.length === 0 && <p className="disc-empty">No bench players.</p>}
        {bench.map((p) => (
          <div className="disc-chart__row" key={p.playerId}>
            <div className="disc-chart__song"><b>{p.playerName}</b><span>{p.position}</span></div>
            {isMyTeam && (
              <form action={setLineupSlotAction}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="teamId" value={roster.teamId} />
                <input type="hidden" name="playerId" value={p.playerId} />
                <select name="slot" defaultValue="">
                  <option value="" disabled>Move to…</option>
                  {league.rosterSlots.filter((s, i, arr) => arr.indexOf(s) === i).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn--sm">Start</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
