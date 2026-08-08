// ── Magical Live — invitation delivery (SERVER ONLY) ────────────
//
// Turns an invite into a real, branded message. Email goes out through the
// existing Resend sender; SMS is HONESTLY GATED — with no SMS provider
// connected we never fake a send, we record an honest reason. Every link
// is a Magical Moments URL carrying the secure per-guest token; Agora
// channel data is never exposed to a guest.

import { sendEmail } from "@/lib/email";
import { preflight } from "@/lib/email-delivery";
import { buildInviteEmail, buildInviteSms, buildReminderEmail, type InviteContent } from "./invite-email";
import { recordDelivery } from "./invites";
import type { LiveInviteRecord } from "./invites";
import type { LiveRoomRecord } from "./rooms";
import type { ReminderKey } from "./invite-core";

export function emailConfigured(): boolean {
  return preflight({ RESEND_API_KEY: process.env.RESEND_API_KEY }).canSend;
}

// SMS has no provider yet. This stays false until real credentials exist;
// when they do, add the provider and flip this — nothing else changes.
export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

/** Public site base URL (no trailing slash). */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL || "https://magicalmomentsbyreign.com";
  return raw.replace(/\/+$/, "");
}

/** The only link a guest ever receives. */
export function joinUrlFor(roomId: string, token: string): string {
  return `${siteBaseUrl()}/live/${roomId}?invite=${encodeURIComponent(token)}`;
}

/** Format the scheduled time in the room's timezone, or null for "now". */
export function whenTextFor(room: Pick<LiveRoomRecord, "scheduledStart" | "settings">): string | null {
  if (!room.scheduledStart) return null;
  const tz = typeof room.settings?.timezone === "string" ? (room.settings.timezone as string) : undefined;
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: tz }).format(room.scheduledStart)
      + (tz ? ` (${tz.replace(/_/g, " ")})` : "");
  } catch {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" }).format(room.scheduledStart);
  }
}

function contentFor(room: LiveRoomRecord, invite: LiveInviteRecord): InviteContent {
  const hostName = (typeof room.settings?.hostName === "string" && room.settings.hostName) || "Your Magical Family";
  const message = typeof room.settings?.eventMessage === "string" ? (room.settings.eventMessage as string) : null;
  return {
    liveTitle: room.title,
    hostName,
    whenText: whenTextFor(room),
    joinUrl: joinUrlFor(room.id, invite.token),
    message,
    brandBaseUrl: siteBaseUrl(),
  };
}

export interface DeliveryOutcome { inviteId: string; ok: boolean; skipped?: boolean; reason?: string }

/** Deliver a single invitation (or reminder) over the invite's channel. */
export async function deliverInvite(room: LiveRoomRecord, invite: LiveInviteRecord, reminder?: ReminderKey): Promise<DeliveryOutcome> {
  const content = contentFor(room, invite);

  if (invite.channel === "email") {
    if (!invite.email) return finish(invite.id, false, "no_email");
    if (!emailConfigured()) return finish(invite.id, false, "email_not_connected");
    const msg = reminder ? buildReminderEmail(reminder, content) : buildInviteEmail(content);
    const res = await sendEmail({ to: invite.email, subject: msg.subject, html: msg.html });
    return finish(invite.id, res.sent, res.sent ? undefined : (res.error || (res.skipped ? "email_skipped" : "email_failed")));
  }

  if (invite.channel === "sms") {
    if (!invite.phone) return finish(invite.id, false, "no_phone");
    if (!smsConfigured()) return finish(invite.id, false, "sms_not_connected");
    // No SMS provider is wired yet. We NEVER fake a send. When a provider
    // is added, build the body with buildInviteSms(content) and call it here.
    void buildInviteSms(content);
    return finish(invite.id, false, "sms_not_connected");
  }

  return finish(invite.id, false, "unknown_channel");
}

async function finish(inviteId: string, ok: boolean, reason?: string): Promise<DeliveryOutcome> {
  await recordDelivery(inviteId, ok, reason ?? null);
  return { inviteId, ok, skipped: !ok && reason === "sms_not_connected", reason };
}

/** Deliver every not-yet-sent invite for a room. Returns per-invite outcomes. */
export async function deliverPending(room: LiveRoomRecord, invites: LiveInviteRecord[]): Promise<DeliveryOutcome[]> {
  const out: DeliveryOutcome[] = [];
  for (const inv of invites) {
    if (inv.status === "REVOKED") continue;
    if (inv.sentAt) continue; // already sent
    out.push(await deliverInvite(room, inv));
  }
  return out;
}
