"use server";

// Marks the first-time guided tour as done (finished OR intentionally skipped),
// so it never auto-offers again. The member can still replay it from Settings.

import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/guard";

export async function completeTourAction(): Promise<void> {
  const account = await requireAccount("/dashboard");
  await prisma.account.update({ where: { id: account.id }, data: { tourCompletedAt: new Date() } });
}
