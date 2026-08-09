// ── Magical Live — invitation service (SERVER ONLY) ─────────────
//
// Ownership-scoped guest invitations for a Live room. Members add guests
// by email/phone or from existing lists; Magical Moments mints a secure
// per-guest token, tracks status, and (via invite-delivery) sends the
// branded invitation. Guests never touch Agora channel data.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getOwnedRoom } from "./rooms";
import {
  normalizeEmail, normalizePhone, resolveDelivery, shouldAdvanceInvite,
  type RawRecipient, type LiveInviteStatus, type ReminderKey, type InviteChannel, type PreferredMethod,
} from "./invite-core";

export interface LiveInviteRecord {
  id: string;
  roomId: string;
  accountId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: "email" | "sms";
  token: string;
  status: LiveInviteStatus;
  remindersSent: ReminderKey[];
  lastError: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  joinedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function hydrate(row: any): LiveInviteRecord {
  let remindersSent: ReminderKey[] = [];
  try { remindersSent = JSON.parse(row.remindersSent || "[]"); } catch { remindersSent = []; }
  return { ...row, status: row.status as LiveInviteStatus, channel: row.channel as "email" | "sms", remindersSent };
}

/** 48-char URL-safe hex token — unguessable, matches invite-core's shape check. */
export function newInviteToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Add guests to a room the account owns. Recipients are normalized and
 * deduped against each other AND against existing invites for the room, so
 * there's never duplicate data entry. Unreachable entries (no email/phone)
 * are skipped. Returns the newly-created invites (not yet sent).
 */
export async function addInvites(accountId: string, roomId: string, raw: RawRecipient[]): Promise<LiveInviteRecord[]> {
  const room = await getOwnedRoom(accountId, roomId);
  if (!room) return [];

  // Normalize + dedupe by identity (email, else phone), keeping the name and
  // the contact's preferred delivery method.
  const seen = new Set<string>();
  const people: { name: string | null; email: string | null; phone: string | null; preferred: PreferredMethod }[] = [];
  for (const r of raw) {
    const email = normalizeEmail(r.email);
    const phone = normalizePhone(r.phone);
    const key = email ?? phone;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    people.push({ name: r.name?.trim() || null, email, phone, preferred: (r.preferredMethod ?? "ask") as PreferredMethod });
  }
  if (people.length === 0) return [];

  // Existing invites → avoid duplicates per (identity, channel). "Both" yields
  // two independently-tracked invites (email + sms) for the same person.
  const existing = await prisma.liveInvite.findMany({ where: { roomId }, select: { email: true, phone: true, channel: true } });
  const taken = new Set<string>();
  for (const e of existing) {
    const id = e.email ?? e.phone;
    if (id) taken.add(`${id}|${e.channel}`);
  }

  const created: LiveInviteRecord[] = [];
  for (const p of people) {
    const plan = resolveDelivery({ email: p.email, phone: p.phone, preferredMethod: p.preferred }, null);
    // Bulk add can't prompt inline; "ask" with both channels defaults to email,
    // and the host can switch that invite to text from the guest list.
    const channels: InviteChannel[] = plan.needsPrompt ? ["email"] : plan.channels;
    const identity = p.email ?? p.phone!;
    for (const ch of channels) {
      const contact = ch === "email" ? p.email : p.phone;
      if (!contact || taken.has(`${identity}|${ch}`)) continue;
      taken.add(`${identity}|${ch}`);
      const row = await prisma.liveInvite.create({
        data: { roomId, accountId, name: p.name, email: p.email, phone: p.phone, channel: ch, token: newInviteToken(), status: "PENDING" },
      });
      created.push(hydrate(row));
    }
  }
  return created;
}

/** Switch an invite to the other channel (email ↔ sms) and retry delivery.
 *  Used for the "could not be delivered — send by email instead?" flow. */
export async function switchInviteChannel(accountId: string, inviteId: string, to: InviteChannel): Promise<LiveInviteRecord | null> {
  const row = await prisma.liveInvite.findFirst({ where: { id: inviteId, accountId } });
  if (!row) return null;
  // Only allow switching to a channel we actually have a contact for.
  if (to === "email" && !row.email) return null;
  if (to === "sms" && !row.phone) return null;
  const updated = await prisma.liveInvite.update({ where: { id: inviteId }, data: { channel: to, status: "PENDING", lastError: null } });
  return hydrate(updated);
}

/** All invites for a room the account owns, newest first. */
export async function listInvites(accountId: string, roomId: string): Promise<LiveInviteRecord[]> {
  const room = await getOwnedRoom(accountId, roomId);
  if (!room) return [];
  const rows = await prisma.liveInvite.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } });
  return rows.map(hydrate);
}

export interface InviteCounts { invited: number; sent: number; delivered: number; opened: number; joined: number; declined: number; revoked: number; }
export function countInvites(invites: LiveInviteRecord[]): InviteCounts {
  const c: InviteCounts = { invited: 0, sent: 0, delivered: 0, opened: 0, joined: 0, declined: 0, revoked: 0 };
  for (const i of invites) {
    if (i.status === "REVOKED") { c.revoked++; continue; }
    c.invited++;
    if (i.sentAt) c.sent++;
    if (i.deliveredAt) c.delivered++;
    if (i.openedAt) c.opened++;
    if (i.status === "JOINED") c.joined++;
    if (i.status === "DECLINED") c.declined++;
  }
  return c;
}

/** Look up an invite by its secure token, scoped to a room. Used to
 *  validate a guest join server-side. Revoked tokens never resolve. */
export async function getInviteByToken(roomId: string, token: string): Promise<LiveInviteRecord | null> {
  if (!token) return null;
  const row = await prisma.liveInvite.findFirst({ where: { roomId, token } });
  if (!row) return null;
  const rec = hydrate(row);
  return rec.status === "REVOKED" ? null : rec;
}

/** Advance an invite's status (monotonic per invite-core rules). Safe to
 *  call from provider webhooks and the join path; never downgrades. */
export async function advanceInviteStatus(inviteId: string, to: LiveInviteStatus): Promise<void> {
  const row = await prisma.liveInvite.findUnique({ where: { id: inviteId } });
  if (!row) return;
  if (!shouldAdvanceInvite(row.status as LiveInviteStatus, to)) return;
  const stamp: Record<string, Date> = {};
  const now = new Date();
  if (to === "SENT") stamp.sentAt = now;
  if (to === "DELIVERED") stamp.deliveredAt = now;
  if (to === "OPENED") stamp.openedAt = now;
  if (to === "JOINED") stamp.joinedAt = now;
  if (to === "DECLINED") stamp.declinedAt = now;
  if (to === "REVOKED") stamp.revokedAt = now;
  await prisma.liveInvite.update({ where: { id: inviteId }, data: { status: to, ...stamp } });
}

/** Mark the guest holding this token as JOINED (called after a valid join). */
export async function markInviteJoinedByToken(roomId: string, token: string): Promise<void> {
  const inv = await getInviteByToken(roomId, token);
  if (inv) await advanceInviteStatus(inv.id, "JOINED");
}

/** Host removes a guest's access. Their token stops resolving immediately. */
export async function revokeInvite(accountId: string, inviteId: string): Promise<boolean> {
  const row = await prisma.liveInvite.findFirst({ where: { id: inviteId, accountId } });
  if (!row) return false;
  await prisma.liveInvite.update({ where: { id: inviteId }, data: { status: "REVOKED", revokedAt: new Date() } });
  return true;
}

/** Owner-scoped fetch of a single invite (for resend/reminders). */
export async function getOwnedInvite(accountId: string, inviteId: string): Promise<LiveInviteRecord | null> {
  const row = await prisma.liveInvite.findFirst({ where: { id: inviteId, accountId } });
  return row ? hydrate(row) : null;
}

/** Record delivery outcome from invite-delivery. */
export async function recordDelivery(inviteId: string, ok: boolean, error: string | null, messageId?: string | null): Promise<void> {
  if (ok) {
    await advanceInviteStatus(inviteId, "SENT");
    await prisma.liveInvite.update({ where: { id: inviteId }, data: { lastError: null, ...(messageId ? { providerMessageId: messageId } : {}) } }).catch(() => {});
  } else {
    await advanceInviteStatus(inviteId, "FAILED");
    await prisma.liveInvite.update({ where: { id: inviteId }, data: { lastError: error ?? "delivery_failed" } }).catch(() => {});
  }
}

/** Advance an invite located by its provider message id (delivery/open
 *  webhooks). No-op if the id isn't ours or the transition isn't allowed. */
export async function advanceInviteByProviderId(messageId: string, to: LiveInviteStatus): Promise<void> {
  if (!messageId) return;
  const row = await prisma.liveInvite.findFirst({ where: { providerMessageId: messageId }, select: { id: true } });
  if (row) await advanceInviteStatus(row.id, to);
}

/** Mark a reminder key as sent for an invite (dedup of reminders). */
export async function recordReminderSent(inviteId: string, key: ReminderKey): Promise<void> {
  const row = await prisma.liveInvite.findUnique({ where: { id: inviteId }, select: { remindersSent: true } });
  if (!row) return;
  let sent: ReminderKey[] = [];
  try { sent = JSON.parse(row.remindersSent || "[]"); } catch { sent = []; }
  if (sent.includes(key)) return;
  sent.push(key);
  await prisma.liveInvite.update({ where: { id: inviteId }, data: { remindersSent: JSON.stringify(sent) } });
}
