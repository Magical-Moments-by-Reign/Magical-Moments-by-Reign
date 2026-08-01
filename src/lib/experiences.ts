// ── Experience service ──────────────────────────────────────────
// The one place experiences are created and fetched inside the master
// application. Creating an experience atomically provisions everything
// the blueprint calls for: unique URL, DB record, design, layout,
// story structure, and navigation.

import { prisma } from "@/lib/db";
import { ensureUniqueSlug } from "@/lib/slug";
import { generateDesignSpec } from "@/lib/design-engine";
import { buildDefaultContent } from "@/lib/content";
import { hydrateExperience, serialize, type HydratedExperience } from "@/lib/serialize";

export interface CreateExperienceInput {
  type: string;
  title: string;
  subtitle?: string;
  desiredSlug?: string;
  eventDate?: Date | null;
  ownerId?: string | null;
  preferences?: Record<string, unknown>;
}

/**
 * Provision a brand-new customer experience inside the master app.
 * Returns the created row's slug so the caller can redirect to it.
 */
export async function createExperience(input: CreateExperienceInput): Promise<HydratedExperience> {
  const slug = await ensureUniqueSlug(input.desiredSlug || input.title);

  // A stable seed drives the deterministic design engine so this
  // experience's look is unique and reproducible.
  const seed = `${slug}-${cheapId()}`;

  const designSpec = await generateDesignSpec(input.type, seed, input.preferences);
  const content = buildDefaultContent({
    type: input.type,
    title: input.title,
    subtitle: input.subtitle,
    seed,
  });

  const row = await prisma.experience.create({
    data: {
      slug,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle ?? null,
      eventDate: input.eventDate ?? null,
      seed,
      status: "PUBLISHED",
      designSpec: serialize(designSpec),
      content: serialize(content),
      ownerId: input.ownerId ?? null,
    },
  });

  return hydrateExperience(row);
}

export async function getExperienceBySlug(slug: string): Promise<HydratedExperience | null> {
  const row = await prisma.experience.findUnique({ where: { slug } });
  return row ? hydrateExperience(row) : null;
}

export async function listExperiences(): Promise<HydratedExperience[]> {
  const rows = await prisma.experience.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(hydrateExperience);
}

/** Re-roll an experience's design (same content, fresh unique look). */
export async function regenerateDesign(slug: string): Promise<HydratedExperience | null> {
  const existing = await prisma.experience.findUnique({ where: { slug } });
  if (!existing) return null;
  const newSeed = `${slug}-${cheapId()}`;
  const designSpec = await generateDesignSpec(existing.type, newSeed);
  const row = await prisma.experience.update({
    where: { slug },
    data: { seed: newSeed, designSpec: serialize(designSpec) },
  });
  return hydrateExperience(row);
}

// Small non-crypto id for seeds (deterministic engine does the rest).
function cheapId(): string {
  return Math.abs(hash(String(Date.now()) + Math.random())).toString(36).slice(0, 8);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
