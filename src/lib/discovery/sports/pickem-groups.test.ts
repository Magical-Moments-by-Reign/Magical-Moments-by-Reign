import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGroupLeaderboard, generateInviteCode, weeklyChampion, revealGroupPick, type PickGroupMemberInput } from "./pickem-groups";
import type { GradedPick } from "./badges";

function pick(sport: string, isCorrect: boolean | null, daysAgo: number): GradedPick {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { gameId: `g-${daysAgo}-${Math.random()}`, sport, isCorrect, gameStartsAt: d };
}

test("buildGroupLeaderboard: ranks members by season correct picks by default", () => {
  const members: PickGroupMemberInput[] = [
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 1), pick("nfl", true, 2), pick("nfl", false, 3)] },
    { accountId: "b", name: "Bob", picks: [pick("nfl", true, 1)] },
  ];
  const board = buildGroupLeaderboard(members, "a");
  assert.equal(board[0].accountId, "a");
  assert.equal(board[0].rank, 1);
  assert.equal(board[0].seasonCorrect, 2);
  assert.equal(board[0].isMe, true);
  assert.equal(board[1].accountId, "b");
  assert.equal(board[1].rank, 2);
  assert.equal(board[1].isMe, false);
});

test("buildGroupLeaderboard: a real 8-day-old correct pick does not count toward weeklyRecord/weeklyCorrect", () => {
  const members: PickGroupMemberInput[] = [
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 8)] },
  ];
  const board = buildGroupLeaderboard(members, "a");
  assert.equal(board[0].seasonCorrect, 1);
  assert.equal(board[0].weeklyCorrect, 0);
});

test("buildGroupLeaderboard: range 'week' ranks by this week's correct picks instead of season total", () => {
  const members: PickGroupMemberInput[] = [
    // Alice: more season correct picks overall, but they're all old (outside this week).
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 10), pick("nfl", true, 12), pick("nfl", true, 14)] },
    // Bob: fewer season picks total, but his are all this week.
    { accountId: "b", name: "Bob", picks: [pick("nfl", true, 0), pick("nfl", true, 1)] },
  ];
  const seasonBoard = buildGroupLeaderboard(members, "a", new Date(), "season");
  assert.equal(seasonBoard[0].accountId, "a"); // 3 > 2 season correct

  const weekBoard = buildGroupLeaderboard(members, "a", new Date(), "week");
  assert.equal(weekBoard[0].accountId, "b"); // 2 this week beats Alice's 0 this week
  assert.equal(weekBoard[0].weeklyCorrect, 2);
});

test("buildGroupLeaderboard: ties in season correct break on win percentage, then current streak", () => {
  const members: PickGroupMemberInput[] = [
    // 2 correct, 2 incorrect -> 50%
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 1), pick("nfl", true, 2), pick("nfl", false, 3), pick("nfl", false, 4)] },
    // 2 correct, 0 incorrect -> 100%
    { accountId: "b", name: "Bob", picks: [pick("nfl", true, 1), pick("nfl", true, 2)] },
  ];
  const board = buildGroupLeaderboard(members, "a");
  assert.equal(board[0].accountId, "b");
  assert.equal(board[0].winPct, 100);
  assert.equal(board[1].accountId, "a");
  assert.equal(board[1].winPct, 50);
});

test("buildGroupLeaderboard: an ungraded (isCorrect null) pick never counts toward correct/incorrect/winPct", () => {
  const members: PickGroupMemberInput[] = [
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 1), pick("nfl", null, 0)] },
  ];
  const board = buildGroupLeaderboard(members, "a");
  assert.equal(board[0].seasonCorrect, 1);
  assert.equal(board[0].winPct, 100);
});

test("generateInviteCode: uses only the unambiguous alphabet (no 0/O/1/I) and is 6 characters", () => {
  const code = generateInviteCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
});

test("generateInviteCode: deterministic with an injected random source", () => {
  const code = generateInviteCode(() => 0);
  assert.equal(code, "AAAAAA");
});

test("buildGroupLeaderboard: exposes seasonWins/seasonLosses/longestStreak alongside the existing fields", () => {
  const members: PickGroupMemberInput[] = [
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 1), pick("nfl", true, 2), pick("nfl", false, 3), pick("nfl", true, 4)] },
  ];
  const board = buildGroupLeaderboard(members, "a");
  assert.equal(board[0].seasonWins, 3);
  assert.equal(board[0].seasonLosses, 1);
  assert.equal(board[0].longestStreak, 2); // the two picks 1 and 2 days ago
});

test("weeklyChampion: the rank-1 entry from a week-ranked leaderboard, when they actually have a correct pick this week", () => {
  const members: PickGroupMemberInput[] = [
    { accountId: "a", name: "Alice", picks: [pick("nfl", true, 0), pick("nfl", true, 1)] },
    { accountId: "b", name: "Bob", picks: [pick("nfl", true, 0)] },
  ];
  const weekBoard = buildGroupLeaderboard(members, "a", new Date(), "week");
  const champ = weeklyChampion(weekBoard);
  assert.equal(champ?.accountId, "a");
});

test("weeklyChampion: null when nobody in the group has a correct pick this week", () => {
  const members: PickGroupMemberInput[] = [
    { accountId: "a", name: "Alice", picks: [pick("nfl", false, 0)] },
  ];
  const weekBoard = buildGroupLeaderboard(members, "a", new Date(), "week");
  assert.equal(weeklyChampion(weekBoard), null);
});

test("revealGroupPick: hides the team pre-lock but still reports whether a pick exists", () => {
  const hiddenWithPick = revealGroupPick("home", false);
  assert.equal(hiddenWithPick.revealed, false);
  assert.equal(hiddenWithPick.teamPick, null);
  assert.equal(hiddenWithPick.hasPicked, true);

  const hiddenNoPick = revealGroupPick(null, false);
  assert.equal(hiddenNoPick.hasPicked, false);
});

test("revealGroupPick: reveals the real team pick once locked", () => {
  const revealed = revealGroupPick("away", true);
  assert.equal(revealed.revealed, true);
  assert.equal(revealed.teamPick, "away");
});
