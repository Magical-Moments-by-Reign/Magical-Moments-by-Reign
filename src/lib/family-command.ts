// ── Family Command Center ───────────────────────────────────────
// A PRIVATE family communication & organization system built on trust,
// collaboration, reminders, and shared responsibilities. It is NOT a phone
// tracker, NOT a social platform, NOT a texting replacement, and NOT
// surveillance. It helps families stay connected and organized WITHOUT invading
// anyone's privacy.
//
// PURE domain: family roles, permission-based access, message/reminder/task
// shapes, achievements, the Ask Magical family digest, notification prefs, and
// the privacy guarantees (no location tracking, ever). Persistence, auth, and
// delivery are foundation seams.

// ── Roles ───────────────────────────────────────────────────────
export type FamilyRole = "parent" | "guardian" | "child" | "teen" | "grandparent" | "spouse" | "caregiver" | "trusted";
export const FAMILY_ROLES: { id: FamilyRole; label: string; adult: boolean }[] = [
  { id: "parent", label: "Parent", adult: true },
  { id: "guardian", label: "Guardian", adult: true },
  { id: "spouse", label: "Spouse", adult: true },
  { id: "grandparent", label: "Grandparent", adult: true },
  { id: "caregiver", label: "Caregiver", adult: true },
  { id: "trusted", label: "Trusted Family Member", adult: true },
  { id: "teen", label: "Teen", adult: false },
  { id: "child", label: "Child", adult: false },
];

// ── Permission-based access (the Family Owner controls these) ────
export type PermissionKey =
  | "view_calendar" | "receive_reminders" | "view_chores" | "view_homework_reminders"
  | "view_celebrations" | "view_savings_goals" | "view_checklists"
  | "send_messages" | "receive_messages" | "mark_tasks_complete";

export const PERMISSION_KEYS: { key: PermissionKey; label: string }[] = [
  { key: "view_calendar", label: "View family calendar" },
  { key: "receive_reminders", label: "Receive reminders" },
  { key: "view_chores", label: "View chores" },
  { key: "view_homework_reminders", label: "View homework reminders" },
  { key: "view_celebrations", label: "View celebrations" },
  { key: "view_savings_goals", label: "View savings goals" },
  { key: "view_checklists", label: "View checklists" },
  { key: "send_messages", label: "Send messages" },
  { key: "receive_messages", label: "Receive messages" },
  { key: "mark_tasks_complete", label: "Mark tasks complete" },
];

export type PermissionSet = Partial<Record<PermissionKey, boolean>>;

/** Adults get full access by default; children start with a safe, minimal set the owner can expand. */
export function defaultPermissions(role: FamilyRole): PermissionSet {
  const isAdult = FAMILY_ROLES.find((r) => r.id === role)?.adult ?? false;
  if (isAdult) {
    return Object.fromEntries(PERMISSION_KEYS.map((p) => [p.key, true])) as PermissionSet;
  }
  return {
    view_calendar: true, receive_reminders: true, view_chores: true,
    view_homework_reminders: true, view_celebrations: true, view_checklists: true,
    view_savings_goals: false, send_messages: true, receive_messages: true,
    mark_tasks_complete: true,
  };
}

/** Every permission is configurable; a child sees only what the owner allows. */
export function canAccess(perms: PermissionSet, key: PermissionKey): boolean {
  return perms[key] === true;
}

// ── Family messages ─────────────────────────────────────────────
export type MessagePriority = "low" | "normal" | "high";
export interface FamilyMessageInput {
  senderId: string;
  recipientIds: string[];
  body: string;
  dueDate?: string;
  remindAt?: string;
  priority?: MessagePriority;
}
export type MessageValidation = { ok: true } | { ok: false; errors: string[] };

export function validateMessage(i: FamilyMessageInput): MessageValidation {
  const errors: string[] = [];
  if (!i.senderId) errors.push("A sender is required.");
  if (!i.recipientIds?.length) errors.push("Choose at least one recipient.");
  if (!i.body?.trim()) errors.push("Enter a message.");
  if (i.body && i.body.length > 2000) errors.push("Message is too long.");
  return errors.length ? { ok: false, errors } : { ok: true };
}

// ── Smart reminders ─────────────────────────────────────────────
export const REMINDER_TYPES = [
  "Homework", "Medication", "Sports practice", "Music lessons", "Birthday gifts",
  "Homework due", "Laundry", "Family dinner", "Appointments", "Volunteer hours",
  "College deadlines",
] as const;

export type ReminderStatus = "pending" | "completed";
/** Children can mark reminders complete; parents get confirmation when enabled. */
export function reminderConfirmationNeeded(completedByChild: boolean, parentConfirmEnabled: boolean): boolean {
  return completedByChild && parentConfirmEnabled;
}

// ── Family task manager ─────────────────────────────────────────
export type TaskStatus = "open" | "in_progress" | "done";
export interface FamilyTask { id: string; title: string; assigneeIds: string[]; status: TaskStatus; }

export const TASK_EXAMPLES = [
  "Clean bedroom", "Walk the dog", "Pay allowance", "Take out trash", "Study",
  "Pack lunch", "Pack for vacation", "Prepare hospital bag", "Wedding planning tasks",
  "Graduation checklist",
] as const;

/** Completion across a set of tasks (0–100). */
export function taskProgress(tasks: { status: TaskStatus }[]): number {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100);
}

// ── Husband & wife (partner) organizer ──────────────────────────
export const PARTNER_ORGANIZER_EXAMPLES = [
  "Pay mortgage", "Pick up groceries", "Doctor appointments", "School meetings",
  "Birthday planning", "Vacation planning", "House maintenance", "Shared shopping list",
  "Bill reminders", "Home projects",
] as const;

// ── Family calendar ─────────────────────────────────────────────
export const CALENDAR_CATEGORIES = [
  "School events", "Sports", "Birthdays", "Vacations", "College visits",
  "Medical appointments", "Family dinners", "Celebrations", "Work schedules",
  "Church", "Community events",
] as const;

// ── Achievements ────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  "Homework completed", "Savings goal reached", "Straight A report card",
  "Scholarship awarded", "Driver's license earned", "Graduation completed",
  "College accepted", "First job", "First paycheck", "Volunteer milestone",
] as const;

// ── Ask Magical — family digest ─────────────────────────────────
export interface DigestInput {
  remindersDueToday: { memberName: string; count: number }[];
  upcomingDeadlines: { memberName: string; label: string; whenLabel: string }[];
  openAdultTasks: { memberName: string; label: string }[];
  checklistName?: string;
  checklistPct?: number;
}

/** The proactive, organizational lines Ask Magical surfaces (never nagging). */
export function familyDigest(i: DigestInput): string[] {
  const lines: string[] = [];
  for (const r of i.remindersDueToday) if (r.count > 0) lines.push(`${r.memberName} has ${r.count} reminder${r.count === 1 ? "" : "s"} due today.`);
  for (const d of i.upcomingDeadlines) lines.push(`${d.memberName}'s ${d.label} is ${d.whenLabel}.`);
  for (const t of i.openAdultTasks) lines.push(`${t.memberName} still needs to ${t.label}.`);
  if (i.checklistName && typeof i.checklistPct === "number") lines.push(`The ${i.checklistName} is ${i.checklistPct}% complete.`);
  return lines;
}

// ── Notifications ───────────────────────────────────────────────
export const NOTIFICATION_CHANNELS = [
  { id: "in_app", label: "In-app notifications", available: true },
  { id: "email", label: "Email notifications", available: true },
  { id: "push", label: "Push notifications", available: false }, // future
  { id: "sms", label: "SMS notifications", available: true },     // optional
] as const;

export type NotifyPrefs = Partial<Record<"in_app" | "email" | "push" | "sms", boolean>>;
export function activeChannels(prefs: NotifyPrefs): string[] {
  return NOTIFICATION_CHANNELS.filter((c) => c.available && prefs[c.id as keyof NotifyPrefs]).map((c) => c.id);
}

// ── Privacy (non-negotiable) ────────────────────────────────────
export const PRIVACY_GUARANTEES = [
  "Magical Moments never tracks a person's physical location without their explicit consent.",
  "No live location tracking.",
  "No hidden monitoring.",
  "No surveillance.",
] as const;

/** Location tracking is not a feature of the Family Command Center — ever. */
export function locationTrackingAllowed(): false {
  return false;
}

export const FAMILY_COMMAND = {
  name: "Family Command Center",
  philosophy: "Families become stronger when everyone knows what's happening, what's expected, and how they can support one another — without invading anyone's privacy.",
  mission: "Help families feel more connected — not more controlled — with kindness, clarity, and purpose.",
} as const;
