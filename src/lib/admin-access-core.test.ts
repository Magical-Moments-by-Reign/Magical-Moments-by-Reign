// Tests for the pure admin access-decision core: every role logs in, non-admins
// are denied, status/verification/session-age gating, the legacy bridge, the
// bootstrap-email path, escalation prevention, and the owner-bootstrap decision.

import { test } from "node:test";
import assert from "node:assert/strict";

import { adminAccess, bootstrapDecision, ADMIN_SESSION_MAX_HOURS } from "./admin-access-core";
import { ADMIN_ROLES } from "./admin-roles";

const ok = { accountFound: true, status: "ACTIVE", emailVerified: true, sessionAgeHours: 1 };

test("every staff role can access with an active, verified account", () => {
  for (const r of ADMIN_ROLES.map((x) => x.id)) {
    const res = adminAccess({ ...ok, staffRolesJson: JSON.stringify([r]) });
    assert.equal(res.allowed, true, `role ${r} should be allowed`);
    if (res.allowed) { assert.deepEqual(res.roles, [r]); assert.equal(res.via, "account_roles"); }
  }
});

test("platformRole=admin grants owner-level access", () => {
  const res = adminAccess({ ...ok, platformRole: "admin", staffRolesJson: "[]" });
  assert.equal(res.allowed, true);
  if (res.allowed) { assert.deepEqual(res.roles, ["owner"]); assert.equal(res.via, "platform_admin"); }
});

test("bootstrap-email account is treated as Owner", () => {
  const res = adminAccess({ ...ok, staffRolesJson: "[]", bootstrapMatch: true });
  assert.equal(res.allowed, true);
  if (res.allowed) assert.equal(res.via, "bootstrap_email");
});

test("a plain customer is denied (not_admin)", () => {
  const res = adminAccess({ ...ok, platformRole: "family_owner", staffRolesJson: "[]" });
  assert.deepEqual(res, { allowed: false, reason: "not_admin" });
});

test("a vendor is denied (not_admin)", () => {
  const res = adminAccess({ ...ok, platformRole: "vendor", staffRolesJson: "[]" });
  assert.deepEqual(res, { allowed: false, reason: "not_admin" });
});

test("unverified admin denied", () => {
  const res = adminAccess({ ...ok, emailVerified: false, staffRolesJson: JSON.stringify(["owner"]) });
  assert.deepEqual(res, { allowed: false, reason: "unverified" });
});

test("suspended / inactive admin denied", () => {
  assert.deepEqual(adminAccess({ ...ok, status: "CLOSED", staffRolesJson: JSON.stringify(["owner"]) }), { allowed: false, reason: "inactive" });
  assert.deepEqual(adminAccess({ ...ok, status: "UNDER_REVIEW", staffRolesJson: JSON.stringify(["support"]) }), { allowed: false, reason: "inactive" });
});

test("expired admin session denied (must re-auth)", () => {
  const res = adminAccess({ ...ok, sessionAgeHours: ADMIN_SESSION_MAX_HOURS + 1, staffRolesJson: JSON.stringify(["owner"]) });
  assert.deepEqual(res, { allowed: false, reason: "session_expired" });
});

test("client-controlled role escalation is blocked", () => {
  // Fabricated roles are dropped → no admin access.
  const res = adminAccess({ ...ok, staffRolesJson: JSON.stringify(["superuser", "root"]) });
  assert.deepEqual(res, { allowed: false, reason: "not_admin" });
});

test("legacy ADMIN_PASSWORD bridge: no account → owner", () => {
  const res = adminAccess({ accountFound: false, legacyPasswordValid: true });
  assert.equal(res.allowed, true);
  if (res.allowed) { assert.equal(res.via, "legacy_password"); assert.deepEqual(res.roles, ["owner"]); }
});

test("legacy bridge also covers a signed-in non-admin during transition", () => {
  const res = adminAccess({ ...ok, platformRole: "family_owner", staffRolesJson: "[]", legacyPasswordValid: true });
  assert.equal(res.allowed, true);
  if (res.allowed) assert.equal(res.via, "legacy_password");
});

test("no account and no legacy password → no_account", () => {
  assert.deepEqual(adminAccess({ accountFound: false }), { allowed: false, reason: "no_account" });
});

test("bootstrapDecision: success only once, for a real verified account", () => {
  assert.deepEqual(bootstrapDecision({ accountFound: true, emailVerified: true, ownerAlreadyExists: false }), { ok: true });
  assert.deepEqual(bootstrapDecision({ accountFound: true, emailVerified: true, ownerAlreadyExists: true }), { ok: false, reason: "owner_exists" });
  assert.deepEqual(bootstrapDecision({ accountFound: false, emailVerified: false, ownerAlreadyExists: false }), { ok: false, reason: "account_not_found" });
  assert.deepEqual(bootstrapDecision({ accountFound: true, emailVerified: false, ownerAlreadyExists: false }), { ok: false, reason: "not_verified" });
});
