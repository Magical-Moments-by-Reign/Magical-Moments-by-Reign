// ── Tributes ────────────────────────────────────────────────────
// Family messages and In-Loving-Memory poems left by loved ones on an
// experience (memorial and beyond). Public submissions.

import { prisma } from "@/lib/db";

export type TributeKind = "message" | "poem";

export interface CreateTributeInput {
  slug: string;
  kind: TributeKind;
  name: string;
  relationship?: string;
  body: string;
}

export async function listTributes(experienceId: string, kind?: TributeKind) {
  return prisma.tribute.findMany({
    where: { experienceId, status: "PUBLISHED", ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTribute(input: CreateTributeInput) {
  const exp = await prisma.experience.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (!exp) throw new Error("Experience not found.");
  const name = input.name.trim().slice(0, 80);
  const body = input.body.trim().slice(0, 4000);
  if (!name || !body) throw new Error("Name and message are required.");
  return prisma.tribute.create({
    data: {
      experienceId: exp.id,
      kind: input.kind === "poem" ? "poem" : "message",
      name,
      relationship: input.relationship?.trim().slice(0, 60) || null,
      body,
    },
  });
}
