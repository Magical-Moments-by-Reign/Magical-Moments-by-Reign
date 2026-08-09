// ── Magical Discovery — owner curation (SERVER ONLY) ─────────────
// The only writer of DiscoveryFeatured. Every call is ownership-agnostic (the
// content isn't per-member) but every CALLER must have already passed
// requireOwner() — these functions don't re-check the role themselves, same
// as the rest of this codebase's action/service split.

import { prisma } from "@/lib/db";

export type FeaturedSection = "today" | "watch" | "movie" | "music_chart" | "near_you" | "trending";

export interface FeaturedInput {
  section: FeaturedSection;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  externalUrl?: string | null;
  category?: string | null;
  entries?: Array<{ rank: number; song: string; artist: string; url?: string }>;
  startAt?: Date | null;
  endAt?: Date | null;
  featured?: boolean;
  sortOrder?: number;
  createdById?: string | null;
}

export async function listFeatured(section: FeaturedSection) {
  return prisma.discoveryFeatured.findMany({
    where: { section },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export async function createFeatured(input: FeaturedInput) {
  return prisma.discoveryFeatured.create({
    data: {
      section: input.section,
      title: input.title,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      externalUrl: input.externalUrl ?? null,
      category: input.category ?? null,
      entries: JSON.stringify(input.entries ?? []),
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      featured: input.featured ?? true,
      sortOrder: input.sortOrder ?? 0,
      createdById: input.createdById ?? null,
    },
  });
}

export async function updateFeatured(id: string, input: Partial<FeaturedInput>) {
  return prisma.discoveryFeatured.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.entries !== undefined ? { entries: JSON.stringify(input.entries) } : {}),
      ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
      ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
}

export async function deleteFeatured(id: string) {
  return prisma.discoveryFeatured.delete({ where: { id } }).catch(() => null);
}
