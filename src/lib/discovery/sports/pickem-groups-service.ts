// ── Magical Picks — Pick'em Groups (SERVER ONLY) ─────────────────────────
// DB access for private groups. Ranking itself is pure — see
// pickem-groups.ts — this file only loads real members + their real graded
// SportsPick rows and hands them to buildGroupLeaderboard. Every read
// degrades to an empty result rather than throwing when the PickGroup
// tables haven't been schema-pushed yet, same convention as
// tracked-players.ts.

import { prisma } from "@/lib/db";
import { buildGroupLeaderboard, generateInviteCode, revealGroupPick, type GroupLeaderboardEntry } from "./pickem-groups";
import { isPickLocked } from "./picks";
import type { GradedPick } from "./badges";

export interface PickGroupSummary {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  memberCount: number;
}

/** Every group the account owns or belongs to. */
export async function getMyPickGroups(accountId: string): Promise<PickGroupSummary[]> {
  const rows = await prisma.pickGroup.findMany({
    where: { members: { some: { accountId } } },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    inviteCode: g.inviteCode,
    isOwner: g.ownerAccountId === accountId,
    memberCount: g._count.members,
  }));
}

/** Creates a new group, owner auto-joined as its first member. Retries the
 *  invite code on the rare collision (it's a unique column) rather than
 *  trusting six random characters never repeat across every group ever
 *  created. */
export async function createPickGroup(accountId: string, name: string): Promise<PickGroupSummary> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const group = await prisma.pickGroup.create({
        data: {
          name,
          ownerAccountId: accountId,
          inviteCode,
          members: { create: { accountId } },
        },
      });
      return { id: group.id, name: group.name, inviteCode: group.inviteCode, isOwner: true, memberCount: 1 };
    } catch (err) {
      const isUniqueClash = err instanceof Error && err.message.includes("Unique constraint");
      if (!isUniqueClash || attempt === 4) throw err;
    }
  }
  throw new Error("Could not create group");
}

/** Joins an existing group by its invite code — case/whitespace-insensitive
 *  since a member may retype a code someone read aloud to them. Returns
 *  null when the code doesn't match any real group; a member already in
 *  the group joining again is a harmless no-op. */
export async function joinPickGroupByCode(accountId: string, rawCode: string): Promise<PickGroupSummary | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const group = await prisma.pickGroup.findUnique({ where: { inviteCode: code }, include: { _count: { select: { members: true } } } }).catch(() => null);
  if (!group) return null;
  await prisma.pickGroupMember.upsert({
    where: { groupId_accountId: { groupId: group.id, accountId } },
    create: { groupId: group.id, accountId },
    update: {},
  });
  const memberCount = await prisma.pickGroupMember.count({ where: { groupId: group.id } });
  return { id: group.id, name: group.name, inviteCode: group.inviteCode, isOwner: group.ownerAccountId === accountId, memberCount };
}

/** Removes the account from a group. The owner leaving does not delete the
 *  group or transfer ownership — this codebase has no group-management UI
 *  for that yet, so the group simply keeps its recorded ownerAccountId. */
export async function leavePickGroup(accountId: string, groupId: string): Promise<void> {
  await prisma.pickGroupMember.deleteMany({ where: { groupId, accountId } }).catch(() => null);
}

/** This Week | Season leaderboard for one group — real members ranked by
 *  their own real graded picks. Returns null if the viewer isn't actually a
 *  member (never leaks another group's roster/record). */
export async function getGroupLeaderboard(accountId: string, groupId: string, range: "week" | "season" = "season"): Promise<{ groupName: string; entries: GroupLeaderboardEntry[] } | null> {
  const group = await prisma.pickGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { account: { select: { id: true, firstName: true } } } } },
  }).catch(() => null);
  if (!group) return null;
  if (!group.members.some((m) => m.accountId === accountId)) return null;

  const accountIds = group.members.map((m) => m.accountId);
  const picks = await prisma.sportsPick.findMany({
    where: { accountId: { in: accountIds } },
    select: { accountId: true, gameId: true, isCorrect: true, game: { select: { sport: true, startsAt: true } } },
  });
  const picksByAccount = new Map<string, GradedPick[]>();
  for (const p of picks) {
    const list = picksByAccount.get(p.accountId) ?? [];
    list.push({ gameId: p.gameId, sport: p.game.sport, isCorrect: p.isCorrect, gameStartsAt: p.game.startsAt });
    picksByAccount.set(p.accountId, list);
  }

  const members = group.members.map((m) => ({
    accountId: m.accountId,
    name: m.account.firstName || "Member",
    picks: picksByAccount.get(m.accountId) ?? [],
  }));

  return { groupName: group.name, entries: buildGroupLeaderboard(members, accountId, new Date(), range) };
}

export interface GroupGamePick {
  accountId: string;
  name: string;
  isMe: boolean;
  revealed: boolean;
  hasPicked: boolean;
  teamPick: "home" | "away" | null; // null pre-lock even if hasPicked is true — see revealGroupPick
}

export interface GroupGamePicks {
  groupId: string;
  groupName: string;
  locked: boolean;
  picks: GroupGamePick[];
}

/** Every real Pick'em Group the viewer belongs to, each with that group's
 *  members' picks for one specific game — hidden pre-kickoff (see
 *  revealGroupPick), revealed once the game locks. A group with no
 *  members who picked this game is still included (empty picks list, or
 *  every entry hasPicked:false) so the member can see who in their group
 *  hasn't picked yet. */
export async function getGroupPicksForGame(accountId: string, gameId: string): Promise<GroupGamePicks[]> {
  const game = await prisma.sportsGame.findUnique({ where: { id: gameId } }).catch(() => null);
  if (!game) return [];
  const locked = isPickLocked(game);

  const groups = await prisma.pickGroup.findMany({
    where: { members: { some: { accountId } } },
    include: { members: { include: { account: { select: { id: true, firstName: true } } } } },
  }).catch(() => []);
  if (!groups.length) return [];

  const allMemberIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.accountId)))];
  const picks = await prisma.sportsPick.findMany({ where: { gameId, accountId: { in: allMemberIds } }, select: { accountId: true, teamPick: true } });
  const pickByAccount = new Map(picks.map((p) => [p.accountId, p.teamPick as "home" | "away"]));

  return groups.map((g) => ({
    groupId: g.id,
    groupName: g.name,
    locked,
    picks: g.members.map((m) => {
      const { revealed, teamPick, hasPicked } = revealGroupPick(pickByAccount.get(m.accountId) ?? null, locked);
      return { accountId: m.accountId, name: m.account.firstName || "Member", isMe: m.accountId === accountId, revealed, hasPicked, teamPick };
    }),
  }));
}
