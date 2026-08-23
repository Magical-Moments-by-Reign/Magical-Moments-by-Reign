// ── Fantasy Football (SERVER ONLY) ───────────────────────────────────────
// DB access + the real NFL player pool (via SportsDataIO's Players feed,
// the same source Player Search/tracked-players already trust). Draft/
// lineup rules themselves are pure — see fantasy.ts. Every read degrades
// to an empty/null result rather than throwing when the Fantasy* tables
// haven't been schema-pushed yet, same convention as tracked-players.ts.

import { prisma } from "@/lib/db";
import { withCache, cacheKeyFor } from "../cache";
import {
  fetchAllPlayers,
  fetchPlayerGameStatsByWeek,
  fetchTeamDefenseGameStatsByWeek,
  fetchCurrentNflWeek,
  fetchCurrentNflSeason,
  type SdioPlayer,
} from "../providers/sportsdata";
import {
  STANDARD_LINEUP_SLOTS,
  STANDARD_BENCH_SIZE,
  snakeDraftOrder,
  teamOnTheClock,
  isDraftComplete,
  applyLineupChange,
  generateLeagueInviteCode,
  generateRoundRobinSchedule,
  computeFantasyPoints,
  computeDefensePoints,
  computeFantasyStandings,
  resolveWaiverClaims,
  isValidTradeProposal,
  seedPlayoffBracket,
  advancePlayoffBracket,
  computePlayoffClinchStatus,
  type RosterPlayer,
  type FantasyStandingsEntry,
  type PlayoffBracketGame,
} from "./fantasy";
import { getSdioTeamDirectory } from "./team-identity";

const ROSTER_TTL = 360; // 6h — the same pool tracked-players.ts already caches at this TTL
// Short — this is the same feed a future live-during-games poll (Live
// Game Center integration) will reuse, so it's cached for a real few
// minutes, not the week-long TTLs historical stats get.
const TTL_WEEK_SCORES = 2;
const TTL_CURRENT_WEEK = 60; // 1h — the real current week/season rarely changes mid-hour

// Fantasy skill positions only — a real NFL roster includes OL/DL/LB/etc.
// that no standard fantasy format ever drafts, so the draft pool is
// filtered down before a commissioner or drafter ever sees it.
const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DST", "DEF"]);

async function getFantasyPlayerPool(): Promise<SdioPlayer[]> {
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "sdio_roster", league: "nfl" }), ROSTER_TTL, () => fetchAllPlayers("nfl"));
  const all = cached?.data ?? [];
  return all.filter((p) => p.position && FANTASY_POSITIONS.has(p.position) && p.status !== "Free Agent");
}

export interface FantasyLeagueSummary {
  id: string;
  name: string;
  season: number;
  inviteCode: string;
  isCommissioner: boolean;
  teamCount: number;
  draftStatus: string;
}

export async function getMyFantasyLeagues(accountId: string): Promise<FantasyLeagueSummary[]> {
  const rows = await prisma.fantasyLeague.findMany({
    where: { teams: { some: { accountId } } },
    include: { _count: { select: { teams: true } } },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);
  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    season: l.season,
    inviteCode: l.inviteCode,
    isCommissioner: l.commissionerAccountId === accountId,
    teamCount: l._count.teams,
    draftStatus: l.draftStatus,
  }));
}

export async function createFantasyLeague(accountId: string, name: string, season: number, teamName: string, playoffTeams: number = 4, regularSeasonWeeks: number = 14): Promise<FantasyLeagueSummary> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateLeagueInviteCode();
    try {
      const league = await prisma.fantasyLeague.create({
        data: {
          name,
          season,
          commissionerAccountId: accountId,
          inviteCode,
          rosterSlots: STANDARD_LINEUP_SLOTS,
          benchSize: STANDARD_BENCH_SIZE,
          playoffTeams: Math.min(Math.max(playoffTeams, 2), 8),
          regularSeasonWeeks: Math.min(Math.max(regularSeasonWeeks, 1), 17),
          teams: { create: { accountId, teamName } },
        },
      });
      return { id: league.id, name: league.name, season: league.season, inviteCode: league.inviteCode, isCommissioner: true, teamCount: 1, draftStatus: league.draftStatus };
    } catch (err) {
      const isUniqueClash = err instanceof Error && err.message.includes("Unique constraint");
      if (!isUniqueClash || attempt === 4) throw err;
    }
  }
  throw new Error("Could not create league");
}

export async function joinFantasyLeagueByCode(accountId: string, rawCode: string, teamName: string): Promise<FantasyLeagueSummary | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const league = await prisma.fantasyLeague.findUnique({ where: { inviteCode: code } }).catch(() => null);
  if (!league || league.draftStatus !== "scheduled") return null; // can't join once the draft has started
  await prisma.fantasyTeam.upsert({
    where: { leagueId_accountId: { leagueId: league.id, accountId } },
    create: { leagueId: league.id, accountId, teamName },
    update: {},
  });
  const teamCount = await prisma.fantasyTeam.count({ where: { leagueId: league.id } });
  return { id: league.id, name: league.name, season: league.season, inviteCode: league.inviteCode, isCommissioner: league.commissionerAccountId === accountId, teamCount, draftStatus: league.draftStatus };
}

export interface FantasyLeagueDetail {
  id: string;
  name: string;
  season: number;
  inviteCode: string;
  isCommissioner: boolean;
  rosterSlots: string[];
  draftStatus: string;
  teams: { id: string; teamName: string; accountId: string; isMe: boolean; rosterSize: number }[];
  myTeamId: string | null;
  onTheClockTeamId: string | null;
  draftPickIndex: number;
  totalPicks: number;
  playoffTeams: number;
  regularSeasonWeeks: number;
  playoffStatus: string;
}

export async function getFantasyLeagueDetail(accountId: string, leagueId: string): Promise<FantasyLeagueDetail | null> {
  const league = await prisma.fantasyLeague.findUnique({
    where: { id: leagueId },
    include: { teams: { include: { _count: { select: { roster: true } } } } },
  }).catch(() => null);
  if (!league) return null;
  if (!league.teams.some((t) => t.accountId === accountId)) return null;

  const rosterSlots = Array.isArray(league.rosterSlots) ? (league.rosterSlots as string[]) : STANDARD_LINEUP_SLOTS;
  const totalRounds = rosterSlots.length + league.benchSize;
  const draftOrder = Array.isArray(league.draftOrder) ? (league.draftOrder as string[]) : [];
  const fullSequence = draftOrder.length ? snakeDraftOrder(draftOrder, totalRounds) : [];

  const myTeam = league.teams.find((t) => t.accountId === accountId) ?? null;

  return {
    id: league.id,
    name: league.name,
    season: league.season,
    inviteCode: league.inviteCode,
    isCommissioner: league.commissionerAccountId === accountId,
    rosterSlots,
    draftStatus: league.draftStatus,
    teams: league.teams.map((t) => ({ id: t.id, teamName: t.teamName, accountId: t.accountId, isMe: t.accountId === accountId, rosterSize: t._count.roster })),
    myTeamId: myTeam?.id ?? null,
    onTheClockTeamId: league.draftStatus === "in_progress" ? teamOnTheClock(fullSequence, league.currentPickIndex) : null,
    draftPickIndex: league.currentPickIndex,
    totalPicks: fullSequence.length,
    playoffTeams: league.playoffTeams,
    regularSeasonWeeks: league.regularSeasonWeeks,
    playoffStatus: league.playoffStatus,
  };
}

/** Commissioner starts the draft — locks in a real, freshly-randomized
 *  snake order over the teams that have joined so far. Once started, no
 *  more teams can join (see joinFantasyLeagueByCode's guard). */
export async function startFantasyDraft(accountId: string, leagueId: string): Promise<boolean> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || league.commissionerAccountId !== accountId || league.draftStatus !== "scheduled" || league.teams.length < 2) return false;
  const shuffled = [...league.teams.map((t) => t.id)].sort(() => Math.random() - 0.5);
  await prisma.fantasyLeague.update({ where: { id: leagueId }, data: { draftStatus: "in_progress", draftOrder: shuffled, currentPickIndex: 0 } });
  return true;
}

/** The real, fantasy-eligible NFL players nobody in this league has
 *  drafted yet — the live pool a drafter picks from. */
export async function getAvailablePlayers(leagueId: string): Promise<SdioPlayer[]> {
  const [pool, taken] = await Promise.all([
    getFantasyPlayerPool(),
    prisma.fantasyRosterSlot.findMany({ where: { team: { leagueId } }, select: { playerId: true } }).catch(() => []),
  ]);
  const takenIds = new Set(taken.map((t) => t.playerId));
  return pool.filter((p) => !takenIds.has(p.playerId));
}

/** One pick — validates it's really this account's team's turn before
 *  writing anything, so a stale client can't jump the draft order. */
export async function draftPlayer(accountId: string, leagueId: string, playerId: string): Promise<{ ok: boolean; reason?: string }> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league) return { ok: false, reason: "League not found" };
  if (league.draftStatus !== "in_progress") return { ok: false, reason: "The draft isn't in progress" };

  const rosterSlots = Array.isArray(league.rosterSlots) ? (league.rosterSlots as string[]) : STANDARD_LINEUP_SLOTS;
  const totalRounds = rosterSlots.length + league.benchSize;
  const draftOrder = Array.isArray(league.draftOrder) ? (league.draftOrder as string[]) : [];
  const fullSequence = snakeDraftOrder(draftOrder, totalRounds);
  if (isDraftComplete(fullSequence, league.currentPickIndex)) return { ok: false, reason: "The draft is already complete" };

  const onClockTeamId = teamOnTheClock(fullSequence, league.currentPickIndex);
  const myTeam = league.teams.find((t) => t.accountId === accountId);
  if (!myTeam || myTeam.id !== onClockTeamId) return { ok: false, reason: "It isn't your turn to pick" };

  const alreadyTaken = await prisma.fantasyRosterSlot.findFirst({ where: { team: { leagueId }, playerId } });
  if (alreadyTaken) return { ok: false, reason: "That player has already been drafted in this league" };

  const pool = await getFantasyPlayerPool();
  const player = pool.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, reason: "That player isn't available for this draft" };

  const draftCompletesNow = isDraftComplete(fullSequence, league.currentPickIndex + 1);
  await prisma.$transaction([
    prisma.fantasyRosterSlot.create({ data: { teamId: myTeam.id, playerId: player.playerId, playerName: player.name, position: player.position ?? "", nflTeam: player.team, lineupSlot: "BENCH" } }),
    prisma.fantasyLeague.update({
      where: { id: leagueId },
      data: {
        currentPickIndex: league.currentPickIndex + 1,
        draftStatus: draftCompletesNow ? "complete" : "in_progress",
      },
    }),
  ]);
  if (draftCompletesNow) await scheduleFantasySeason(leagueId);
  return { ok: true };
}

/** Generates the league's real round-robin weekly matchup schedule the
 *  moment the draft finishes — a no-op if a schedule already exists (so a
 *  retry, or draftPlayer somehow being called again, never double-books
 *  the season). */
export async function scheduleFantasySeason(leagueId: string): Promise<void> {
  const existing = await prisma.fantasyMatchup.count({ where: { leagueId } });
  if (existing > 0) return;
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || league.teams.length < 2) return;
  const pairings = generateRoundRobinSchedule(league.teams.map((t) => t.id), league.regularSeasonWeeks);
  if (!pairings.length) return;
  await prisma.$transaction([
    prisma.fantasyMatchup.createMany({
      data: pairings.map((p) => ({ leagueId, week: p.week, homeTeamId: p.homeTeamId, awayTeamId: p.awayTeamId })),
    }),
    // Initial waiver order is the reverse of the real snake draft's round-1
    // order — the team that picked last (presumably weakest draft position)
    // gets first crack at the waiver wire, the standard convention before
    // any real season standings exist to base an order on.
    ...([...(Array.isArray(league.draftOrder) ? (league.draftOrder as string[]) : league.teams.map((t) => t.id))]
      .reverse()
      .map((teamId, i) => prisma.fantasyTeam.update({ where: { id: teamId }, data: { waiverPriority: i } }))),
  ]);
}

export interface FantasyTeamRoster {
  teamId: string;
  teamName: string;
  isMe: boolean;
  players: (RosterPlayer & { playerName: string; photoUrl?: string })[];
}

export async function getFantasyTeamRoster(accountId: string, leagueId: string, teamId: string): Promise<FantasyTeamRoster | null> {
  const team = await prisma.fantasyTeam.findUnique({ where: { id: teamId }, include: { roster: true, league: { select: { teams: { select: { accountId: true } } } } } }).catch(() => null);
  if (!team || !team.league.teams.some((t) => t.accountId === accountId)) return null;
  // The roster row itself doesn't store a photo (no schema change for this)
  // — enrich in memory from the same cached player pool the draft/free
  // agents views already read.
  const photoById = new Map((await getFantasyPlayerPool()).map((p) => [p.playerId, p.photoUrl]));
  return {
    teamId: team.id,
    teamName: team.teamName,
    isMe: team.accountId === accountId,
    players: team.roster.map((r) => ({ playerId: r.playerId, playerName: r.playerName, position: r.position, lineupSlot: r.lineupSlot, photoUrl: photoById.get(r.playerId) })),
  };
}

/** Sets one player's lineup slot for the viewer's own team — swaps with
 *  whoever currently holds that slot (see applyLineupChange). Refuses
 *  silently (returns false) rather than throwing on an illegal
 *  slot/position combination or a team that isn't the viewer's own. */
export async function setLineupSlot(accountId: string, teamId: string, playerId: string, targetSlot: string): Promise<boolean> {
  const team = await prisma.fantasyTeam.findUnique({ where: { id: teamId }, include: { roster: true } }).catch(() => null);
  if (!team || team.accountId !== accountId) return false;
  const roster: RosterPlayer[] = team.roster.map((r) => ({ playerId: r.playerId, position: r.position, lineupSlot: r.lineupSlot }));
  const next = applyLineupChange(roster, playerId, targetSlot);
  if (!next) return false;
  await prisma.$transaction(
    next
      .filter((p, i) => p.lineupSlot !== roster[i].lineupSlot)
      .map((p) => prisma.fantasyRosterSlot.update({ where: { teamId_playerId: { teamId, playerId: p.playerId } }, data: { lineupSlot: p.lineupSlot } }))
  );
  return true;
}

// ── Weekly scoring ───────────────────────────────────────────────────────

/** The real, provider-reported current NFL week/season — cached for an
 *  hour since it only changes a handful of times all year. Falls back to
 *  the league's own season when the provider call fails, and week 1 when
 *  even that isn't resolvable — never a guessed week. */
export async function getCurrentNflWeekAndSeason(fallbackSeason: number): Promise<{ week: number; season: number }> {
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ kind: "nfl_current_week" }), TTL_CURRENT_WEEK, async () => {
    const [week, season] = await Promise.all([fetchCurrentNflWeek(), fetchCurrentNflSeason()]);
    return week != null && season != null ? { week, season } : null;
  });
  return cached?.data ?? { week: 1, season: fallbackSeason };
}

async function getWeekScoreMaps(season: number, week: number): Promise<{ players: Map<string, number>; defense: Map<string, number> }> {
  const cached = await withCache("sports", "sportsdataio", cacheKeyFor({ season, week, kind: "fantasy_week_scores" }), TTL_WEEK_SCORES, async () => {
    const [players, defense] = await Promise.all([fetchPlayerGameStatsByWeek(season, week), fetchTeamDefenseGameStatsByWeek(season, week)]);
    return { players, defense };
  });
  const players = new Map<string, number>();
  for (const p of cached?.data.players ?? []) players.set(p.playerId, computeFantasyPoints(p));
  const defense = new Map<string, number>();
  for (const d of cached?.data.defense ?? []) defense.set(d.team, computeDefensePoints(d));
  return { players, defense };
}

/** Real weekly fantasy score for one team — the sum of every STARTER's
 *  (never bench) real computed points for that week. A DST starter scores
 *  from the real team-defense stats (looked up by the NFL team abbreviation
 *  recorded at draft time), every other position from the real player
 *  stats. A starter with no stat row this week (bye, inactive, no game
 *  yet) simply contributes 0 — never guessed. */
async function computeTeamWeekScore(teamId: string, season: number, week: number): Promise<number> {
  const [roster, { players, defense }] = await Promise.all([
    prisma.fantasyRosterSlot.findMany({ where: { teamId, lineupSlot: { not: "BENCH" } } }),
    getWeekScoreMaps(season, week),
  ]);
  let total = 0;
  for (const r of roster) {
    if (r.position === "DST" || r.position === "DEF") {
      total += r.nflTeam ? defense.get(r.nflTeam) ?? 0 : 0;
    } else {
      total += players.get(r.playerId) ?? 0;
    }
  }
  return Math.round(total * 100) / 100;
}

/** Recomputes every matchup's real score for one week from real player/
 *  defense stats, and marks a matchup final once every starter on both
 *  sides either has a completed game (IsGameOver) or simply has no stat
 *  row at all this week (bye/inactive — nothing left to wait for). Safe
 *  to call repeatedly (e.g. on a poll or a page load during the week) —
 *  it only ever overwrites with the current real computed total. */
export async function syncFantasyWeekScores(leagueId: string, week: number): Promise<void> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId } }).catch(() => null);
  if (!league) return;
  const matchups = await prisma.fantasyMatchup.findMany({ where: { leagueId, week } });
  if (!matchups.length) return;

  const [{ players }, allRosters] = await Promise.all([
    getWeekScoreMaps(league.season, week),
    prisma.fantasyRosterSlot.findMany({ where: { team: { leagueId }, lineupSlot: { not: "BENCH" } } }),
  ]);
  const gameStatus = await fetchPlayerGameStatsByWeek(league.season, week).catch(() => []);
  const isGameOverByPlayer = new Map(gameStatus.map((p) => [p.playerId, p.isGameOver]));
  const hasStatRow = new Set(players.keys());
  const rostersByTeam = new Map<string, typeof allRosters>();
  for (const r of allRosters) rostersByTeam.set(r.teamId, [...(rostersByTeam.get(r.teamId) ?? []), r]);

  await Promise.all(matchups.map(async (m) => {
    const [homeScore, awayScore] = await Promise.all([
      computeTeamWeekScore(m.homeTeamId, league.season, week),
      computeTeamWeekScore(m.awayTeamId, league.season, week),
    ]);
    const starters = [...(rostersByTeam.get(m.homeTeamId) ?? []), ...(rostersByTeam.get(m.awayTeamId) ?? [])];
    const final = starters.every((r) => !hasStatRow.has(r.playerId) || isGameOverByPlayer.get(r.playerId) === true);
    await prisma.fantasyMatchup.update({ where: { id: m.id }, data: { homeScore, awayScore, final } });
  }));
}

export interface FantasyMatchupView {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  final: boolean;
}

export async function getFantasyMatchupsForWeek(accountId: string, leagueId: string, week: number): Promise<FantasyMatchupView[] | null> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || !league.teams.some((t) => t.accountId === accountId)) return null;
  const nameById = new Map(league.teams.map((t) => [t.id, t.teamName]));
  const matchups = await prisma.fantasyMatchup.findMany({ where: { leagueId, week }, orderBy: { id: "asc" } });
  return matchups.map((m) => ({
    id: m.id,
    homeTeamId: m.homeTeamId,
    homeTeamName: nameById.get(m.homeTeamId) ?? "Team",
    awayTeamId: m.awayTeamId,
    awayTeamName: nameById.get(m.awayTeamId) ?? "Team",
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    final: m.final,
  }));
}

export interface FantasyStandingsView {
  entries: (FantasyStandingsEntry & { teamName: string; isMe: boolean })[];
}

export async function getFantasyStandings(accountId: string, leagueId: string): Promise<FantasyStandingsView | null> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || !league.teams.some((t) => t.accountId === accountId)) return null;
  const matchups = await prisma.fantasyMatchup.findMany({ where: { leagueId } });
  const entries = computeFantasyStandings(
    league.teams.map((t) => t.id),
    matchups.map((m) => ({ week: m.week, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, homeScore: m.homeScore, awayScore: m.awayScore, final: m.final }))
  );
  const nameById = new Map(league.teams.map((t) => [t.id, t.teamName]));
  const accountByTeam = new Map(league.teams.map((t) => [t.id, t.accountId]));
  return {
    entries: entries.map((e) => ({ ...e, teamName: nameById.get(e.teamId) ?? "Team", isMe: accountByTeam.get(e.teamId) === accountId })),
  };
}

// ── Live Game Center integration ─────────────────────────────────────────

export interface MyFantasyPlayerInGame {
  playerId: string;
  playerName: string;
  position: string;
  points: number;
  leagueId: string;
  leagueName: string;
  fantasyTeamId: string;
  fantasyTeamName: string;
  isStarter: boolean;
}

/** Every player on any of the viewer's fantasy rosters, across every
 *  league, who's part of THIS specific real NFL game — with their real
 *  current-week fantasy points. Resolves the game's real API-Sports team
 *  names to SportsDataIO's short team key via the cross-provider Team
 *  Identity Resolver (the same bridge rosters/injuries already use) —
 *  never a raw string comparison of "Buffalo Bills" against "BUF". Returns
 *  [] when the viewer has no fantasy rosters, this isn't an NFL game, or
 *  neither team resolves. */
export async function getMyFantasyPlayersInGame(accountId: string, homeTeamName: string, awayTeamName: string, season: number): Promise<MyFantasyPlayerInGame[]> {
  const directory = await getSdioTeamDirectory("nfl");
  if (!directory.length) return [];
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const keyFor = (name: string) => directory.find((t) => normalize(t.fullName) === normalize(name))?.key;
  const homeKey = keyFor(homeTeamName);
  const awayKey = keyFor(awayTeamName);
  if (!homeKey && !awayKey) return [];
  const gameTeams = [homeKey, awayKey].filter((k): k is string => Boolean(k));

  const rosterSlots = await prisma.fantasyRosterSlot.findMany({
    where: { nflTeam: { in: gameTeams }, team: { accountId } },
    include: { team: { include: { league: true } } },
  });
  if (!rosterSlots.length) return [];

  const { week } = await getCurrentNflWeekAndSeason(season);
  const { players, defense } = await getWeekScoreMaps(season, week);

  return rosterSlots.map((r) => ({
    playerId: r.playerId,
    playerName: r.playerName,
    position: r.position,
    points: r.position === "DST" || r.position === "DEF" ? (r.nflTeam ? defense.get(r.nflTeam) ?? 0 : 0) : players.get(r.playerId) ?? 0,
    leagueId: r.team.leagueId,
    leagueName: r.team.league.name,
    fantasyTeamId: r.teamId,
    fantasyTeamName: r.team.teamName,
    isStarter: r.lineupSlot !== "BENCH",
  }));
}

// ── Free agents / drop / waivers ─────────────────────────────────────────

/** Drops a rostered player immediately — the vacated roster spot is open,
 *  and the player becomes available again (waiver claim or, once no claim
 *  contests them, a future direct add — this codebase routes every
 *  addition through a waiver claim rather than a separate instant-add
 *  path, so an uncontested claim just wins on the very next processing
 *  pass). Refuses (returns false) for a team that isn't the caller's own. */
export async function dropPlayer(accountId: string, teamId: string, playerId: string): Promise<boolean> {
  const team = await prisma.fantasyTeam.findUnique({ where: { id: teamId } }).catch(() => null);
  if (!team || team.accountId !== accountId) return false;
  const deleted = await prisma.fantasyRosterSlot.deleteMany({ where: { teamId, playerId } });
  return deleted.count > 0;
}

export interface WaiverClaimView {
  id: string;
  teamId: string;
  teamName: string;
  addPlayerId: string;
  addPlayerName: string;
  addPosition: string;
  addPhotoUrl?: string;
  dropPlayerId: string | null;
  status: string;
  isMine: boolean;
}

/** Submits a waiver claim on a real available (not currently rostered)
 *  player — every addition goes through this, whether or not another team
 *  is also likely to want the same player, so there's exactly one
 *  mechanism rather than a separate "instant free agent" path that could
 *  race a claim on the same player. `dropPlayerId` is required only when
 *  the roster is already full. */
export async function submitWaiverClaim(accountId: string, teamId: string, addPlayerId: string, dropPlayerId?: string): Promise<{ ok: boolean; reason?: string }> {
  const team = await prisma.fantasyTeam.findUnique({ where: { id: teamId }, include: { league: true, roster: true } }).catch(() => null);
  if (!team || team.accountId !== accountId) return { ok: false, reason: "Not your team" };
  const alreadyTaken = await prisma.fantasyRosterSlot.findFirst({ where: { team: { leagueId: team.leagueId }, playerId: addPlayerId } });
  if (alreadyTaken) return { ok: false, reason: "That player is already rostered in this league" };
  const rosterSlots = Array.isArray(team.league.rosterSlots) ? (team.league.rosterSlots as string[]) : STANDARD_LINEUP_SLOTS;
  const capacity = rosterSlots.length + team.league.benchSize;
  if (team.roster.length >= capacity && !dropPlayerId) return { ok: false, reason: "Your roster is full — choose a player to drop" };
  if (dropPlayerId && !team.roster.some((r) => r.playerId === dropPlayerId)) return { ok: false, reason: "You don't roster that player" };

  const pool = await getFantasyPlayerPool();
  const player = pool.find((p) => p.playerId === addPlayerId);
  if (!player) return { ok: false, reason: "That player isn't a real available player" };

  await prisma.fantasyWaiverClaim.create({
    data: { leagueId: team.leagueId, teamId, addPlayerId, addPlayerName: player.name, addPosition: player.position ?? "", addNflTeam: player.team, dropPlayerId },
  });
  return { ok: true };
}

export async function getWaiverClaims(accountId: string, leagueId: string): Promise<WaiverClaimView[] | null> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || !league.teams.some((t) => t.accountId === accountId)) return null;
  const [claims, photoById] = await Promise.all([
    prisma.fantasyWaiverClaim.findMany({ where: { leagueId, status: "pending" }, include: { team: true }, orderBy: { createdAt: "asc" } }),
    getFantasyPlayerPool().then((pool) => new Map(pool.map((p) => [p.playerId, p.photoUrl]))),
  ]);
  return claims.map((c) => ({
    id: c.id,
    teamId: c.teamId,
    teamName: c.team.teamName,
    addPlayerId: c.addPlayerId,
    addPlayerName: c.addPlayerName,
    addPosition: c.addPosition,
    addPhotoUrl: photoById.get(c.addPlayerId),
    dropPlayerId: c.dropPlayerId,
    status: c.status,
    isMine: c.team.accountId === accountId,
  }));
}

/** Commissioner-triggered — resolves every pending claim in the league in
 *  one real reverse-priority pass (resolveWaiverClaims), applies each
 *  winning claim to the real roster (dropping the named player first when
 *  one was offered), and persists the new priority order so a team that
 *  just won moves to the back for next time. */
export async function processWaivers(accountId: string, leagueId: string): Promise<{ ok: boolean; reason?: string; processed?: number }> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league) return { ok: false, reason: "League not found" };
  if (league.commissionerAccountId !== accountId) return { ok: false, reason: "Only the commissioner can process waivers" };

  const claims = await prisma.fantasyWaiverClaim.findMany({ where: { leagueId, status: "pending" } });
  if (!claims.length) return { ok: true, processed: 0 };

  const order = [...league.teams].sort((a, b) => a.waiverPriority - b.waiverPriority).map((t) => t.id);
  const resolution = resolveWaiverClaims(order, claims.map((c) => ({ id: c.id, teamId: c.teamId, playerId: c.addPlayerId })));
  const byId = new Map(claims.map((c) => [c.id, c]));

  const ops = [];
  for (const claimId of resolution.wonClaimIds) {
    const claim = byId.get(claimId)!;
    if (claim.dropPlayerId) ops.push(prisma.fantasyRosterSlot.deleteMany({ where: { teamId: claim.teamId, playerId: claim.dropPlayerId } }));
    ops.push(prisma.fantasyRosterSlot.create({ data: { teamId: claim.teamId, playerId: claim.addPlayerId, playerName: claim.addPlayerName, position: claim.addPosition, nflTeam: claim.addNflTeam, lineupSlot: "BENCH" } }));
    ops.push(prisma.fantasyWaiverClaim.update({ where: { id: claimId }, data: { status: "won", resolvedAt: new Date() } }));
  }
  for (const claimId of resolution.lostClaimIds) {
    ops.push(prisma.fantasyWaiverClaim.update({ where: { id: claimId }, data: { status: "lost", resolvedAt: new Date() } }));
  }
  for (let i = 0; i < resolution.newPriorityOrder.length; i++) {
    ops.push(prisma.fantasyTeam.update({ where: { id: resolution.newPriorityOrder[i] }, data: { waiverPriority: i } }));
  }
  await prisma.$transaction(ops);
  return { ok: true, processed: resolution.wonClaimIds.length + resolution.lostClaimIds.length };
}

// ── Trades ───────────────────────────────────────────────────────────────

export interface FantasyTradePlayer {
  playerId: string;
  playerName: string;
  photoUrl?: string;
}

export interface FantasyTradeView {
  id: string;
  proposerTeamId: string;
  proposerTeamName: string;
  recipientTeamId: string;
  recipientTeamName: string;
  proposerPlayers: FantasyTradePlayer[];
  recipientPlayers: FantasyTradePlayer[];
  status: string;
  isMyOffer: boolean;
  isForMe: boolean;
}

/** Proposes a trade — validated against each side's real current roster
 *  (isValidTradeProposal) before anything is written. Neither side's
 *  roster changes until the recipient accepts. */
export async function proposeTrade(accountId: string, leagueId: string, proposerTeamId: string, recipientTeamId: string, proposerPlayerIds: string[], recipientPlayerIds: string[]): Promise<{ ok: boolean; reason?: string }> {
  const [proposerTeam, recipientTeam] = await Promise.all([
    prisma.fantasyTeam.findUnique({ where: { id: proposerTeamId }, include: { roster: true } }),
    prisma.fantasyTeam.findUnique({ where: { id: recipientTeamId }, include: { roster: true } }),
  ]);
  if (!proposerTeam || proposerTeam.accountId !== accountId) return { ok: false, reason: "Not your team" };
  if (!recipientTeam || recipientTeam.leagueId !== leagueId || proposerTeam.leagueId !== leagueId) return { ok: false, reason: "Invalid trade partner" };
  const valid = isValidTradeProposal(proposerTeam.roster.map((r) => r.playerId), recipientTeam.roster.map((r) => r.playerId), proposerPlayerIds, recipientPlayerIds);
  if (!valid) return { ok: false, reason: "Trade offer isn't valid — check that both sides actually roster the players offered" };

  await prisma.fantasyTrade.create({
    data: { leagueId, proposerTeamId, recipientTeamId, proposerPlayerIds, recipientPlayerIds },
  });
  return { ok: true };
}

export async function getFantasyTrades(accountId: string, leagueId: string): Promise<FantasyTradeView[] | null> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || !league.teams.some((t) => t.accountId === accountId)) return null;
  const [trades, photoById] = await Promise.all([
    prisma.fantasyTrade.findMany({ where: { leagueId, status: "pending" }, include: { proposerTeam: { include: { roster: true } }, recipientTeam: { include: { roster: true } } }, orderBy: { createdAt: "desc" } }),
    getFantasyPlayerPool().then((pool) => new Map(pool.map((p) => [p.playerId, p.photoUrl]))),
  ]);
  const playersFor = (roster: { playerId: string; playerName: string }[], ids: unknown): FantasyTradePlayer[] =>
    (Array.isArray(ids) ? (ids as string[]) : []).map((id) => ({
      playerId: id,
      playerName: roster.find((r) => r.playerId === id)?.playerName ?? id,
      photoUrl: photoById.get(id),
    }));
  return trades.map((t) => ({
    id: t.id,
    proposerTeamId: t.proposerTeamId,
    proposerTeamName: t.proposerTeam.teamName,
    recipientTeamId: t.recipientTeamId,
    recipientTeamName: t.recipientTeam.teamName,
    proposerPlayers: playersFor(t.proposerTeam.roster, t.proposerPlayerIds),
    recipientPlayers: playersFor(t.recipientTeam.roster, t.recipientPlayerIds),
    status: t.status,
    isMyOffer: t.proposerTeam.accountId === accountId,
    isForMe: t.recipientTeam.accountId === accountId,
  }));
}

/** Only the recipient team's own owner may accept/reject their trade.
 *  Re-validates both rosters at accept time (isValidTradeProposal) in case
 *  either side traded, dropped, or lost a named player to waivers since
 *  the trade was proposed — never executes a trade against a stale
 *  roster snapshot. Both traded players land on the receiving team's
 *  BENCH, never silently inserted into a starting slot. */
export async function respondToTrade(accountId: string, tradeId: string, accept: boolean): Promise<{ ok: boolean; reason?: string }> {
  const trade = await prisma.fantasyTrade.findUnique({
    where: { id: tradeId },
    include: { proposerTeam: { include: { roster: true } }, recipientTeam: { include: { roster: true } } },
  }).catch(() => null);
  if (!trade || trade.status !== "pending") return { ok: false, reason: "Trade not found or already resolved" };
  if (trade.recipientTeam.accountId !== accountId) return { ok: false, reason: "Only the receiving team can respond to this trade" };

  if (!accept) {
    await prisma.fantasyTrade.update({ where: { id: tradeId }, data: { status: "rejected", resolvedAt: new Date() } });
    return { ok: true };
  }

  const proposerIds = Array.isArray(trade.proposerPlayerIds) ? (trade.proposerPlayerIds as string[]) : [];
  const recipientIds = Array.isArray(trade.recipientPlayerIds) ? (trade.recipientPlayerIds as string[]) : [];
  const stillValid = isValidTradeProposal(trade.proposerTeam.roster.map((r) => r.playerId), trade.recipientTeam.roster.map((r) => r.playerId), proposerIds, recipientIds);
  if (!stillValid) {
    await prisma.fantasyTrade.update({ where: { id: tradeId }, data: { status: "cancelled", resolvedAt: new Date() } });
    return { ok: false, reason: "This trade is no longer valid — a player's roster status changed since it was proposed" };
  }

  await prisma.$transaction([
    ...proposerIds.map((playerId) => prisma.fantasyRosterSlot.update({ where: { teamId_playerId: { teamId: trade.proposerTeamId, playerId } }, data: { teamId: trade.recipientTeamId, lineupSlot: "BENCH" } })),
    ...recipientIds.map((playerId) => prisma.fantasyRosterSlot.update({ where: { teamId_playerId: { teamId: trade.recipientTeamId, playerId } }, data: { teamId: trade.proposerTeamId, lineupSlot: "BENCH" } })),
    prisma.fantasyTrade.update({ where: { id: tradeId }, data: { status: "accepted", resolvedAt: new Date() } }),
  ]);
  return { ok: true };
}

/** Commissioner-only veto of a pending trade — the one commissioner
 *  control this phase adds; league-settings editing and mid-season team
 *  removal are follow-up work. */
export async function vetoTrade(accountId: string, tradeId: string): Promise<boolean> {
  const trade = await prisma.fantasyTrade.findUnique({ where: { id: tradeId }, include: { league: true } }).catch(() => null);
  if (!trade || trade.status !== "pending" || trade.league.commissionerAccountId !== accountId) return false;
  await prisma.fantasyTrade.update({ where: { id: tradeId }, data: { status: "vetoed", resolvedAt: new Date() } });
  return true;
}

// ── Playoffs ─────────────────────────────────────────────────────────────

export interface FantasyPlayoffPictureEntry extends FantasyStandingsEntry {
  teamName: string;
  isMe: boolean;
  clinched: boolean;
  eliminated: boolean;
}

/** The real "IF THE PLAYOFFS STARTED TODAY" picture during the regular
 *  season — current standings plus real, verified clinch/elimination math
 *  (computePlayoffClinchStatus) from each team's actual remaining
 *  regular-season games. Returns null once the playoffs have already
 *  started (the real bracket is the source of truth then, not a
 *  projection). */
export async function getFantasyPlayoffPicture(accountId: string, leagueId: string): Promise<{ entries: FantasyPlayoffPictureEntry[]; playoffTeams: number } | null> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || !league.teams.some((t) => t.accountId === accountId)) return null;
  if (league.playoffStatus !== "not_started") return null;

  const matchups = await prisma.fantasyMatchup.findMany({ where: { leagueId, week: { lte: league.regularSeasonWeeks } } });
  const standings = computeFantasyStandings(
    league.teams.map((t) => t.id),
    matchups.map((m) => ({ week: m.week, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, homeScore: m.homeScore, awayScore: m.awayScore, final: m.final }))
  );
  const remainingByTeam = new Map<string, number>();
  for (const t of league.teams) {
    const remaining = matchups.filter((m) => !m.final && (m.homeTeamId === t.id || m.awayTeamId === t.id)).length;
    remainingByTeam.set(t.id, remaining);
  }
  const clinchStatus = new Map(computePlayoffClinchStatus(standings, remainingByTeam, league.playoffTeams).map((c) => [c.teamId, c]));
  const nameById = new Map(league.teams.map((t) => [t.id, t.teamName]));
  const accountByTeam = new Map(league.teams.map((t) => [t.id, t.accountId]));

  return {
    playoffTeams: league.playoffTeams,
    entries: standings.map((s) => ({
      ...s,
      teamName: nameById.get(s.teamId) ?? "Team",
      isMe: accountByTeam.get(s.teamId) === accountId,
      clinched: clinchStatus.get(s.teamId)?.clinched ?? false,
      eliminated: clinchStatus.get(s.teamId)?.eliminated ?? false,
    })),
  };
}

/** Commissioner-triggered — seeds the real single-elimination bracket from
 *  final regular-season standings once every regular-season week has been
 *  synced final. Refuses if the regular season isn't actually complete yet
 *  or the bracket has already been seeded (never reseeds over live
 *  results). */
export async function seedFantasyPlayoffs(accountId: string, leagueId: string): Promise<{ ok: boolean; reason?: string }> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league) return { ok: false, reason: "League not found" };
  if (league.commissionerAccountId !== accountId) return { ok: false, reason: "Only the commissioner can seed the playoffs" };
  if (league.playoffStatus !== "not_started") return { ok: false, reason: "Playoffs already seeded" };

  const regularSeasonMatchups = await prisma.fantasyMatchup.findMany({ where: { leagueId, week: { lte: league.regularSeasonWeeks } } });
  if (regularSeasonMatchups.some((m) => !m.final)) return { ok: false, reason: "Not every regular-season week is final yet" };

  const standings = computeFantasyStandings(
    league.teams.map((t) => t.id),
    regularSeasonMatchups.map((m) => ({ week: m.week, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, homeScore: m.homeScore, awayScore: m.awayScore, final: m.final }))
  );
  const games = seedPlayoffBracket(standings, league.playoffTeams);

  await prisma.$transaction([
    prisma.fantasyPlayoffGame.createMany({
      data: games.map((g) => ({ leagueId, round: g.round, slot: g.slot, teamAId: g.teamAId, teamBId: g.teamBId, winnerId: g.winnerId, final: g.winnerId !== null })),
    }),
    prisma.fantasyLeague.update({ where: { id: leagueId }, data: { playoffStatus: "in_progress" } }),
  ]);
  return { ok: true };
}

export interface FantasyPlayoffGameView {
  id: string;
  round: number;
  slot: number;
  teamAId: string | null;
  teamAName: string | null;
  teamBId: string | null;
  teamBName: string | null;
  teamAScore: number;
  teamBScore: number;
  winnerId: string | null;
  winnerName: string | null;
  final: boolean;
}

export async function getFantasyPlayoffBracket(accountId: string, leagueId: string): Promise<{ games: FantasyPlayoffGameView[]; champion: string | null } | null> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId }, include: { teams: true } }).catch(() => null);
  if (!league || !league.teams.some((t) => t.accountId === accountId)) return null;
  if (league.playoffStatus === "not_started") return null;

  const games = await prisma.fantasyPlayoffGame.findMany({ where: { leagueId }, orderBy: [{ round: "asc" }, { slot: "asc" }] });
  const nameById = new Map(league.teams.map((t) => [t.id, t.teamName]));
  const maxRound = games.reduce((m, g) => Math.max(m, g.round), 1);
  const finalGame = games.find((g) => g.round === maxRound);

  return {
    games: games.map((g) => ({
      id: g.id,
      round: g.round,
      slot: g.slot,
      teamAId: g.teamAId,
      teamAName: g.teamAId ? nameById.get(g.teamAId) ?? "Team" : null,
      teamBId: g.teamBId,
      teamBName: g.teamBId ? nameById.get(g.teamBId) ?? "Team" : null,
      teamAScore: g.teamAScore,
      teamBScore: g.teamBScore,
      winnerId: g.winnerId,
      winnerName: g.winnerId ? nameById.get(g.winnerId) ?? "Team" : null,
      final: g.final,
    })),
    champion: finalGame?.final ? finalGame.winnerId ?? null : null,
  };
}

/** Commissioner-triggered — recomputes every real, decided playoff game's
 *  score for one round from real weekly stats (the same computeTeamWeekScore
 *  every regular-season sync uses, at week = regularSeasonWeeks + round),
 *  marks a game final once both teams' games are over, records the real
 *  winner, and propagates it into the next round via advancePlayoffBracket. */
export async function syncFantasyPlayoffRound(accountId: string, leagueId: string, round: number): Promise<{ ok: boolean; reason?: string }> {
  const league = await prisma.fantasyLeague.findUnique({ where: { id: leagueId } }).catch(() => null);
  if (!league) return { ok: false, reason: "League not found" };
  if (league.playoffStatus === "not_started") return { ok: false, reason: "Playoffs haven't been seeded yet" };

  const week = league.regularSeasonWeeks + round;
  const roundGames = await prisma.fantasyPlayoffGame.findMany({ where: { leagueId, round } });
  const gameStatus = await fetchPlayerGameStatsByWeek(league.season, week).catch(() => []);
  const isGameOverByPlayer = new Map(gameStatus.map((p) => [p.playerId, p.isGameOver]));
  const hasStatRow = new Set(gameStatus.map((p) => p.playerId));

  const allStarters = await prisma.fantasyRosterSlot.findMany({ where: { team: { leagueId }, lineupSlot: { not: "BENCH" } } });
  const startersByTeam = new Map<string, typeof allStarters>();
  for (const r of allStarters) startersByTeam.set(r.teamId, [...(startersByTeam.get(r.teamId) ?? []), r]);

  for (const g of roundGames) {
    if (g.final || !g.teamAId || !g.teamBId) continue; // already decided, or still waiting on a prior round (real TBD)
    const [teamAScore, teamBScore] = await Promise.all([
      computeTeamWeekScore(g.teamAId, league.season, week),
      computeTeamWeekScore(g.teamBId, league.season, week),
    ]);
    const starters = [...(startersByTeam.get(g.teamAId) ?? []), ...(startersByTeam.get(g.teamBId) ?? [])];
    const final = starters.every((r) => !hasStatRow.has(r.playerId) || isGameOverByPlayer.get(r.playerId) === true);
    const winnerId = final ? (teamAScore === teamBScore ? null : teamAScore > teamBScore ? g.teamAId : g.teamBId) : null;
    await prisma.fantasyPlayoffGame.update({ where: { id: g.id }, data: { teamAScore, teamBScore, final, winnerId: winnerId ?? g.winnerId } });
  }

  // Propagate any newly-decided winners into the next round's TBD slots.
  const allGames = await prisma.fantasyPlayoffGame.findMany({ where: { leagueId } });
  const advanced = advancePlayoffBracket(allGames.map((g) => ({ round: g.round, slot: g.slot, teamAId: g.teamAId, teamBId: g.teamBId, winnerId: g.winnerId })));
  await prisma.$transaction(
    advanced
      .filter((g) => {
        const original = allGames.find((o) => o.round === g.round && o.slot === g.slot)!;
        return original.teamAId !== g.teamAId || original.teamBId !== g.teamBId;
      })
      .map((g) => prisma.fantasyPlayoffGame.updateMany({ where: { leagueId, round: g.round, slot: g.slot }, data: { teamAId: g.teamAId, teamBId: g.teamBId } }))
  );

  const maxRound = allGames.reduce((m, g) => Math.max(m, g.round), 1);
  const finalGame = await prisma.fantasyPlayoffGame.findFirst({ where: { leagueId, round: maxRound } });
  if (finalGame?.final) await prisma.fantasyLeague.update({ where: { id: leagueId }, data: { playoffStatus: "complete" } });

  return { ok: true };
}
