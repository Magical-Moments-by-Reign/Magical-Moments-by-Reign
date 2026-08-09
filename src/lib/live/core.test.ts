import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeJoin, agoraRoleFor, canTransition, inviteMatches, channelNameFor, isValidChannelName, LIVE_STATUS } from "./core";

test("host always authorizes as publisher, regardless of invite", () => {
  const d = authorizeJoin({ isHost: true, status: "SCHEDULED", expectedInvite: "ABCD-1234", providedInvite: null });
  assert.deepEqual(d, { role: "host", agoraRole: "publisher" });
});

test("audience needs a VALID invite and a joinable room → subscriber", () => {
  const ok = authorizeJoin({ isHost: false, status: "LIVE", expectedInvite: "ABCD-1234", providedInvite: "abcd-1234" });
  assert.deepEqual(ok, { role: "audience", agoraRole: "subscriber" }, "invite is case-insensitive");
});

test("audience is DENIED without an invite, or with a wrong one", () => {
  assert.equal(authorizeJoin({ isHost: false, status: "LIVE", expectedInvite: "ABCD-1234", providedInvite: null }), null);
  assert.equal(authorizeJoin({ isHost: false, status: "LIVE", expectedInvite: "ABCD-1234", providedInvite: "WRONG-000" }), null);
});

test("audience cannot get a live token for an ENDED or REPLAY room", () => {
  assert.equal(authorizeJoin({ isHost: false, status: "ENDED", expectedInvite: "A", providedInvite: "A" }), null);
  assert.equal(authorizeJoin({ isHost: false, status: "REPLAY", expectedInvite: "A", providedInvite: "A" }), null);
});

test("host↔audience map to Agora publisher/subscriber", () => {
  assert.equal(agoraRoleFor("host"), "publisher");
  assert.equal(agoraRoleFor("audience"), "subscriber");
});

test("invite match is exact (length + content), case-insensitive, empty-safe", () => {
  assert.ok(inviteMatches("ABCD-1234", "abcd-1234"));
  assert.ok(!inviteMatches("ABCD-1234", "abcd-123"));
  assert.ok(!inviteMatches("ABCD-1234", ""));
  assert.ok(!inviteMatches("ABCD-1234", null));
});

test("legal state transitions only; REPLAY only from ENDED", () => {
  assert.ok(canTransition("SCHEDULED", "LIVE"));
  assert.ok(canTransition("LIVE", "ENDED"));
  assert.ok(canTransition("ENDED", "REPLAY"));
  assert.ok(!canTransition("LIVE", "REPLAY"), "no replay without ending first");
  assert.ok(!canTransition("REPLAY", "LIVE"));
  assert.ok(!canTransition("ENDED", "LIVE"));
});

test("channel names are valid Agora names and unique per seed", () => {
  const a = channelNameFor("abc123def456");
  assert.ok(isValidChannelName(a));
  assert.notEqual(channelNameFor("seed-one"), channelNameFor("seed-two"));
  assert.ok(!isValidChannelName("bad name!"), "spaces/punctuation rejected");
});

test("only SCHEDULED and LIVE are joinable; ENDED/REPLAY are not", () => {
  assert.ok(LIVE_STATUS.SCHEDULED.joinable && LIVE_STATUS.LIVE.joinable);
  assert.ok(!LIVE_STATUS.ENDED.joinable && !LIVE_STATUS.REPLAY.joinable);
});
