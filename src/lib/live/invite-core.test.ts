import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldAdvanceInvite, normalizeEmail, normalizePhone, normalizeRecipient,
  dedupeRecipients, dueReminders, isWellFormedInviteToken, inviteTokenMatches,
  evaluateGuestGate,
} from "./invite-core";

test("invite status only advances by rank; joined never downgrades", () => {
  assert.ok(shouldAdvanceInvite("SENT", "DELIVERED"));
  assert.ok(shouldAdvanceInvite("DELIVERED", "JOINED"));
  assert.ok(!shouldAdvanceInvite("JOINED", "DELIVERED"), "late delivered ping can't undo joined");
  assert.ok(!shouldAdvanceInvite("JOINED", "OPENED"));
  assert.ok(!shouldAdvanceInvite("SENT", "SENT"));
});

test("revoke is always allowed and sticky; can't decline after joining", () => {
  assert.ok(shouldAdvanceInvite("JOINED", "REVOKED"));
  assert.ok(!shouldAdvanceInvite("REVOKED", "SENT"));
  assert.ok(!shouldAdvanceInvite("REVOKED", "JOINED"));
  assert.ok(!shouldAdvanceInvite("JOINED", "DECLINED"));
  assert.ok(shouldAdvanceInvite("SENT", "DECLINED"));
});

test("email normalization lowercases, trims, validates", () => {
  assert.equal(normalizeEmail("  Nana@Family.com "), "nana@family.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail(null), null);
});

test("phone normalization to E.164 (US-first)", () => {
  assert.equal(normalizePhone("(305) 555-0142"), "+13055550142");
  assert.equal(normalizePhone("13055550142"), "+13055550142");
  assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  assert.equal(normalizePhone("555-0142"), null, "too short");
  assert.equal(normalizePhone(null), null);
});

test("recipient channel: email preferred, else sms, else unreachable", () => {
  assert.equal(normalizeRecipient({ email: "a@b.com", phone: "3055550142" }).channel, "email");
  assert.equal(normalizeRecipient({ phone: "3055550142" }).channel, "sms");
  assert.equal(normalizeRecipient({ name: "Nobody" }).channel, null);
});

test("dedupe keeps first, drops unreachable, merges by identity", () => {
  const out = dedupeRecipients([
    normalizeRecipient({ name: "Nana", email: "NANA@x.com" }),
    normalizeRecipient({ name: "Nana again", email: "nana@x.com" }), // dup by email
    normalizeRecipient({ name: "Ghost" }),                            // unreachable
    normalizeRecipient({ phone: "3055550142" }),
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, "Nana");
  assert.equal(out[1].phone, "+13055550142");
});

test("reminders fire only when enabled, due, and unsent", () => {
  const start = new Date("2026-09-01T18:00:00Z");
  // 25h before: nothing due yet
  assert.deepEqual(dueReminders({ scheduledStart: start, now: new Date("2026-08-31T17:00:00Z"), prefs: { t24h: true, t1h: true }, alreadySent: [] }), []);
  // 23h before: 24h reminder is due
  assert.deepEqual(dueReminders({ scheduledStart: start, now: new Date("2026-08-31T19:00:00Z"), prefs: { t24h: true, t1h: true }, alreadySent: [] }), ["t24h"]);
  // 30m before, 24h already sent: only 1h due
  assert.deepEqual(dueReminders({ scheduledStart: start, now: new Date("2026-09-01T17:30:00Z"), prefs: { t24h: true, t1h: true }, alreadySent: ["t24h"] }), ["t1h"]);
  // disabled prefs: nothing
  assert.deepEqual(dueReminders({ scheduledStart: start, now: new Date("2026-09-01T17:30:00Z"), prefs: {}, alreadySent: [] }), []);
});

test("invite token shape + constant-time match", () => {
  assert.ok(isWellFormedInviteToken("a".repeat(48)));
  assert.ok(!isWellFormedInviteToken("short"));
  assert.ok(!isWellFormedInviteToken("XYZ!" + "a".repeat(44)));
  assert.ok(inviteTokenMatches("abc123", "abc123"));
  assert.ok(!inviteTokenMatches("abc123", "abc124"));
  assert.ok(!inviteTokenMatches("abc123", null));
  assert.ok(!inviteTokenMatches("abc123", "abc12"));
});

test("guest gate: passcode, name, and contact requirements", () => {
  assert.deepEqual(evaluateGuestGate({}, {}), { ok: true });
  assert.deepEqual(evaluateGuestGate({ passcode: "1234" }, { passcode: "1234" }), { ok: true });
  assert.deepEqual(evaluateGuestGate({ passcode: "1234" }, { passcode: "0000" }), { ok: false, reason: "passcode" });
  assert.deepEqual(evaluateGuestGate({ requireName: true }, { name: "  " }), { ok: false, reason: "name" });
  assert.deepEqual(evaluateGuestGate({ requireContact: true }, { contactVerified: false }), { ok: false, reason: "contact" });
  assert.deepEqual(evaluateGuestGate({ requireName: true }, { name: "Aunt May" }), { ok: true });
});
