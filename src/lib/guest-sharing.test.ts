// Unit tests for the Guest Sharing domain library.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHARE_PERMISSIONS, PRIVATE_NEVER_EXPOSED, isShareablePermission,
  resolveCapabilities, guestCan, guestNavSections,
  evaluateAccess, invitationMatches,
  validateGuestbookEntry, guestbookInitialStatus, publicGuestbookView,
  withinRateLimit, uploadInitialStatus, uploadsOpen,
  attendanceConnectDecision, ownerLinkSummary,
  type GuestCapabilities,
} from "./guest-sharing.ts";

const NOW = new Date("2026-08-02T12:00:00Z");
const caps = (enabled: string[], type: Parameters<typeof resolveCapabilities>[1] = "public") => resolveCapabilities(enabled, type);

// ── Permissions & capability resolution ────────────────────────
test("only enabled shareable permissions become capabilities", () => {
  const c = caps(["view_hero", "rsvp"]);
  assert.equal(guestCan(c, "view_hero"), true);
  assert.equal(guestCan(c, "rsvp"), true);
  assert.equal(guestCan(c, "view_videos"), false);
});
test("private / unknown ids can never be enabled", () => {
  const c = caps(["Magical Moments Library", "billing", "orders", "view_hero"]) as GuestCapabilities;
  assert.equal(guestCan(c, "view_hero"), true);
  // none of the private strings are shareable permissions
  for (const priv of PRIVATE_NEVER_EXPOSED) assert.equal(isShareablePermission(priv), false);
});
test("contributor links are clamped to upload/participation only", () => {
  const c = caps(["view_videos", "view_registry", "upload_photos", "guestbook_sign"], "contributor");
  assert.equal(guestCan(c, "upload_photos"), true);
  assert.equal(guestCan(c, "guestbook_sign"), true);
  assert.equal(guestCan(c, "view_videos"), false); // not allowed for contributor
  assert.equal(guestCan(c, "view_registry"), false);
});
test("catalog has independent view + interaction groups", () => {
  assert.ok(SHARE_PERMISSIONS.some((p) => p.group === "view"));
  assert.ok(SHARE_PERMISSIONS.some((p) => p.group === "interaction"));
});

// ── Guest navigation (no empty sections) ───────────────────────
test("nav shows only sections with an enabled view permission, in order", () => {
  const c = caps(["view_photo_albums", "view_guestbook"]);
  const nav = guestNavSections(c);
  assert.deepEqual(nav.map((n) => n.id), ["gallery", "guestbook"]);
});
test("interaction-only permissions add no nav sections", () => {
  const nav = guestNavSections(caps(["rsvp", "upload_photos"]));
  assert.equal(nav.length, 0);
});
test("welcome section appears once for hero or welcome", () => {
  const nav = guestNavSections(caps(["view_hero", "view_welcome"]));
  assert.deepEqual(nav.map((n) => n.id), ["welcome"]);
});

// ── Access evaluation (server gate) ────────────────────────────
const baseLink = { linkType: "public" as const, paused: false, revokedAt: null, expiresAt: null, maxViews: null, viewCount: 0, hasPassword: false, invitationRequired: false };

test("open public link is accessible", () => {
  assert.deepEqual(evaluateAccess(baseLink, { now: NOW }), { ok: true });
});
test("revoked and paused links are blocked first", () => {
  assert.deepEqual(evaluateAccess({ ...baseLink, revokedAt: NOW }, { now: NOW }), { ok: false, reason: "revoked" });
  assert.deepEqual(evaluateAccess({ ...baseLink, paused: true }, { now: NOW }), { ok: false, reason: "paused" });
});
test("expiry and max-uses are enforced", () => {
  assert.deepEqual(evaluateAccess({ ...baseLink, expiresAt: new Date("2026-08-01T00:00:00Z") }, { now: NOW }), { ok: false, reason: "expired" });
  assert.deepEqual(evaluateAccess({ ...baseLink, maxViews: 5, viewCount: 5 }, { now: NOW }), { ok: false, reason: "max_uses" });
});
test("password required until server confirms it", () => {
  const l = { ...baseLink, hasPassword: true };
  assert.deepEqual(evaluateAccess(l, { now: NOW }), { ok: false, reason: "password_required" });
  assert.deepEqual(evaluateAccess(l, { now: NOW, passwordOk: false }), { ok: false, reason: "password_required" });
  assert.deepEqual(evaluateAccess(l, { now: NOW, passwordOk: true }), { ok: true });
});
test("invitation-only requires a confirmed match", () => {
  const l = { ...baseLink, linkType: "invitation" as const };
  assert.deepEqual(evaluateAccess(l, { now: NOW }), { ok: false, reason: "invitation_required" });
  assert.deepEqual(evaluateAccess(l, { now: NOW, invitationOk: true }), { ok: true });
});
test("URL-tampering cannot bypass: a blocked link is never ok regardless of caps", () => {
  // capabilities are irrelevant to access; a revoked link is always blocked
  assert.equal(evaluateAccess({ ...baseLink, revokedAt: NOW }, { now: NOW, passwordOk: true, invitationOk: true }).ok, false);
});

// ── Invitation matching ────────────────────────────────────────
test("invitation matches on normalized email or phone", () => {
  assert.equal(invitationMatches({ email: "Guest+x@Gmail.com" }, { emails: ["guest@gmail.com"] }), true);
  assert.equal(invitationMatches({ phone: "+1 (214) 555-0000" }, { phones: ["2145550000"] }), true);
  assert.equal(invitationMatches({ email: "no@one.com" }, { emails: ["guest@gmail.com"] }), false);
});

// ── Guestbook without an account ───────────────────────────────
test("guestbook requires name, message, consent", () => {
  const r = validateGuestbookEntry({ displayName: "", message: "", consent: false });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.some((e) => e.includes("display name")));
    assert.ok(r.errors.some((e) => e.includes("message")));
    assert.ok(r.errors.some((e) => e.includes("consent")));
  }
});
test("valid guestbook entry normalizes optional fields", () => {
  const r = validateGuestbookEntry({ displayName: " Aunt May ", message: "So happy!", consent: true, relationship: "Aunt" });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.displayName, "Aunt May");
    assert.equal(r.value.email, null);
    assert.equal(r.value.visibility, "display_name");
  }
});
test("invalid email is rejected but blank email is fine", () => {
  assert.equal(validateGuestbookEntry({ displayName: "A", message: "hi", consent: true, email: "bad" }).ok, false);
  assert.equal(validateGuestbookEntry({ displayName: "A", message: "hi", consent: true, email: "" }).ok, true);
});
test("moderation status follows owner setting", () => {
  assert.equal(guestbookInitialStatus(true), "pending");
  assert.equal(guestbookInitialStatus(false), "published");
});
test("public view hides anonymous name, private entries, and never leaks email", () => {
  const anon = publicGuestbookView({ displayName: "Real Name", message: "hi", email: "a@b.com", relationship: null, visibility: "anonymous", status: "published" });
  assert.equal(anon.visible, true);
  assert.equal(anon.name, "Anonymous");
  assert.ok(!JSON.stringify(anon).includes("a@b.com"));
  const priv = publicGuestbookView({ displayName: "X", message: "secret", email: null, relationship: null, visibility: "private_host", status: "published" });
  assert.equal(priv.visible, false);
  const pending = publicGuestbookView({ displayName: "X", message: "hi", email: null, relationship: null, visibility: "display_name", status: "pending" });
  assert.equal(pending.visible, false);
});

// ── Rate limiting & uploads ────────────────────────────────────
test("rate limit blocks past the window max", () => {
  assert.equal(withinRateLimit(2, 3), true);
  assert.equal(withinRateLimit(3, 3), false);
});
test("guest uploads default to review queue", () => {
  assert.equal(uploadInitialStatus(false), "pending");
  assert.equal(uploadInitialStatus(true), "published");
});
test("upload deadline closes uploads", () => {
  assert.equal(uploadsOpen(null, NOW), true);
  assert.equal(uploadsOpen(new Date("2026-08-01T00:00:00Z"), NOW), false);
  assert.equal(uploadsOpen(new Date("2026-08-03T00:00:00Z"), NOW), true);
});

// ── Attendance connection (verified only) ──────────────────────
test("attendance connects only on a VERIFIED contact match", () => {
  assert.deepEqual(
    attendanceConnectDecision({ email: "me@x.com" }, { emails: ["me@x.com"], phones: [] }),
    { connect: true, matchedOn: "email" },
  );
  // matching contact exists but is NOT verified → no connect
  assert.deepEqual(
    attendanceConnectDecision({ email: "me@x.com" }, { emails: [], phones: [] }),
    { connect: false, matchedOn: null },
  );
});

// ── Owner summary ──────────────────────────────────────────────
test("owner summary lists enabled permissions in catalog order", () => {
  const s = ownerLinkSummary(
    { linkType: "public", enabled: ["rsvp", "view_hero"], createdAt: NOW, expiresAt: null, paused: false, revokedAt: null },
    { views: 10, guestbookSubmissions: 2, uploadsReceived: 1, rsvps: 4, contributions: 0 },
  );
  assert.deepEqual(s.enabledPermissions, ["view_hero", "rsvp"]); // catalog order, not input order
  assert.equal(s.counts.rsvps, 4);
  assert.equal(s.revoked, false);
});
