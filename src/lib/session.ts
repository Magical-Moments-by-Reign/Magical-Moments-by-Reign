// ── Current user (Account-bridged) ──────────────────────────────
// Account is now the canonical customer identity. The legacy dashboard is keyed
// on the older `User` model, so this resolves the signed-in Account to its
// bridged legacy User (see src/lib/dashboard-identity.ts). There is NO demo /
// fake login anymore — an unauthenticated caller is redirected to /login.
// Existing dashboard code keeps calling getCurrentUser()/getCurrentUserId()
// unchanged; the identity underneath is real.

import { prisma } from "@/lib/db";
import { getDashboardIdentity } from "@/lib/dashboard-identity";

export async function getCurrentUserId(): Promise<string> {
  const { userId } = await getDashboardIdentity();
  return userId;
}

export async function getCurrentUser() {
  const { userId } = await getDashboardIdentity();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Bridged dashboard user not found");
  return user;
}
