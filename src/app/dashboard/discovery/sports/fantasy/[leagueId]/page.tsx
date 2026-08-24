import type { Metadata } from "next";
import Link from "next/link";
import SmartBackLink from "../../SmartBackLink";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import {
  getFantasyLeagueDetail,
  getAvailablePlayers,
  getFantasyTeamRoster,
  getFantasyMatchupsForWeek,
  getFantasyStandings,
  getCurrentNflWeekAndSeason,
  getWaiverClaims,
  getFantasyTrades,
  getFantasyPlayoffPicture,
  getFantasyPlayoffBracket,
} from "@/lib/discovery/sports/fantasy-service";
import { draftPickLabel } from "@/lib/discovery/sports/fantasy";
import PlayerAvatar from "../../PlayerAvatar";
import SubmitButton from "@/components/ui/SubmitButton";
import {
  startFantasyDraftAction,
  draftPlayerAction,
  setLineupSlotAction,
  syncFantasyWeekScoresAction,
  dropPlayerAction,
  submitWaiverClaimAction,
  processWaiversAction,
  proposeTradeAction,
  respondToTradeAction,
  vetoTradeAction,
  seedFantasyPlayoffsAction,
  syncFantasyPlayoffRoundAction,
} from "../actions";
import "../../../discovery.css";
// .spx-avatar (PlayerAvatar's own black/gold badge) and .spx-fantasy (the
// scoped warm-espresso re-theme of this page's .disc-* classes, and the
// .spx > .disc-nav-style quick-jump nav) both live in sports-home.css,
// scoped entirely under .spx-* so nothing here touches the rest of Sports.
import "../../sports-home.css";

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
    <div className="disc spx-fantasy">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery · Sports · Fantasy Football</span>
        <h1 className="pg-title">{league.name}</h1>
        <p className="pg-sub">{league.season} season · invite code {league.inviteCode} · {league.teams.length} team{league.teams.length === 1 ? "" : "s"}</p>
      </div>
      <SmartBackLink fallbackHref="/dashboard/discovery/sports/fantasy" label="← Back to Fantasy Football" className="btn btn--sm" style={{ marginBottom: "1.4rem", display: "inline-block" }} />

      <FantasyLeagueNav draftStatus={league.draftStatus} />

      {league.draftStatus === "scheduled" && (
        <div className="disc-section" id="draft">
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
              <SubmitButton className="btn btn--sm" disabled={league.teams.length < 2} pendingLabel="Starting…">Start Draft</SubmitButton>
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
          <FantasyPlayoffs league={league} leagueId={leagueId} accountId={account.id} />
          <FantasyRostersView league={league} leagueId={leagueId} teamParam={teamParam} accountId={account.id} />
          <FantasyFreeAgents league={league} leagueId={leagueId} pos={posParam && POSITIONS.includes(posParam.toUpperCase()) ? posParam.toUpperCase() : "QB"} />
          <FantasyWaivers league={league} leagueId={leagueId} accountId={account.id} />
          <FantasyTrades league={league} leagueId={leagueId} accountId={account.id} />
        </>
      )}
    </div>
  );
}

// Persistent quick-jump strip for the league page — Roster/Draft/Free
// Agents/Waivers/Trades/Standings/Matchups all render on this one route
// (gated by draftStatus), so "navigation" here means anchor-jumping to the
// section already on the page rather than separate routes. Only lists
// sections that actually render for the league's current draftStatus, in
// the shared .disc-nav pill styling (themed warm-espresso by .spx-fantasy
// in sports-home.css) rather than a new nav pattern.
function FantasyLeagueNav({ draftStatus }: { draftStatus: string }) {
  const items: { href: string; label: string }[] =
    draftStatus === "in_progress"
      ? [{ href: "#draft", label: "Draft" }]
      : draftStatus === "complete"
      ? [
          { href: "#roster", label: "My Team / Roster" },
          { href: "#free-agents", label: "Free Agents" },
          { href: "#waivers", label: "Waivers" },
          { href: "#trades", label: "Trades" },
          { href: "#standings", label: "Standings" },
          { href: "#matchups", label: "Matchups" },
        ]
      : [];
  if (items.length === 0) return null;
  return (
    <nav className="disc-nav" aria-label="Fantasy league sections">
      {items.map((it) => <a key={it.href} href={it.href}>{it.label}</a>)}
    </nav>
  );
}

async function FantasyDraftBoard({ league, leagueId, pos }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; pos: string }) {
  const [available] = await Promise.all([getAvailablePlayers(leagueId)]);
  const onClockTeam = league.teams.find((t) => t.id === league.onTheClockTeamId);
  const myTurn = league.onTheClockTeamId === league.myTeamId;
  const { round, pickInRound } = draftPickLabel(league.draftPickIndex, league.teams.length);
  const filtered = available.filter((p) => p.position === pos).slice(0, 100);

  return (
    <div className="disc-section" id="draft">
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
            <PlayerAvatar photoUrl={p.photoUrl} number={p.number} name={p.name} size="sm" />
            <div className="disc-chart__song"><b>{p.name}</b><span>{p.position} · {p.team ?? "Free Agent"}</span></div>
            {myTurn ? (
              <form action={draftPlayerAction}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="playerId" value={p.playerId} />
                <SubmitButton className="btn btn--sm" pendingLabel="Drafting…">Draft</SubmitButton>
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
      <div className="disc-section" id="matchups">
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
              <SubmitButton className="btn btn--sm" pendingLabel="Syncing…">Sync This Week&apos;s Scores</SubmitButton>
            </form>
          </>
        )}
      </div>

      <div className="disc-section" id="standings">
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

async function FantasyPlayoffs({ league, leagueId, accountId }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; accountId: string }) {
  if (league.playoffStatus === "not_started") {
    const picture = await getFantasyPlayoffPicture(accountId, leagueId);
    return (
      <div className="disc-section">
        <div className="disc-section__head"><h2>Playoff Picture</h2></div>
        <p className="disc-empty" style={{ marginTop: 0 }}>IF THE PLAYOFFS STARTED TODAY — top {league.playoffTeams} teams make it. Projected, not official, until the regular season ends.</p>
        {!picture || picture.entries.length === 0 ? (
          <p className="disc-empty">No games played yet this season.</p>
        ) : (
          <div className="disc-chart">
            {picture.entries.map((e, i) => (
              <div className="disc-chart__row" key={e.teamId}>
                <div className="disc-chart__song">
                  <b>#{e.rank} {e.isMe ? "You" : e.teamName}</b>
                  <span>{e.wins}-{e.losses}{e.ties ? `-${e.ties}` : ""} · {e.pointsFor.toFixed(1)} PF{i < league.playoffTeams ? " · In the playoff field" : " · On the outside"}</span>
                </div>
                <span className="disc-badge">{e.clinched ? "CLINCHED" : e.eliminated ? "ELIMINATED" : "PROJECTED"}</span>
              </div>
            ))}
          </div>
        )}
        {league.isCommissioner && (
          <form action={seedFantasyPlayoffsAction} style={{ marginTop: ".8rem" }}>
            <input type="hidden" name="leagueId" value={leagueId} />
            <SubmitButton className="btn btn--sm" pendingLabel="Seeding…">Seed Playoffs (once week {league.regularSeasonWeeks} is final)</SubmitButton>
          </form>
        )}
      </div>
    );
  }

  const bracket = await getFantasyPlayoffBracket(accountId, leagueId);
  if (!bracket) return null;
  const rounds = [...new Set(bracket.games.map((g) => g.round))].sort((a, b) => a - b);
  const championName = bracket.champion ? bracket.games.find((g) => g.winnerId === bracket.champion)?.winnerName : null;

  return (
    <div className="disc-section">
      <div className="disc-section__head"><h2>Playoff Bracket</h2></div>
      {championName && <p className="disc-badge" style={{ marginBottom: "1rem" }}>🏆 Season Champion: {championName}</p>}
      {rounds.map((round) => (
        <div key={round} style={{ marginBottom: "1rem" }}>
          <h3>{round === rounds[rounds.length - 1] ? "Championship" : `Round ${round}`}</h3>
          <div className="disc-chart">
            {bracket.games.filter((g) => g.round === round).map((g) => (
              <div className="disc-chart__row" key={g.id}>
                <div className="disc-chart__song">
                  <b>{g.teamAName ?? "TBD"} vs {g.teamBName ?? "TBD"}</b>
                  <span>{g.final ? `Final — winner: ${g.winnerName}` : "In progress"}</span>
                </div>
                <span className="disc-badge">{g.teamAScore.toFixed(2)} – {g.teamBScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {league.isCommissioner && league.playoffStatus === "in_progress" && (
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
          {rounds.map((round) => (
            <form action={syncFantasyPlayoffRoundAction} key={round}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="round" value={round} />
              <SubmitButton className="btn btn--sm" pendingLabel="Syncing…">Sync Round {round}</SubmitButton>
            </form>
          ))}
        </div>
      )}
    </div>
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
    <div className="disc-section" id="roster">
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
              {p && <PlayerAvatar photoUrl={p.photoUrl} name={p.playerName} size="sm" />}
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
            <PlayerAvatar photoUrl={p.photoUrl} name={p.playerName} size="sm" />
            <div className="disc-chart__song"><b>{p.playerName}</b><span>{p.position}</span></div>
            {isMyTeam && (
              <div style={{ display: "flex", gap: ".4rem" }}>
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
                  <SubmitButton className="btn btn--sm" pendingLabel="Updating…">Start</SubmitButton>
                </form>
                <form action={dropPlayerAction}>
                  <input type="hidden" name="leagueId" value={leagueId} />
                  <input type="hidden" name="teamId" value={roster.teamId} />
                  <input type="hidden" name="playerId" value={p.playerId} />
                  <SubmitButton className="btn btn--sm" pendingLabel="Dropping…">Drop</SubmitButton>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

async function FantasyFreeAgents({ league, leagueId, pos }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; pos: string }) {
  const available = await getAvailablePlayers(leagueId);
  const filtered = available.filter((p) => p.position === pos).slice(0, 60);
  const myTeam = league.teams.find((t) => t.id === league.myTeamId);
  const myRoster = myTeam ? await getFantasyTeamRoster(myTeam.accountId, leagueId, myTeam.id) : null;

  return (
    <div className="disc-section" id="free-agents">
      <div className="disc-section__head"><h2>Free Agents</h2></div>
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {POSITIONS.map((p) => (
          <Link key={p} href={`?pos=${p}`} className="btn btn--sm" aria-current={pos === p}>{p}</Link>
        ))}
      </div>
      <div className="disc-chart">
        {filtered.length === 0 && <p className="disc-empty">No available {pos}s right now.</p>}
        {filtered.map((p) => (
          <div className="disc-chart__row" key={p.playerId}>
            <PlayerAvatar photoUrl={p.photoUrl} number={p.number} name={p.name} size="sm" />
            <div className="disc-chart__song"><b>{p.name}</b><span>{p.position} · {p.team ?? "Free Agent"}</span></div>
            {league.myTeamId && (
              <form action={submitWaiverClaimAction} style={{ display: "flex", gap: ".4rem" }}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="teamId" value={league.myTeamId} />
                <input type="hidden" name="addPlayerId" value={p.playerId} />
                {myRoster && myRoster.players.length > 0 && (
                  <select name="dropPlayerId" defaultValue="">
                    <option value="">No drop</option>
                    {myRoster.players.map((r) => (
                      <option key={r.playerId} value={r.playerId}>Drop {r.playerName}</option>
                    ))}
                  </select>
                )}
                <SubmitButton className="btn btn--sm" pendingLabel="Submitting Claim…">Claim</SubmitButton>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

async function FantasyWaivers({ league, leagueId, accountId }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; accountId: string }) {
  const claims = await getWaiverClaims(accountId, leagueId);
  if (!claims) return null;

  return (
    <div className="disc-section" id="waivers">
      <div className="disc-section__head"><h2>Waiver Claims</h2></div>
      {claims.length === 0 ? (
        <p className="disc-empty">No pending waiver claims.</p>
      ) : (
        <div className="disc-chart">
          {claims.map((c) => (
            <div className="disc-chart__row" key={c.id}>
              <PlayerAvatar photoUrl={c.addPhotoUrl} name={c.addPlayerName} size="sm" />
              <div className="disc-chart__song"><b>{c.isMine ? "You" : c.teamName}</b><span>Claiming {c.addPlayerName} · {c.addPosition}</span></div>
              <span className="disc-badge">Pending</span>
            </div>
          ))}
        </div>
      )}
      {league.isCommissioner && claims.length > 0 && (
        <form action={processWaiversAction} style={{ marginTop: ".8rem" }}>
          <input type="hidden" name="leagueId" value={leagueId} />
          <SubmitButton className="btn btn--sm" pendingLabel="Processing…">Process Waivers</SubmitButton>
        </form>
      )}
    </div>
  );
}

async function FantasyTrades({ league, leagueId, accountId }: { league: NonNullable<Awaited<ReturnType<typeof getFantasyLeagueDetail>>>; leagueId: string; accountId: string }) {
  const trades = await getFantasyTrades(accountId, leagueId);
  if (!trades) return null;
  const myTeam = league.teams.find((t) => t.id === league.myTeamId);
  const myRoster = myTeam ? await getFantasyTeamRoster(accountId, leagueId, myTeam.id) : null;
  const partners = myTeam ? league.teams.filter((t) => t.id !== myTeam.id) : [];
  const partnerRosters: Map<string, Awaited<ReturnType<typeof getFantasyTeamRoster>>> = myTeam
    ? new Map(await Promise.all(partners.map(async (t) => [t.id, await getFantasyTeamRoster(accountId, leagueId, t.id)] as const)))
    : new Map();

  return (
    <div className="disc-section" id="trades">
      <div className="disc-section__head"><h2>Trades</h2></div>
      {trades.length === 0 && <p className="disc-empty" style={{ marginTop: 0 }}>No pending trades.</p>}
      <div className="disc-chart">
        {trades.map((t) => (
          <div className="disc-chart__row" key={t.id} style={{ flexWrap: "wrap" }}>
            <div className="disc-chart__song">
              <b>{t.proposerTeamName} ⇄ {t.recipientTeamName}</b>
              <span>{t.proposerPlayers.map((p) => p.playerName).join(", ") || "—"} for {t.recipientPlayers.map((p) => p.playerName).join(", ") || "—"}</span>
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              {t.isForMe && (
                <>
                  <form action={respondToTradeAction}>
                    <input type="hidden" name="leagueId" value={leagueId} />
                    <input type="hidden" name="tradeId" value={t.id} />
                    <input type="hidden" name="accept" value="true" />
                    <SubmitButton className="btn btn--sm" pendingLabel="Accepting…">Accept</SubmitButton>
                  </form>
                  <form action={respondToTradeAction}>
                    <input type="hidden" name="leagueId" value={leagueId} />
                    <input type="hidden" name="tradeId" value={t.id} />
                    <input type="hidden" name="accept" value="false" />
                    <SubmitButton className="btn btn--sm" pendingLabel="Rejecting…">Reject</SubmitButton>
                  </form>
                </>
              )}
              {league.isCommissioner && (
                <form action={vetoTradeAction}>
                  <input type="hidden" name="leagueId" value={leagueId} />
                  <input type="hidden" name="tradeId" value={t.id} />
                  <SubmitButton className="btn btn--sm" pendingLabel="Vetoing…">Veto</SubmitButton>
                </form>
              )}
            </div>
            <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: "1.4rem", marginTop: ".5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                <span style={{ fontSize: ".64rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)" }}>{t.proposerTeamName} gives</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
                  {t.proposerPlayers.length === 0 && <span style={{ fontSize: ".78rem", color: "var(--ink-soft)" }}>—</span>}
                  {t.proposerPlayers.map((p) => (
                    <span key={p.playerId} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", fontSize: ".78rem" }}>
                      <PlayerAvatar photoUrl={p.photoUrl} name={p.playerName} size={22} />{p.playerName}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                <span style={{ fontSize: ".64rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)" }}>{t.recipientTeamName} gives</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
                  {t.recipientPlayers.length === 0 && <span style={{ fontSize: ".78rem", color: "var(--ink-soft)" }}>—</span>}
                  {t.recipientPlayers.map((p) => (
                    <span key={p.playerId} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", fontSize: ".78rem" }}>
                      <PlayerAvatar photoUrl={p.photoUrl} name={p.playerName} size={22} />{p.playerName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {myTeam && myRoster && partners.length > 0 && (
        <div style={{ marginTop: "1.2rem" }}>
          <h3>Propose a Trade</h3>
          {partners.map((partner) => {
            const partnerRoster = partnerRosters.get(partner.id);
            return (
              <form action={proposeTradeAction} key={partner.id} style={{ marginTop: ".8rem", padding: ".8rem", border: "1px solid var(--line)", borderRadius: "10px" }}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="proposerTeamId" value={myTeam.id} />
                <input type="hidden" name="recipientTeamId" value={partner.id} />
                <b>{partner.teamName}</b>
                <div style={{ display: "flex", gap: "1.5rem", marginTop: ".5rem", flexWrap: "wrap" }}>
                  <fieldset style={{ border: "none", padding: 0 }}>
                    <legend style={{ fontSize: ".7rem", textTransform: "uppercase", color: "var(--ink-soft)" }}>You give</legend>
                    {myRoster.players.map((p) => (
                      <label key={p.playerId} style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".82rem", padding: ".15rem 0" }}>
                        <input type="checkbox" name="proposerPlayerIds" value={p.playerId} />
                        <PlayerAvatar photoUrl={p.photoUrl} name={p.playerName} size={22} />
                        {p.playerName} · {p.position}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset style={{ border: "none", padding: 0 }}>
                    <legend style={{ fontSize: ".7rem", textTransform: "uppercase", color: "var(--ink-soft)" }}>You get</legend>
                    {partnerRoster?.players.map((p) => (
                      <label key={p.playerId} style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".82rem", padding: ".15rem 0" }}>
                        <input type="checkbox" name="recipientPlayerIds" value={p.playerId} />
                        <PlayerAvatar photoUrl={p.photoUrl} name={p.playerName} size={22} />
                        {p.playerName} · {p.position}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <SubmitButton className="btn btn--sm" style={{ marginTop: ".6rem" }} pendingLabel="Proposing…">Propose to {partner.teamName}</SubmitButton>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
