// ── Notifications — one shared delivery service ─────────────────
// A single notification service every completed ecosystem uses instead of
// duplicating its own delivery logic: celebration/task/appointment reminders,
// education & scholarship deadlines, vendor compliance alerts, trial & billing
// notices, domain-renewal notices, messages, invitations, achievements, RSVPs.
//
// Channels: in-app (always available), email (Resend seam), SMS (optional
// provider), push (future). Delivery is provider-agnostic — providers register
// per channel; when none exists the notification still lands in-app and queues
// for later. Per-recipient, per-type preferences decide which channels fire.
// Child safeguards keep minors' notifications in-app + guardian-visible.

export type NotificationChannel = "in_app" | "email" | "sms" | "push";

export type NotificationType =
  | "celebration_reminder" | "task_reminder" | "appointment_reminder"
  | "education_deadline" | "scholarship_deadline" | "vendor_compliance"
  | "trial_billing" | "domain_renewal" | "message" | "invitation"
  | "achievement" | "rsvp" | "reservation_update" | "general"
  | "sports_team_playing_soon" | "sports_game_final" | "sports_prediction_result"
  | "sports_new_matchup" | "sports_streak_achievement";

export interface NotificationTypeDef {
  id: NotificationType;
  label: string;
  category: "celebration" | "organization" | "education" | "vendor" | "billing" | "family" | "system";
  defaultChannels: NotificationChannel[];
}

export const NOTIFICATION_TYPES: NotificationTypeDef[] = [
  { id: "celebration_reminder", label: "Celebration reminders", category: "celebration", defaultChannels: ["in_app", "email"] },
  { id: "task_reminder", label: "Task reminders", category: "organization", defaultChannels: ["in_app"] },
  { id: "appointment_reminder", label: "Appointment reminders", category: "organization", defaultChannels: ["in_app", "email"] },
  { id: "education_deadline", label: "Education deadlines", category: "education", defaultChannels: ["in_app", "email"] },
  { id: "scholarship_deadline", label: "Scholarship deadlines", category: "education", defaultChannels: ["in_app", "email"] },
  { id: "vendor_compliance", label: "Vendor compliance alerts", category: "vendor", defaultChannels: ["in_app", "email"] },
  { id: "trial_billing", label: "Trial & billing notices", category: "billing", defaultChannels: ["in_app", "email"] },
  { id: "domain_renewal", label: "Domain-renewal notices", category: "billing", defaultChannels: ["in_app", "email"] },
  { id: "message", label: "Family messages", category: "family", defaultChannels: ["in_app"] },
  { id: "invitation", label: "Invitations", category: "family", defaultChannels: ["in_app", "email"] },
  { id: "achievement", label: "Achievements", category: "family", defaultChannels: ["in_app"] },
  { id: "rsvp", label: "RSVP updates", category: "family", defaultChannels: ["in_app"] },
  { id: "reservation_update", label: "Concierge & reservation updates", category: "organization", defaultChannels: ["in_app", "email"] },
  { id: "general", label: "General", category: "system", defaultChannels: ["in_app"] },
  { id: "sports_team_playing_soon", label: "Your team plays soon", category: "family", defaultChannels: ["in_app"] },
  { id: "sports_game_final", label: "Followed game final", category: "family", defaultChannels: ["in_app"] },
  { id: "sports_prediction_result", label: "Prediction results", category: "family", defaultChannels: ["in_app"] },
  { id: "sports_new_matchup", label: "New matchups available", category: "family", defaultChannels: ["in_app"] },
  { id: "sports_streak_achievement", label: "Streak & badge achievements", category: "family", defaultChannels: ["in_app"] },
];

export function notificationType(id: NotificationType): NotificationTypeDef | undefined {
  return NOTIFICATION_TYPES.find((t) => t.id === id);
}

// ── Channel availability (providers register to enable email/sms/push) ──
export interface NotificationProvider {
  channel: NotificationChannel;
  isAvailable(): boolean;
  send(msg: OutgoingNotification): Promise<boolean>;
}

const providers: NotificationProvider[] = [];
/** Register one provider per channel (first registration wins). */
export function registerNotificationProvider(p: NotificationProvider): void {
  if (!providers.some((x) => x.channel === p.channel)) providers.push(p);
}

export function channelAvailable(channel: NotificationChannel): boolean {
  if (channel === "in_app") return true; // always
  return providers.some((p) => p.channel === channel && p.isAvailable());
}

/** The registered, available provider for a channel (for the dispatcher). */
export function getNotificationProvider(channel: NotificationChannel): NotificationProvider | undefined {
  return providers.find((p) => p.channel === channel && p.isAvailable());
}

// ── Per-recipient preferences ───────────────────────────────────
export type ChannelPrefs = Partial<Record<NotificationChannel, boolean>>;
export type NotificationPrefs = Partial<Record<NotificationType, ChannelPrefs>>;

/**
 * The channels a notification should attempt, honoring: the type's defaults,
 * channel availability, the recipient's per-type prefs, and child safeguards
 * (minors stay in-app). In-app is always included so nothing is ever lost.
 */
export function resolveChannels(
  type: NotificationType,
  prefs: NotificationPrefs = {},
  opts: { isMinor?: boolean } = {},
): NotificationChannel[] {
  const def = notificationType(type);
  const base: NotificationChannel[] = def ? def.defaultChannels : ["in_app"];
  const typePrefs = prefs[type] ?? {};
  const chosen = base.filter((ch) => {
    if (ch === "in_app") return true;                 // always kept
    if (opts.isMinor) return false;                   // minors: in-app only
    if (!channelAvailable(ch)) return false;          // provider must exist
    return typePrefs[ch] !== false;                   // opt-out respected
  });
  return chosen.includes("in_app") ? chosen : ["in_app", ...chosen];
}

// ── Dispatch (in-app always stored; external channels via providers) ──
export interface OutgoingNotification {
  accountId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isMinor?: boolean;
  prefs?: NotificationPrefs;
}

export interface DispatchResult {
  storedInApp: boolean;      // always true — the in-app record is the source of truth
  delivered: NotificationChannel[];
  queued: NotificationChannel[];
}

/**
 * Decide delivery for a notification. In-app is always stored. Other resolved
 * channels are delivered if a provider is available, else queued for retry.
 * Pure planning (no I/O) — the caller persists + calls providers.
 */
export function planDispatch(n: OutgoingNotification): DispatchResult {
  const channels = resolveChannels(n.type, n.prefs, { isMinor: n.isMinor });
  const delivered: NotificationChannel[] = [];
  const queued: NotificationChannel[] = [];
  for (const ch of channels) {
    if (ch === "in_app") continue;
    (channelAvailable(ch) ? delivered : queued).push(ch);
  }
  return { storedInApp: true, delivered, queued };
}
