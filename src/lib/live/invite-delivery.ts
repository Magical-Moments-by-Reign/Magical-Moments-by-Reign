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
import { isOptedOut } from "./sms-consent";
import type { LiveInviteRecord } from "./invites";
import type { LiveRoomRecord } from "./rooms";
import type { ReminderKey } from "./invite-core";

export function emailConfigured(): boolean {
  return preflight({ RESEND_API_KEY: process.env.RESEND_API_KEY }).canSend;
}

// SMS is real when Twilio credentials + a sending identity exist. Until then
// this is false and we never fake a send.
export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID),
  );
}

// Send an SMS through Twilio's transactional API. Never sends from a member's
// personal number — always the account's approved sending identity.
async function sendSms(to: string, body: string): Promise<{ sent: boolean; error?: string; id?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const svc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || (!from && !svc)) return { sent: false, error: "sms_not_connected" };
  const params = new URLSearchParams();
  params.set("To", to);
  if (svc) params.set("MessagingServiceSid", svc); else params.set("From", from!);
  params.set("Body", body);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    if (res.ok && (data as { sid?: string }).sid) return { sent: true, id: (data as { sid: string }).sid };
    return { sent: false, error: `twilio_${res.status}` };
  } catch {
    return { sent: false, error: "twilio_network" };
  }
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
    return finish(invite.id, res.sent, res.sent ? undefined : (res.error || (res.skipped ? "email_skipped" : "email_failed")), res.id);
  }

  if (invite.channel === "sms") {
    if (!invite.phone) return finish(invite.id, false, "no_phone");
    if (!smsConfigured()) return finish(invite.id, false, "sms_not_connected");
    // U.S. compliance: never message a number that has opted out.
    if (await isOptedOut(invite.phone)) return finish(invite.id, false, "opted_out");
    // Real send via Twilio, with a required opt-out instruction.
    const body = `${buildInviteSms(content)} Reply STOP to opt out.`;
    const res = await sendSms(invite.phone, body);
    return finish(invite.id, res.sent, res.sent ? undefined : (res.error || "sms_failed"), res.id);
  }

  return finish(invite.id, false, "unknown_channel");
}

async function finish(inviteId: string, ok: boolean, reason?: string, messageId?: string): Promise<DeliveryOutcome> {
  await recordDelivery(inviteId, ok, reason ?? null, messageId);
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
