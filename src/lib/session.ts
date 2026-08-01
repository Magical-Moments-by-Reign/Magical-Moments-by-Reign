// ── Current user (auth stand-in) ────────────────────────────────
// Real authentication arrives in Phase 1. Until then, the Social
// Studio operates as the seeded demo account so the feature is fully
// usable. Everything is written against a userId, so swapping this for
// real sessions later is a one-function change.

import { prisma } from "@/lib/db";

const DEMO_EMAIL = "tabitha@magicalbyreign.com";

export async function getCurrentUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;
  // Fall back to any user, else create the demo account.
  const any = await prisma.user.findFirst();
  if (any) return any;
  return prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Tabitha Turner", role: "ADMIN" },
  });
}

export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  return user.id;
}
