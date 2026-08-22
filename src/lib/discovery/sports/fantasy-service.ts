// ── Fantasy Football (SERVER ONLY) ───────────────────────────────────────
// DB access + the real NFL player pool (via SportsDataIO's Players feed,
// the same source Player Search/tracked-players already trust). Draft/
// lineup rules themselves are pure — see fantasy.ts. Every read degrades
// to an empty/null result rather than throwing when the Fantasy* tables
// haven't been schema-pushed yet, same convention as tracked-players.ts.

import { prisma } from "@/lib/db";
import { withCache, cacheKeyFor } from "../cache";
import { fetchAllPlayers, type SdioPlayer } from "../providers/sportsdata";
import {
  STANDARD_LINEUP_SLOTS,
  STANDARD_BENCH_SIZE,
  snakeDraftOrder,
  teamOnTheClock,
  isDraftComplete,
  applyLineupChange,
  generateLeagueInviteCode,
  type RosterPlayer,
} from "./fantasy";

const ROSTER_TTL = 360; // 6h — the same pool tracked-players.ts already caches at this TTL

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

export async function createFantasyLeague(accountId: string, name: string, season: number, teamName: string): Promise<FantasyLeagueSummary> {
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

  await prisma.$transaction([
    prisma.fantasyRosterSlot.create({ data: { teamId: myTeam.id, playerId: player.playerId, playerName: player.name, position: player.position ?? "", lineupSlot: "BENCH" } }),
    prisma.fantasyLeague.update({
      where: { id: leagueId },
      data: {
        currentPickIndex: league.currentPickIndex + 1,
        draftStatus: isDraftComplete(fullSequence, league.currentPickIndex + 1) ? "complete" : "in_progress",
      },
    }),
  ]);
  return { ok: true };
}

export interface FantasyTeamRoster {
  teamId: string;
  teamName: string;
  isMe: boolean;
  players: (RosterPlayer & { playerName: string })[];
}

export async function getFantasyTeamRoster(accountId: string, leagueId: string, teamId: string): Promise<FantasyTeamRoster | null> {
  const team = await prisma.fantasyTeam.findUnique({ where: { id: teamId }, include: { roster: true, league: { select: { teams: { select: { accountId: true } } } } } }).catch(() => null);
  if (!team || !team.league.teams.some((t) => t.accountId === accountId)) return null;
  return {
    teamId: team.id,
    teamName: team.teamName,
    isMe: team.accountId === accountId,
    players: team.roster.map((r) => ({ playerId: r.playerId, playerName: r.playerName, position: r.position, lineupSlot: r.lineupSlot })),
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
