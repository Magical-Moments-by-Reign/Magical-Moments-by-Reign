// Unit tests for the Family Command Center.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_ROLES, PERMISSION_KEYS, defaultPermissions, canAccess,
  validateMessage, reminderConfirmationNeeded, taskProgress, familyDigest,
  activeChannels, locationTrackingAllowed, PRIVACY_GUARANTEES, ACHIEVEMENTS,
  CALENDAR_CATEGORIES, REMINDER_TYPES,
} from "./family-command.ts";

test("roles cover adults and minors", () => {
  assert.ok(FAMILY_ROLES.some((r) => r.id === "parent" && r.adult));
  assert.ok(FAMILY_ROLES.some((r) => r.id === "child" && !r.adult));
});

test("adults get full permissions; children start minimal (owner expands)", () => {
  const adult = defaultPermissions("parent");
  assert.ok(PERMISSION_KEYS.every((p) => adult[p.key] === true));
  const child = defaultPermissions("child");
  assert.equal(canAccess(child, "view_calendar"), true);
  assert.equal(canAccess(child, "view_savings_goals"), false); // off by default
  assert.equal(canAccess(child, "mark_tasks_complete"), true);
});
test("every permission is configurable via the set", () => {
  const child = defaultPermissions("child");
  child.view_savings_goals = true;
  assert.equal(canAccess(child, "view_savings_goals"), true);
});

test("message validation requires sender, recipient, body", () => {
  assert.equal(validateMessage({ senderId: "", recipientIds: [], body: "" }).ok, false);
  assert.equal(validateMessage({ senderId: "p", recipientIds: ["c"], body: "Trash out after school." }).ok, true);
});

test("reminder confirmation only when child completes AND parent enabled it", () => {
  assert.equal(reminderConfirmationNeeded(true, true), true);
  assert.equal(reminderConfirmationNeeded(true, false), false);
  assert.equal(reminderConfirmationNeeded(false, true), false);
});

test("task progress computes completion", () => {
  assert.equal(taskProgress([{ status: "done" }, { status: "open" }, { status: "in_progress" }, { status: "done" }]), 50);
  assert.equal(taskProgress([]), 0);
});

test("family digest reads like a helpful assistant, not a nag", () => {
  const lines = familyDigest({
    remindersDueToday: [{ memberName: "Jeremy", count: 3 }, { memberName: "Sam", count: 0 }],
    upcomingDeadlines: [{ memberName: "Karlie", label: "scholarship deadline", whenLabel: "next week" }],
    openAdultTasks: [{ memberName: "Dad", label: "schedule the HVAC maintenance" }],
    checklistName: "family vacation checklist", checklistPct: 85,
  });
  assert.ok(lines.includes("Jeremy has 3 reminders due today."));
  assert.ok(!lines.some((l) => l.startsWith("Sam"))); // zero-count omitted
  assert.ok(lines.some((l) => l.includes("scholarship deadline is next week")));
  assert.ok(lines.some((l) => l.includes("Dad still needs to schedule the HVAC maintenance")));
  assert.ok(lines.some((l) => l.includes("85% complete")));
});

test("notification channels respect availability + prefs (push is future)", () => {
  const chans = activeChannels({ in_app: true, email: true, push: true, sms: false });
  assert.deepEqual(chans.sort(), ["email", "in_app"]); // push unavailable, sms off
});

test("privacy: location tracking is never allowed", () => {
  assert.equal(locationTrackingAllowed(), false);
  assert.ok(PRIVACY_GUARANTEES.some((p) => p.includes("No live location tracking")));
  assert.ok(PRIVACY_GUARANTEES.some((p) => p.includes("No surveillance")));
});

test("content catalogs present", () => {
  assert.ok(ACHIEVEMENTS.includes("Scholarship awarded"));
  assert.ok(CALENDAR_CATEGORIES.includes("Medical appointments"));
  assert.ok(REMINDER_TYPES.includes("Medication"));
});
