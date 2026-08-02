// Unit tests for Family Connections.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GUEST_PERMISSION_KEYS, defaultGuestPermissions, guestCan,
  GUEST_INCLUDED_ACTIONS, guestParticipationRequiresMembership, isPremiumForGuest,
  PREMIUM_LOCK, lockedFeatureNotice, FAMILY_GATHERING_TYPES, TIMELINE_ENTRY_TYPES,
  FEED_ACTIVITY_TYPES, FAMILY_MAP, formatGeneralLocation, liveLocationAllowed,
  canAccessMoment, CONNECTIONS_PRIVACY, FAMILY_CONNECTIONS,
} from "./family-connections.ts";

test("host controls all guest permissions; safe defaults", () => {
  assert.equal(GUEST_PERMISSION_KEYS.length, 8);
  const d = defaultGuestPermissions();
  assert.equal(guestCan(d, "comment"), true);
  assert.equal(guestCan(d, "join_video_calls"), true);
  assert.equal(guestCan(d, "invite_others"), false);
  assert.equal(guestCan(d, "download_memories"), false);
  assert.equal(guestCan(d, "edit_timeline"), false);
});
test("host can enable a permission", () => {
  const d = defaultGuestPermissions();
  d.upload_photos = true;
  assert.equal(guestCan(d, "upload_photos"), true);
});

test("guests participate WITHOUT their own membership", () => {
  assert.equal(guestParticipationRequiresMembership(), false);
  assert.ok(GUEST_INCLUDED_ACTIONS.includes("RSVP"));
  assert.ok(GUEST_INCLUDED_ACTIONS.includes("Join family video calls"));
});

test("premium features (a guest's OWN account) are locked with a graceful notice", () => {
  assert.equal(isPremiumForGuest("create_own_moment"), true);
  assert.equal(isPremiumForGuest("own_library"), true);
  assert.equal(isPremiumForGuest("comment"), false); // shared-experience action, not premium
  const n = lockedFeatureNotice("create_own_moment");
  assert.equal(n.locked, true);
  assert.equal(n.primary, "Start My Magical Preview Pass");
  assert.equal(PREMIUM_LOCK.message.includes("your own Magical Moments membership"), true);
});

test("gathering / timeline / feed catalogs present", () => {
  assert.ok(FAMILY_GATHERING_TYPES.includes("Military Homecomings"));
  assert.ok(TIMELINE_ENTRY_TYPES.includes("New Babies"));
  assert.ok(FEED_ACTIVITY_TYPES.includes("Offer support during difficult moments"));
});

test("Family Map is general-only, opt-in, and never live tracking", () => {
  assert.equal(FAMILY_MAP.liveTracking, false);
  assert.equal(FAMILY_MAP.precision, "general");
  assert.equal(FAMILY_MAP.optIn, true);
  assert.equal(liveLocationAllowed(), false);
  assert.equal(formatGeneralLocation("Birmingham", "Alabama"), "Birmingham, Alabama");
});

test("privacy: a guest can access ONLY invited moments (no cross-moment access)", () => {
  assert.equal(canAccessMoment(["m1", "m2"], "m1"), true);
  assert.equal(canAccessMoment(["m1", "m2"], "m3"), false);
  assert.ok(CONNECTIONS_PRIVACY.some((p) => p.includes("Only invited participants")));
});

test("mission present", () => {
  assert.equal(FAMILY_CONNECTIONS.name, "Family Connections");
  assert.ok(FAMILY_CONNECTIONS.mission.includes("right there"));
});
