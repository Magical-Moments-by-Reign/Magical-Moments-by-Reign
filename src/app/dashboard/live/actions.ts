"use server";

// ── Magical Moments Live — host actions ─────────────────────────
// Ownership-checked room lifecycle + invitations. Members create rooms for
// their own occasions, invite their Magical Family, and drive
// SCHEDULED → LIVE → ENDED. Magical Moments sends every invitation; the
// member never copies a raw link or emails guests themselves.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { createRoom, getOwnedRoom, activeRoomForExperience, setStatus } from "@/lib/live/rooms";
import { addInvites, listInvites, getOwnedInvite, revokeInvite, recordReminderSent, switchInviteChannel } from "@/lib/live/invites";
import { deliverInvite, deliverPending } from "@/lib/live/invite-delivery";
import { rememberPreferenceForContact } from "@/lib/live/contacts";
import { parseContactPaste } from "@/lib/live/guest-sources";
import type { RawRecipient, ReminderKey, InviteChannel } from "@/lib/live/invite-core";

// Convert a wall-clock time entered in a given IANA timezone to a UTC instant.
function zonedWallTimeToUtc(wall: string, tz: string): Date | null {
  if (!wall) return null;
  const asUtc = new Date(`${wall}:00Z`);
  if (isNaN(asUtc.getTime())) return null;
  try {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p: Record<string, string> = {};
    for (const part of dtf.formatToParts(asUtc)) p[part.type] = part.value;
    const tzAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const offset = tzAsUtc - asUtc.getTime();
    return new Date(asUtc.getTime() - offset);
  } catch {
    return new Date(wall); // fall back to server-local parse
  }
}

/**
 * Create a Live room (Go Live Now or Schedule a Live) and take the host
 * straight to the Invite Guests screen. Ownership of the occasion is
 * verified inside createRoom.
 */
export async function createLiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const mode = (formData.get("mode") as string) === "schedule" ? "schedule" : "now";
  const experienceId = (formData.get("experienceId") as string)?.trim() || null;
  let title = (formData.get("title") as string)?.trim() || "";

  if (!title && experienceId) {
    const exp = await prisma.experience.findFirst({ where: { id: experienceId, accountId: account.id }, select: { title: true } });
    title = exp?.title ? `${exp.title} — Live` : "Magical Live";
  }
  if (!title) title = "Magical Live";

  const hostName = (formData.get("hostName") as string)?.trim() || [account.firstName, account.lastName].filter(Boolean).join(" ") || "Your Magical Family";
  const eventMessage = (formData.get("eventMessage") as string)?.trim() || null;
  const visibility = (formData.get("visibility") as string) === "unlisted" ? "unlisted" : "private";

  const settings: Record<string, unknown> = {
    hostName,
    eventMessage,
    visibility,
    allowChat: formData.get("allowChat") != null,
    allowReactions: formData.get("allowReactions") != null,
    allowScreenShare: formData.get("allowScreenShare") != null,
    gate: {
      inviteOnly: true, // Magical Live is invite-only by default
      passcode: (formData.get("passcode") as string)?.trim() || null,
      requireName: formData.get("requireName") != null,
      requireContact: false, // honest: contact verification needs a provider
    },
  };

  let scheduledStart: Date | null = null;
  if (mode === "schedule") {
    const tz = (formData.get("timezone") as string)?.trim() || "America/New_York";
    const wall = (formData.get("startAt") as string)?.trim() || ""; // datetime-local "YYYY-MM-DDTHH:mm"
    scheduledStart = zonedWallTimeToUtc(wall, tz);
    settings.timezone = tz;
    settings.reminderPrefs = {
      t24h: formData.get("remind24h") != null,
      t1h: formData.get("remind1h") != null,
      liveNow: formData.get("remindLiveNow") != null,
    };
  }

  // Reuse an already-open room for this occasion instead of duplicating.
  if (experienceId) {
    const existing = await activeRoomForExperience(account.id, experienceId);
    if (existing) redirect(`/dashboard/live/${existing.id}/invite`);
  }

  const room = await createRoom({ accountId: account.id, experienceId, title, scheduledStart, settings });
  if (!room) redirect("/dashboard/live"); // occasion not owned → bail safely
  revalidatePath("/dashboard/live");
  redirect(`/dashboard/live/${room.id}/invite`);
}

/** Add guests (pasted emails/phones + selected saved contacts) and send. */
export async function addInvitesAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const roomId = String(formData.get("roomId") || "");
  if (!roomId) return;

  const recipients: RawRecipient[] = [];
  // Free-text paste
  recipients.push(...parseContactPaste(String(formData.get("paste") || "")));
  // Single add fields
  const oneEmail = String(formData.get("email") || "").trim();
  const onePhone = String(formData.get("phone") || "").trim();
  const oneName = String(formData.get("name") || "").trim() || null;
  if (oneEmail) recipients.push({ name: oneName, email: oneEmail });
  if (onePhone) recipients.push({ name: oneName, phone: onePhone });
  // Selected saved contacts (JSON-encoded checkbox values)
  for (const raw of formData.getAll("sel")) {
    try { recipients.push(JSON.parse(String(raw))); } catch { /* skip malformed */ }
  }

  // Create as PENDING (not sent). The host confirms channels on the
  // delivery-review step, then Magical Moments sends.
  await addInvites(account.id, roomId, recipients);
  revalidatePath(`/dashboard/live/${roomId}/invite`);
  redirect(`/dashboard/live/${roomId}/invite?review=1#review`);
}

/** Delivery review → confirm & send. Applies each guest's chosen channel
 *  (Text / Email / Both), optionally remembers it on their saved contact,
 *  then sends every not-yet-sent invitation. */
export async function sendPendingAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const roomId = String(formData.get("roomId") || "");
  const room = await getOwnedRoom(account.id, roomId);
  if (!room) return;

  const invites = await listInvites(account.id, roomId);
  const pending = invites.filter((i) => !i.sentAt && i.status !== "REVOKED");

  for (const inv of pending) {
    const choice = (String(formData.get(`ch_${inv.id}`) || inv.channel)) as "email" | "sms" | "both";
    const remember = formData.get(`remember_${inv.id}`) != null;

    if (choice === "both") {
      // Ensure a twin invite exists on the other channel (addInvites dedupes
      // by identity+channel, so it only adds the missing one).
      await addInvites(account.id, roomId, [{ name: inv.name, email: inv.email, phone: inv.phone, preferredMethod: "both" }]);
    } else if ((choice === "email" || choice === "sms") && choice !== inv.channel) {
      await switchInviteChannel(account.id, inv.id, choice);
    }
    if (remember) await rememberPreferenceForContact(account.id, { email: inv.email, phone: inv.phone }, choice);
  }

  // Send everything still unsent (includes any twins created above).
  const refreshed = await listInvites(account.id, roomId);
  await deliverPending(room, refreshed.filter((i) => !i.sentAt && i.status !== "REVOKED"));
  revalidatePath(`/dashboard/live/${roomId}/invite`);
}

export async function resendInviteAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const roomId = String(formData.get("roomId") || "");
  const inviteId = String(formData.get("inviteId") || "");
  const room = await getOwnedRoom(account.id, roomId);
  const invite = await getOwnedInvite(account.id, inviteId);
  if (room && invite && invite.status !== "REVOKED") await deliverInvite(room, invite);
  revalidatePath(`/dashboard/live/${roomId}/invite`);
}

/** Switch a failed invite to the other channel and retry delivery. */
export async function switchInviteChannelAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const roomId = String(formData.get("roomId") || "");
  const inviteId = String(formData.get("inviteId") || "");
  const to = String(formData.get("to") || "") as InviteChannel;
  if (to !== "email" && to !== "sms") return;
  const switched = await switchInviteChannel(account.id, inviteId, to);
  if (switched) {
    const room = await getOwnedRoom(account.id, roomId);
    if (room) await deliverInvite(room, switched);
  }
  revalidatePath(`/dashboard/live/${roomId}/invite`);
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const roomId = String(formData.get("roomId") || "");
  const inviteId = String(formData.get("inviteId") || "");
  await revokeInvite(account.id, inviteId);
  revalidatePath(`/dashboard/live/${roomId}/invite`);
}

/** Send a reminder (24h / 1h / live-now) to all active guests, over the
 *  same channel used for their invitation. Deduped per invite. */
export async function sendReminderAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const roomId = String(formData.get("roomId") || "");
  const kind = String(formData.get("kind") || "") as ReminderKey;
  if (!["t24h", "t1h", "liveNow"].includes(kind)) return;
  const room = await getOwnedRoom(account.id, roomId);
  if (!room) return;
  const invites = await listInvites(account.id, roomId);
  for (const inv of invites) {
    if (inv.status === "REVOKED") continue;
    if (inv.remindersSent.includes(kind)) continue;
    const res = await deliverInvite(room, inv, kind);
    if (res.ok) await recordReminderSent(inv.id, kind);
  }
  revalidatePath(`/dashboard/live/${roomId}/invite`);
}

export async function startLiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const id = String(formData.get("roomId") || "");
  if (id) { await setStatus(account.id, id, "LIVE"); revalidatePath(`/live/${id}`); redirect(`/live/${id}`); }
}

export async function endLiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const id = String(formData.get("roomId") || "");
  if (id) { await setStatus(account.id, id, "ENDED"); revalidatePath(`/live/${id}`); redirect("/dashboard/live"); }
}
