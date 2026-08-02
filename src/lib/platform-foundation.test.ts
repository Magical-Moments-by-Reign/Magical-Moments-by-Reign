// Unit tests for the platform foundation: roles, auth, notifications, invitations.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLES, roleDef, isAdultRole, isChildRole, isFamilyManager, isStaffRole,
  requiresGuardian, canManagePermissionsFor, familyPermissionsForRole,
} from "./roles.ts";
import {
  hashPassword, verifyPassword, newSessionToken, hashSessionToken, sessionExpiry,
  sessionValid, socialSubjectField, signupDecision, canPurchaseAfterSignup,
  type SignupInput,
} from "./auth.ts";
import {
  NOTIFICATION_TYPES, notificationType, channelAvailable, registerNotificationProvider,
  resolveChannels, planDispatch,
} from "./notifications.ts";
import {
  buildInvitation, acceptInvitation, targetMatches, hashInviteToken,
  type InviteState,
} from "./invitations.ts";
import type { AddressInput } from "./account-identity.ts";

const NOW = "2026-08-02T00:00:00.000Z";
const addr: AddressInput = { line1: "1 Main St", city: "Dallas", state: "TX", postal: "75201", country: "US" };

// ── Roles ──────────────────────────────────────────────────────
test("canonical roles cover the family/guest/vendor/admin spectrum", () => {
  assert.equal(ROLES.length, 11);
  assert.equal(isAdultRole("parent"), true);
  assert.equal(isChildRole("child"), true);
  assert.equal(isChildRole("teen"), true);
  assert.equal(isFamilyManager("family_owner"), true);
  assert.equal(isFamilyManager("guest"), false);
  assert.equal(isStaffRole("admin"), true);
  assert.equal(roleDef("vendor").staff, false);
});
test("minors require a guardian; managers control their permissions", () => {
  assert.equal(requiresGuardian("child"), true);
  assert.equal(requiresGuardian("parent"), false);
  assert.equal(canManagePermissionsFor("parent", "child"), true);
  assert.equal(canManagePermissionsFor("guest", "child"), false);
  assert.equal(canManagePermissionsFor("parent", "guardian"), false); // not other managers
});
test("family permissions delegate to family-command defaults (no duplication)", () => {
  const parent = familyPermissionsForRole("parent");
  const child = familyPermissionsForRole("child");
  assert.equal(parent.view_savings_goals, true);
  assert.equal(child.view_savings_goals, false); // child default from family-command
});

// ── Auth ───────────────────────────────────────────────────────
test("password hashing round-trips and rejects wrong passwords", () => {
  const h = hashPassword("Correct horse battery staple");
  assert.ok(h.includes(":"));
  assert.equal(verifyPassword("Correct horse battery staple", h), true);
  assert.equal(verifyPassword("wrong", h), false);
  assert.equal(verifyPassword("x", "malformed"), false);
});
test("sessions: token hashing, expiry, validity", () => {
  const t = newSessionToken();
  assert.ok(t.length >= 32);
  assert.equal(hashSessionToken(t), hashSessionToken(t));
  const exp = sessionExpiry(NOW);
  assert.equal(sessionValid({ expiresAt: exp }, NOW), true);
  assert.equal(sessionValid({ expiresAt: "2020-01-01T00:00:00.000Z" }, NOW), false);
  assert.equal(sessionValid({ expiresAt: exp, revokedAt: NOW }, NOW), false);
});
test("social sign-in maps to the subject-id field", () => {
  assert.equal(socialSubjectField("google"), "googleSub");
  assert.equal(socialSubjectField("apple"), "appleSub");
});
const baseSignup: SignupInput = {
  firstName: "Tabitha", lastName: "Turner", email: "new@x.com", phone: "2145551212",
  address: addr, acceptedTerms: true, role: "family_owner",
};
test("signup: missing fields blocked", () => {
  const d = signupDecision({ ...baseSignup, email: "" }, []);
  assert.equal(d.ok, false);
  if (!d.ok && d.reason === "missing_fields") assert.ok(d.missing.length > 0);
});
test("signup: existing account → recover, never duplicate", () => {
  const existing = [{ firstName: "Tabitha", lastName: "Turner", email: "new@x.com", phone: "2145551212", accountId: "acct_1" }];
  const d = signupDecision(baseSignup, existing);
  assert.equal(d.ok, false);
  if (!d.ok) assert.equal(d.reason, "recover_existing");
});
test("signup: a minor requires a guardian", () => {
  const child = signupDecision({ ...baseSignup, email: "kid@x.com", phone: "2145559999", role: "child" }, []);
  assert.equal(child.ok, false);
  if (!child.ok) assert.equal(child.reason, "guardian_required");
  const okChild = signupDecision({ ...baseSignup, email: "kid2@x.com", phone: "2145558888", role: "child", guardianAccountId: "acct_p" }, []);
  assert.equal(okChild.ok, true);
});
test("signup success still gates purchasing on verification", () => {
  const d = signupDecision({ ...baseSignup, email: "fresh@x.com", phone: "2145550001" }, []);
  assert.equal(d.ok, true);
  assert.equal(canPurchaseAfterSignup({ emailVerified: true, phoneVerified: false }), false);
  assert.equal(canPurchaseAfterSignup({ emailVerified: true, phoneVerified: true }), true);
});

// ── Notifications ──────────────────────────────────────────────
test("notification types cover every ecosystem's alerts", () => {
  const ids = NOTIFICATION_TYPES.map((t) => t.id);
  for (const t of ["celebration_reminder", "task_reminder", "appointment_reminder", "education_deadline", "scholarship_deadline", "vendor_compliance", "trial_billing", "domain_renewal", "invitation"]) {
    assert.ok(ids.includes(t as never), `missing ${t}`);
  }
  assert.ok(notificationType("celebration_reminder")?.defaultChannels.includes("email"));
});
test("in-app is always available; email needs a provider", () => {
  assert.equal(channelAvailable("in_app"), true);
  assert.equal(channelAvailable("email"), false); // none registered yet
});
test("resolveChannels: defaults, opt-out, and minors are in-app only", () => {
  // email unavailable until a provider registers → celebration resolves to in_app
  assert.deepEqual(resolveChannels("celebration_reminder"), ["in_app"]);
  registerNotificationProvider({ channel: "email", isAvailable: () => true, send: async () => true });
  assert.equal(channelAvailable("email"), true);
  assert.deepEqual(resolveChannels("celebration_reminder").sort(), ["email", "in_app"]);
  // opt out of email
  assert.deepEqual(resolveChannels("celebration_reminder", { celebration_reminder: { email: false } }), ["in_app"]);
  // minors stay in-app only
  assert.deepEqual(resolveChannels("celebration_reminder", {}, { isMinor: true }), ["in_app"]);
});
test("planDispatch always stores in-app; delivers/queues external channels", () => {
  // email provider registered above → delivered; sms has no provider → queued if in defaults (it isn't)
  const r = planDispatch({ accountId: "a", type: "trial_billing", title: "t", body: "b" });
  assert.equal(r.storedInApp, true);
  assert.ok(r.delivered.includes("email"));
});

// ── Invitations ────────────────────────────────────────────────
test("buildInvitation masks the target, normalizes for matching, hashes the token", () => {
  const { record, token } = buildInvitation({ kind: "guest", role: "guest", inviterAccountId: "host", channel: "email", target: "Aunt.May@Gmail.com", experienceId: "exp1", nowISO: NOW });
  assert.ok(record.targetMasked.includes("•"));
  assert.equal(record.targetNormalized, "auntmay@gmail.com");
  assert.equal(record.tokenHash, hashInviteToken(token));
  assert.equal(record.guardianRequired, false);
  assert.equal(record.status, "pending");
});
test("inviting a minor flags guardian required", () => {
  const { record } = buildInvitation({ kind: "family_member", role: "child", inviterAccountId: "p", channel: "email", target: "kid@x.com", familyId: "f1", nowISO: NOW });
  assert.equal(record.guardianRequired, true);
});
test("acceptInvitation honors revoked/expired/already/guardian and matches target", () => {
  const pending: InviteState = { status: "pending", expiresAt: sessionExpiry(NOW, 14), guardianRequired: false };
  assert.equal(acceptInvitation(pending, "guest", { nowISO: NOW }).ok, true);
  assert.equal(acceptInvitation({ ...pending, status: "revoked" }, "guest", { nowISO: NOW }).ok, false);
  assert.equal(acceptInvitation({ ...pending, status: "accepted" }, "guest", { nowISO: NOW }).ok, false);
  assert.equal(acceptInvitation({ ...pending, expiresAt: "2020-01-01T00:00:00.000Z" }, "guest", { nowISO: NOW }).ok, false);
  const minor: InviteState = { status: "pending", expiresAt: sessionExpiry(NOW, 14), guardianRequired: true };
  assert.equal(acceptInvitation(minor, "child", { nowISO: NOW }).ok, false);
  assert.equal(acceptInvitation(minor, "child", { nowISO: NOW, guardianAccountId: "g1" }).ok, true);
  assert.equal(targetMatches("auntmay@gmail.com", "email", "Aunt.May+x@gmail.com"), true);
  assert.equal(targetMatches("auntmay@gmail.com", "email", "someone@else.com"), false);
});
