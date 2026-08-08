// ── Magical Live — reusable guest sources (SERVER ONLY) ─────────
//
// "No duplicate data entry": pull contacts the member already has so they
// can be selected instead of retyped. We only surface entries with a REAL
// email or phone on file — occasion guest rows that store a *masked*
// contact can't be messaged, so we don't pretend we can reach them.

import { prisma } from "@/lib/db";
import { getOwnedRoom } from "./rooms";
import { normalizeRecipient, type RawRecipient, type Recipient } from "./invite-core";

export interface GuestSourceGroup {
  id: string;
  label: string;
  hint: string;
  people: Recipient[];
}

/** Reusable contact groups for a room the account owns. */
export async function listReusableGuests(accountId: string, roomId: string): Promise<GuestSourceGroup[]> {
  const room = await getOwnedRoom(accountId, roomId);
  if (!room) return [];

  const groups: GuestSourceGroup[] = [];

  if (room.experienceId) {
    // Occasion attendees who RSVP'd with a real contact.
    const rsvps = await prisma.rsvp.findMany({
      where: { experienceId: room.experienceId },
      select: { guestName: true, email: true, phone: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const rsvpPeople = dedupeGroup(rsvps.map((r) => normalizeRecipient({ name: r.guestName, email: r.email, phone: r.phone })));
    if (rsvpPeople.length) {
      groups.push({ id: "occasion-guests", label: "This occasion's guest list", hint: "Everyone who RSVP'd to this occasion", people: rsvpPeople });
    }

    // Saved family & contacts (address book) for the occasion's family.
    const exp = await prisma.experience.findUnique({ where: { id: room.experienceId }, select: { familyId: true } });
    if (exp?.familyId) {
      const contacts = await prisma.trustedContact.findMany({
        where: { familyId: exp.familyId },
        select: { name: true, email: true, phone: true },
        take: 500,
      });
      const contactPeople = dedupeGroup(contacts.map((c) => normalizeRecipient({ name: c.name, email: c.email, phone: c.phone })));
      if (contactPeople.length) {
        groups.push({ id: "saved-contacts", label: "Saved family & contacts", hint: "From your saved contact list", people: contactPeople });
      }
    }
  }

  return groups;
}

function dedupeGroup(list: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of list) {
    const key = r.email ?? r.phone;
    if (!key || !r.channel) continue; // must be reachable
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Parse a free-text paste of emails/phones (commas, spaces, or newlines). */
export function parseContactPaste(raw: string): RawRecipient[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => (token.includes("@") ? { email: token } : { phone: token }));
}
