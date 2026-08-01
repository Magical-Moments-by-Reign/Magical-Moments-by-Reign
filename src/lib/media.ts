// ── Media service ───────────────────────────────────────────────
// Tracks a customer's uploaded photos/videos and their storage usage,
// so plan allowances (see media-limits.ts) can be enforced.

import { prisma } from "@/lib/db";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";

export interface MediaUsage {
  photoBytes: number;
  videoBytes: number;
  photoCount: number;
  videoCount: number;
}

export async function getUsage(experienceId: string): Promise<MediaUsage> {
  const assets = await prisma.mediaAsset.findMany({
    where: { experienceId },
    select: { kind: true, bytes: true },
  });
  const u: MediaUsage = { photoBytes: 0, videoBytes: 0, photoCount: 0, videoCount: 0 };
  for (const a of assets) {
    if (a.kind === "VIDEO") { u.videoBytes += a.bytes; u.videoCount += 1; }
    else { u.photoBytes += a.bytes; u.photoCount += 1; }
  }
  return u;
}

export async function listAssets(experienceId: string) {
  return prisma.mediaAsset.findMany({
    where: { experienceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAsset(input: {
  experienceId: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  storagePath?: string;
  bytes: number;
  caption?: string;
}) {
  return prisma.mediaAsset.create({
    data: {
      experienceId: input.experienceId,
      kind: input.kind,
      url: input.url,
      storagePath: input.storagePath ?? null,
      bytes: input.bytes,
      caption: input.caption ?? null,
    },
  });
}

export async function getAsset(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } });
}

export async function deleteAsset(id: string) {
  return prisma.mediaAsset.delete({ where: { id } });
}

/**
 * Resolve the plan that governs an experience's media allowance.
 * Uses the experience owner's most recent PAID order; falls back to
 * the entry plan so the feature is usable before a purchase clears.
 */
export async function resolvePlanForExperience(experienceId: string): Promise<PlanId> {
  const exp = await prisma.experience.findUnique({
    where: { id: experienceId },
    select: { ownerId: true, owner: { select: { email: true } } },
  });
  const email = exp?.owner?.email;
  if (email) {
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (customer) {
      const order = await prisma.order.findFirst({
        where: { customerId: customer.id, paymentStatus: "PAID", planId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { planId: true },
      });
      if (order?.planId && getPlan(order.planId)) return order.planId as PlanId;
    }
  }
  return "silver";
}
