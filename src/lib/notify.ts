// ── Notification dispatch (server) ──────────────────────────────
// Turns the pure notification planner (src/lib/notifications.ts) into real
// delivery: it registers the Resend email provider, persists the in-app record
// (always — the source of truth), and delivers external channels through the
// available provider or queues them until one exists. Minors resolve to in-app
// only. This is the single entry point every ecosystem calls to notify a member.
//
// SERVER ONLY — imports prisma. Never import from a client component.

import { prisma } from "@/lib/db";
import {
  planDispatch, registerNotificationProvider, getNotificationProvider,
  type OutgoingNotification, type NotificationType, type NotificationPrefs, type ChannelPrefs,
} from "@/lib/notifications";
import { sendEmail, reminderEmail } from "@/lib/email";
import { isChildRole, type PlatformRole } from "@/lib/roles";

// ── Provider registration (Resend for email; SMS/push are future seams) ──
let registered = false;
export function ensureProviders(): void {
  if (registered) return;
  registered = true;
  registerNotificationProvider({
    channel: "email",
    // Only "available" when a real Resend key is configured — otherwise the
    // notification queues (never lost) and email is never shown as active.
    isAvailable: () => !!process.env.RESEND_API_KEY,
    send: async (msg: OutgoingNotification): Promise<boolean> => {
      const to = String(msg.data?._recipientEmail || "");
      if (!to) return false;
      const { subject, html } = reminderEmail({
        name: (msg.data?._recipientName as string) || undefined,
        title: msg.title,
        body: msg.body,
        actionUrl: (msg.data?._actionUrl as string) || undefined,
      });
      const res = await sendEmail({ to, subject, html });
      return res.sent;
    },
  });
}

export interface NotifyInput {
  accountId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  relatedLabel?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a notification to one account. Always stores the in-app record; delivers
 * email when the recipient's prefs allow it AND a provider is available; queues
 * otherwise. Returns the stored Notification id (null if the account is gone).
 */
export async function dispatchNotification(input: NotifyInput): Promise<string | null> {
  ensureProviders();

  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
    select: {
      platformRole: true,
      firstName: true,
      emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 },
      notificationPrefs: { select: { type: true, channels: true } },
    },
  });
  if (!account) return null;

  const isMinor = isChildRole(account.platformRole as PlatformRole);
  const prefs: NotificationPrefs = {};
  for (const p of account.notificationPrefs) {
    try { prefs[p.type as NotificationType] = JSON.parse(p.channels) as ChannelPrefs; } catch { /* ignore malformed */ }
  }
  const primaryEmail = account.emails[0]?.verified ? account.emails[0]?.email : undefined;

  const outgoing: OutgoingNotification = {
    accountId: input.accountId,
    type: input.type,
    title: input.title,
    body: input.body,
    isMinor,
    prefs,
    data: {
      ...(input.data ?? {}),
      _recipientEmail: primaryEmail,
      _recipientName: account.firstName,
      _actionUrl: input.actionUrl,
    },
  };

  const plan = planDispatch(outgoing);

  // In-app record is always stored (source of truth).
  const record = await prisma.notification.create({
    data: {
      accountId: input.accountId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: JSON.stringify(input.data ?? {}),
      channelsPlanned: JSON.stringify(plan.delivered),
      channelsQueued: JSON.stringify(plan.queued),
      actionUrl: input.actionUrl ?? null,
      relatedLabel: input.relatedLabel ?? null,
    },
    select: { id: true },
  });

  // Deliver external channels through their available provider.
  for (const ch of plan.delivered) {
    if (ch === "in_app") continue;
    const provider = getNotificationProvider(ch);
    if (!provider) continue; // safety: treat as queued (already recorded above)
    try { await provider.send(outgoing); } catch { /* delivery failure is non-fatal; in-app remains */ }
  }

  return record.id;
}

// ── Unread count helper (for the nav bell) ──────────────────────
export async function unreadCount(accountId: string): Promise<number> {
  return prisma.notification.count({ where: { accountId, readAt: null, archivedAt: null } });
}
