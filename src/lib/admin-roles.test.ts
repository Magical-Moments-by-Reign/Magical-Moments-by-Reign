// Tests for account-based admin roles & capabilities. Pure.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_ROLES, ALL_CAPABILITIES, isAdminRole, parseStaffRoles,
  capabilitiesFor, hasCapability, isStaff, OWNER_ROLE,
} from "./admin-roles";

test("owner has every capability", () => {
  for (const cap of ALL_CAPABILITIES) assert.equal(hasCapability(["owner"], cap), true);
  assert.equal(capabilitiesFor(["owner"]).size, ALL_CAPABILITIES.length);
});

test("scoped roles get only their capabilities (no escalation)", () => {
  assert.equal(hasCapability(["compliance"], "vendors.compliance"), true);
  assert.equal(hasCapability(["compliance"], "finance.manage"), false);
  assert.equal(hasCapability(["support"], "customers.manage"), true);
  assert.equal(hasCapability(["support"], "vendors.manage"), false);
  assert.equal(hasCapability(["auditor"], "customers.view"), true);
  assert.equal(hasCapability(["auditor"], "customers.manage"), false); // read-only
});

test("combined roles union their capabilities", () => {
  const caps = capabilitiesFor(["support", "finance"]);
  assert.ok(caps.has("customers.manage"));
  assert.ok(caps.has("finance.manage"));
  assert.ok(!caps.has("content.manage"));
});

test("parseStaffRoles: drops unknown/garbage values (tamper-safe)", () => {
  assert.deepEqual(parseStaffRoles(JSON.stringify(["owner", "hacker", "finance"])).sort(), ["finance", "owner"]);
  assert.deepEqual(parseStaffRoles('not json'), []);
  assert.deepEqual(parseStaffRoles(JSON.stringify({ role: "owner" })), []); // not an array
  assert.deepEqual(parseStaffRoles(JSON.stringify(["support", "support"])), ["support"]); // deduped
  assert.deepEqual(parseStaffRoles(null), []);
  assert.deepEqual(parseStaffRoles(""), []);
});

test("a fabricated role string can never grant a capability", () => {
  const roles = parseStaffRoles(JSON.stringify(["superuser", "root"]));
  assert.equal(roles.length, 0);
  assert.equal(hasCapability(roles, "security.manage"), false);
  assert.equal(isStaff(roles), false);
});

test("isAdminRole + registry", () => {
  assert.equal(isAdminRole("owner"), true);
  assert.equal(isAdminRole("nope"), false);
  assert.equal(ADMIN_ROLES.length, 8);
  assert.equal(OWNER_ROLE, "owner");
});
