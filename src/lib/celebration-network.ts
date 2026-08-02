// ── Family Birthday & Celebration Network ───────────────────────
// Eliminate forgotten birthdays. Once a family is connected, celebration dates
// organize themselves into a living Family Celebration Calendar that repeats
// every year automatically — no one recreates birthday lists annually.
//
// PURE domain: calendar building, the monthly view, yearly + leap-year
// recurrence, the reminder schedule, group/notification preferences, manual
// (non-member) entries, one-touch birthday options, the Ask Magical digest, and
// privacy (only shared celebrations appear). Persistence, delivery, and the
// one-touch integrations (gift/flowers/cake/card) are seams.

export type CelebrationType =
  | "birthday" | "baby_birthday" | "anniversary" | "graduation" | "memorial"
  | "military_homecoming" | "retirement" | "reunion" | "adoption_day" | "custom";

export const CELEBRATION_TYPES: { id: CelebrationType; label: string; optional?: boolean }[] = [
  { id: "birthday", label: "Birthday" },
  { id: "baby_birthday", label: "Baby birthday" },
  { id: "anniversary", label: "Wedding anniversary" },
  { id: "graduation", label: "Graduation" },
  { id: "memorial", label: "Memorial remembrance", optional: true },
  { id: "military_homecoming", label: "Military homecoming" },
  { id: "retirement", label: "Retirement" },
  { id: "reunion", label: "Family reunion" },
  { id: "adoption_day", label: "Adoption day" },
  { id: "custom", label: "Other celebration" },
];

// A celebration entry — from a connected member OR a manually-added loved one.
export interface CelebrationEntry {
  id: string;
  type: CelebrationType;
  personName: string;
  month: number;   // 1–12
  day: number;     // 1–31
  year?: number;   // original year (optional; enables age/years counts)
  relationship?: string;
  photoUrl?: string;
  memberId?: string;  // set when linked to a connected member
  source: "member" | "manual";
  visible: boolean;   // family/member controls visibility (privacy)
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_MS = 24 * 60 * 60 * 1000;

export function monthName(month: number): string {
  return MONTHS[Math.max(1, Math.min(12, month)) - 1];
}

// ── Automatic calendar (only shared/visible entries appear) ─────
export function buildCelebrationCalendar(entries: CelebrationEntry[]): CelebrationEntry[] {
  return entries.filter((e) => e.visible);
}

// ── Monthly Celebration View ────────────────────────────────────
/** Visible celebrations in a month, sorted by day (ties by name). */
export function monthlyCelebrations(entries: CelebrationEntry[], month: number): CelebrationEntry[] {
  return buildCelebrationCalendar(entries)
    .filter((e) => e.month === month)
    .sort((a, b) => a.day - b.day || a.personName.localeCompare(b.personName));
}

// ── Yearly + leap-year recurrence ───────────────────────────────
export type LeapMode = "feb_28" | "mar_1";

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Resolve a Feb-29 birthday in a non-leap year per the family's preference. */
export function resolveLeapDay(month: number, day: number, year: number, mode: LeapMode = "feb_28"): { month: number; day: number } {
  if (month === 2 && day === 29 && !isLeap(year)) {
    return mode === "mar_1" ? { month: 3, day: 1 } : { month: 2, day: 28 };
  }
  return { month, day };
}

/** The next occurrence (ISO date, UTC midnight) of a month/day on or after `fromISO`. */
export function nextOccurrence(month: number, day: number, fromISO: string, leapMode: LeapMode = "feb_28"): string {
  const from = new Date(fromISO);
  const y = from.getUTCFullYear();
  for (const year of [y, y + 1]) {
    const r = resolveLeapDay(month, day, year, leapMode);
    const d = new Date(Date.UTC(year, r.month - 1, r.day));
    if (d.getTime() >= new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())).getTime()) {
      return d.toISOString();
    }
  }
  // fallback (shouldn't hit)
  const r = resolveLeapDay(month, day, y + 1, leapMode);
  return new Date(Date.UTC(y + 1, r.month - 1, r.day)).toISOString();
}

/** Whole days until the next occurrence (0 = today). */
export function daysUntil(month: number, day: number, fromISO: string, leapMode: LeapMode = "feb_28"): number {
  const next = new Date(nextOccurrence(month, day, fromISO, leapMode)).getTime();
  const from = new Date(fromISO);
  const base = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((next - base) / DAY_MS);
}

// ── Smart reminders ─────────────────────────────────────────────
export const REMINDER_OFFSETS_DAYS = [14, 7, 2, 0] as const; // 0 = morning of
export const OPTIONAL_30_DAY = 30;

export interface CelebrationReminder { daysBefore: number; atISO: string; }

/** Reminder timeline for a celebration date. `include30` adds the optional 30-day. */
export function reminderSchedule(occurrenceISO: string, include30 = false): CelebrationReminder[] {
  const day = new Date(occurrenceISO).getTime();
  const offsets = include30 ? [OPTIONAL_30_DAY, ...REMINDER_OFFSETS_DAYS] : [...REMINDER_OFFSETS_DAYS];
  return offsets.map((d) => ({ daysBefore: d, atISO: new Date(day - d * DAY_MS).toISOString() }));
}

export const REMINDER_IDEAS = [
  "Send a card", "Purchase a gift", "Create a Magical Birthday Page",
  "Record a birthday video", "Schedule a family video celebration",
] as const;

// ── Group reminders / notification preferences ──────────────────
export const REMINDER_GROUPS = [
  { id: "immediate", label: "Immediate Family Only" },
  { id: "entire", label: "Entire Family" },
  { id: "grandchildren", label: "Grandchildren" },
  { id: "friends", label: "Friends" },
  { id: "custom", label: "Custom Groups" },
] as const;

// ── Manual (non-member) loved ones ──────────────────────────────
export interface ManualPerson {
  name: string;
  birthdayMonth?: number;
  birthdayDay?: number;
  anniversaryMonth?: number;
  anniversaryDay?: number;
  relationship?: string;
  photoUrl?: string;
}

/** Turn a manually-added loved one into celebration entries (birthday + optional anniversary). */
export function manualPersonEntries(p: ManualPerson, idBase: string): CelebrationEntry[] {
  const out: CelebrationEntry[] = [];
  if (p.birthdayMonth && p.birthdayDay) {
    out.push({ id: `${idBase}-bday`, type: "birthday", personName: p.name, month: p.birthdayMonth, day: p.birthdayDay, relationship: p.relationship, photoUrl: p.photoUrl, source: "manual", visible: true });
  }
  if (p.anniversaryMonth && p.anniversaryDay) {
    out.push({ id: `${idBase}-anniv`, type: "anniversary", personName: p.name, month: p.anniversaryMonth, day: p.anniversaryDay, relationship: p.relationship, photoUrl: p.photoUrl, source: "manual", visible: true });
  }
  return out;
}

// ── Birthday one-touch experience ───────────────────────────────
export const BIRTHDAY_ACTIONS = [
  { icon: "🎂", label: "Create a Birthday Page" },
  { icon: "🎁", label: "Purchase a Gift" },
  { icon: "💐", label: "Send Flowers" },
  { icon: "🍰", label: "Order a Cake" },
  { icon: "🎥", label: "Record a Birthday Video" },
  { icon: "📞", label: "Schedule a Family Video Call" },
  { icon: "💌", label: "Send a Digital Card" },
  { icon: "📸", label: "Upload Memories" },
] as const;

// ── Ask Magical digest ──────────────────────────────────────────
/** Celebrations coming up within `withinDays`, soonest first. */
export function upcomingCelebrations(entries: CelebrationEntry[], fromISO: string, withinDays = 30, leapMode: LeapMode = "feb_28") {
  return buildCelebrationCalendar(entries)
    .map((e) => ({ entry: e, days: daysUntil(e.month, e.day, fromISO, leapMode) }))
    .filter((x) => x.days <= withinDays)
    .sort((a, b) => a.days - b.days);
}

export function celebrationDigest(entries: CelebrationEntry[], fromISO: string): string[] {
  const month = new Date(fromISO).getUTCMonth() + 1;
  const thisMonth = monthlyCelebrations(entries, month).length;
  const soon = upcomingCelebrations(entries, fromISO, 7);
  const lines: string[] = [];
  if (thisMonth > 0) lines.push(`You have ${thisMonth} family ${thisMonth === 1 ? "celebration" : "celebrations"} this month.`);
  for (const s of soon) {
    lines.push(s.days === 0 ? `${s.entry.personName}'s ${s.entry.type === "birthday" ? "birthday" : "celebration"} is today! 🎉`
      : `${s.entry.personName}'s ${s.entry.type === "birthday" ? "birthday" : "celebration"} is in ${s.days} ${s.days === 1 ? "day" : "days"}.`);
  }
  return lines;
}

export const CELEBRATION_NETWORK = {
  name: "Family Birthday & Celebration Network",
  mission: "No birthday should be forgotten. No celebration should feel overlooked. Every family should have one beautiful place that keeps everyone connected.",
} as const;
