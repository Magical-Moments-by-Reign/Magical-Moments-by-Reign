// ── My Magical Family — contact book (SERVER ONLY) ──────────────
//
// A member's persistent, reusable contacts. Saved once and selectable for
// every Magical Live invitation, so contact details are never re-entered.
// Ownership is scoped by accountId on every read and write.

import { prisma } from "@/lib/db";
import { normalizeEmail, normalizePhone, type PreferredMethod } from "./invite-core";

export interface MagicalContactRecord {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  groups: string[];
  favorite: boolean;
  preferredMethod: PreferredMethod;
  createdAt: Date;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function hydrate(row: any): MagicalContactRecord {
  let groups: string[] = [];
  try { groups = JSON.parse(row.groups || "[]"); } catch { groups = []; }
  return { ...row, groups, preferredMethod: row.preferredMethod as PreferredMethod };
}

export interface ContactInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  groups?: string[];
  favorite?: boolean;
  preferredMethod?: PreferredMethod;
}

function clean(input: ContactInput) {
  const validMethods: PreferredMethod[] = ["sms", "email", "both", "ask"];
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() || null,
    email: normalizeEmail(input.email) || (input.email?.trim() || null),
    phone: normalizePhone(input.phone) || (input.phone?.trim() || null),
    relationship: input.relationship?.trim() || null,
    groups: JSON.stringify((input.groups ?? []).map((g) => g.trim()).filter(Boolean)),
    favorite: !!input.favorite,
    preferredMethod: validMethods.includes(input.preferredMethod as PreferredMethod) ? (input.preferredMethod as PreferredMethod) : "ask",
  };
}

/** All of a member's contacts, favorites first then alphabetical. */
export async function listContacts(accountId: string, query?: string): Promise<MagicalContactRecord[]> {
  const rows = await prisma.magicalContact.findMany({ where: { accountId } });
  let list = rows.map(hydrate);
  const q = query?.trim().toLowerCase();
  if (q) {
    list = list.filter((c) =>
      [c.firstName, c.lastName, c.email, c.phone, c.relationship, ...c.groups]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  return list.sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    const an = `${a.firstName} ${a.lastName ?? ""}`.trim().toLowerCase();
    const bn = `${b.firstName} ${b.lastName ?? ""}`.trim().toLowerCase();
    return an.localeCompare(bn);
  });
}

export async function getContact(accountId: string, id: string): Promise<MagicalContactRecord | null> {
  const row = await prisma.magicalContact.findFirst({ where: { id, accountId } });
  return row ? hydrate(row) : null;
}

export async function createContact(accountId: string, input: ContactInput): Promise<MagicalContactRecord | null> {
  if (!input.firstName?.trim()) return null;
  const row = await prisma.magicalContact.create({ data: { accountId, ...clean(input) } });
  return hydrate(row);
}

export async function updateContact(accountId: string, id: string, input: ContactInput): Promise<MagicalContactRecord | null> {
  const owned = await prisma.magicalContact.findFirst({ where: { id, accountId }, select: { id: true } });
  if (!owned) return null;
  const row = await prisma.magicalContact.update({ where: { id }, data: clean(input) });
  return hydrate(row);
}

export async function deleteContact(accountId: string, id: string): Promise<boolean> {
  const owned = await prisma.magicalContact.findFirst({ where: { id, accountId }, select: { id: true } });
  if (!owned) return false;
  await prisma.magicalContact.delete({ where: { id } });
  return true;
}

export async function toggleFavorite(accountId: string, id: string): Promise<void> {
  const c = await prisma.magicalContact.findFirst({ where: { id, accountId }, select: { id: true, favorite: true } });
  if (!c) return;
  await prisma.magicalContact.update({ where: { id }, data: { favorite: !c.favorite } });
}
