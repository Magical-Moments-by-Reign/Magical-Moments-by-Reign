// Unit tests for the Family Birthday & Celebration Network.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELEBRATION_TYPES, monthName, buildCelebrationCalendar, monthlyCelebrations,
  resolveLeapDay, nextOccurrence, daysUntil, reminderSchedule, REMINDER_OFFSETS_DAYS,
  REMINDER_GROUPS, manualPersonEntries, BIRTHDAY_ACTIONS, upcomingCelebrations,
  celebrationDigest, CELEBRATION_NETWORK,
  type CelebrationEntry,
} from "./celebration-network.ts";

const e = (over: Partial<CelebrationEntry>): CelebrationEntry => ({
  id: "x", type: "birthday", personName: "Sam", month: 8, day: 12, source: "manual", visible: true, ...over,
});

test("celebration types cover the family set", () => {
  const ids = CELEBRATION_TYPES.map((t) => t.id);
  for (const t of ["birthday", "anniversary", "graduation", "memorial", "adoption_day"]) assert.ok(ids.includes(t as never));
  assert.equal(CELEBRATION_TYPES.find((t) => t.id === "memorial")?.optional, true);
  assert.equal(monthName(8), "August");
});

test("calendar hides non-visible entries (privacy)", () => {
  const cal = buildCelebrationCalendar([e({ id: "a" }), e({ id: "b", visible: false })]);
  assert.deepEqual(cal.map((x) => x.id), ["a"]);
});

test("monthly view sorted by day", () => {
  const list = monthlyCelebrations([
    e({ id: "molly", personName: "Molly", day: 1 }),
    e({ id: "sarah", personName: "Sarah", day: 12 }),
    e({ id: "nate", personName: "Nate", day: 23 }),
    e({ id: "sept", month: 9, day: 2 }),
  ], 8);
  assert.deepEqual(list.map((x) => x.personName), ["Molly", "Sarah", "Nate"]);
});

test("leap-day resolves in non-leap years per mode", () => {
  assert.deepEqual(resolveLeapDay(2, 29, 2027, "feb_28"), { month: 2, day: 28 });
  assert.deepEqual(resolveLeapDay(2, 29, 2027, "mar_1"), { month: 3, day: 1 });
  assert.deepEqual(resolveLeapDay(2, 29, 2028, "feb_28"), { month: 2, day: 29 }); // 2028 is leap
});

test("next occurrence rolls to next year when the date has passed", () => {
  // from Aug 15 2026; Aug 12 already passed → next is Aug 12 2027
  assert.equal(nextOccurrence(8, 12, "2026-08-15T00:00:00.000Z"), "2027-08-12T00:00:00.000Z");
  // Aug 21 is still ahead this year
  assert.equal(nextOccurrence(8, 21, "2026-08-15T00:00:00.000Z"), "2026-08-21T00:00:00.000Z");
});
test("daysUntil counts to the next occurrence", () => {
  assert.equal(daysUntil(8, 21, "2026-08-15T00:00:00.000Z"), 6);
  assert.equal(daysUntil(8, 15, "2026-08-15T00:00:00.000Z"), 0);
});

test("reminder schedule: 14/7/2/0 by default, +30 optional", () => {
  const occ = "2026-08-21T00:00:00.000Z";
  assert.deepEqual(reminderSchedule(occ).map((r) => r.daysBefore), [...REMINDER_OFFSETS_DAYS]);
  assert.deepEqual(reminderSchedule(occ, true).map((r) => r.daysBefore), [30, 14, 7, 2, 0]);
});

test("reminder groups defined", () => {
  assert.ok(REMINDER_GROUPS.some((g) => g.id === "immediate"));
  assert.ok(REMINDER_GROUPS.some((g) => g.id === "grandchildren"));
});

test("manual (non-member) person becomes birthday + anniversary entries", () => {
  const entries = manualPersonEntries({ name: "Grandma", birthdayMonth: 3, birthdayDay: 4, anniversaryMonth: 6, anniversaryDay: 20, relationship: "Grandmother" }, "gm");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, "birthday");
  assert.equal(entries[1].type, "anniversary");
  assert.equal(entries[0].source, "manual");
});

test("birthday one-touch actions present", () => {
  assert.equal(BIRTHDAY_ACTIONS.length, 8);
  assert.ok(BIRTHDAY_ACTIONS.some((a) => a.label === "Order a Cake"));
});

test("upcoming + digest read like a helpful assistant", () => {
  const entries = [
    e({ id: "daria", personName: "Daria", month: 8, day: 17 }),
    e({ id: "nate", personName: "Nate", month: 8, day: 23 }),
    e({ id: "far", personName: "Far", month: 12, day: 1 }),
  ];
  const soon = upcomingCelebrations(entries, "2026-08-15T00:00:00.000Z", 7);
  assert.deepEqual(soon.map((s) => s.entry.personName), ["Daria"]); // within 7 days
  const digest = celebrationDigest(entries, "2026-08-15T00:00:00.000Z");
  assert.ok(digest.some((l) => l.includes("this month")));
  assert.ok(digest.some((l) => l.includes("Daria")));
});

test("mission present", () => {
  assert.ok(CELEBRATION_NETWORK.mission.includes("No birthday should be forgotten"));
});
