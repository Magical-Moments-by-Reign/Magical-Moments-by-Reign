// ── SMS consent / opt-out (SERVER ONLY) ─────────────────────────
//
// U.S. messaging compliance: a phone that texts STOP is suppressed and
// never messaged again until it texts START. Checked before every send.

import { prisma } from "@/lib/db";
import { normalizePhone } from "./invite-core";

export async function isOptedOut(phone: string | null | undefined): Promise<boolean> {
  const e164 = normalizePhone(phone);
  if (!e164) return false;
  const row = await prisma.smsOptOut.findUnique({ where: { phone: e164 } });
  return !!row;
}

export async function optOut(phone: string | null | undefined): Promise<void> {
  const e164 = normalizePhone(phone);
  if (!e164) return;
  await prisma.smsOptOut.upsert({ where: { phone: e164 }, create: { phone: e164 }, update: {} });
}

export async function optIn(phone: string | null | undefined): Promise<void> {
  const e164 = normalizePhone(phone);
  if (!e164) return;
  await prisma.smsOptOut.deleteMany({ where: { phone: e164 } });
}
