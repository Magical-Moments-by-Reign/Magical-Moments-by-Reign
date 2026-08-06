// ── Unified Family Website — data service (DB shell) ────────────
//
// Thin, ownership-aware layer around the pure structure in family-website.ts.
// Resolves a family's website from the database and groups its occasions into
// the permanent Journey sections. Privacy is enforced here:
//   • Public visitors (no session) see only PUBLIC families and, within them,
//     only PUBLIC + PUBLISHED occasions.
//   • The owner sees their whole website (all statuses/visibilities).
//
// This module is deliberately small: all taxonomy/grouping/privacy LOGIC lives
// in the pure module (unit-tested); here we only fetch + map.

import { prisma } from "@/lib/db";
import {
  groupIntoSections, familySlugFrom, type OccasionCard, type SectionWithOccasions,
} from "@/lib/family-website";

export interface FamilyWebsite {
  family: { id: string; name: string; slug: string | null; visibility: string };
  sections: SectionWithOccasions[];
  isOwner: boolean;
}

const EXPERIENCE_SELECT = {
  id: true, slug: true, type: true, title: true, subtitle: true,
  status: true, visibility: true, eventDate: true,
  _count: { select: { media: true } },
} as const;

type ExperienceRow = {
  id: string; slug: string; type: string; title: string; subtitle: string | null;
  status: string; visibility: string; eventDate: Date | null;
  _count: { media: number };
};

function toOccasionCard(r: ExperienceRow): OccasionCard {
  return {
    id: r.id, slug: r.slug, type: r.type, title: r.title, subtitle: r.subtitle,
    status: r.status, visibility: r.visibility,
    eventDate: r.eventDate ? r.eventDate.toISOString() : null,
    mediaCount: r._count.media,
  };
}

/**
 * Resolve a family website for a PUBLIC visitor by its slug. Returns null when
 * the slug is unknown or the family is PRIVATE. UNLISTED families resolve by
 * direct link (they just aren't discoverable elsewhere). Only publicly visible
 * occasions are included.
 */
export async function getPublicFamilyWebsite(slug: string): Promise<FamilyWebsite | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;

  const family = await prisma.family.findUnique({
    where: { slug: clean },
    select: {
      id: true, name: true, slug: true, visibility: true,
      experiences: { select: EXPERIENCE_SELECT },
    },
  });
  if (!family) return null;
  if (family.visibility === "PRIVATE") return null; // owners preview via the dashboard

  const occasions = family.experiences.map(toOccasionCard);
  return {
    family: { id: family.id, name: family.name, slug: family.slug, visibility: family.visibility },
    sections: groupIntoSections(occasions, { viewerIsOwner: false }),
    isOwner: false,
  };
}

/**
 * Resolve the signed-in account's own family website (owner view — all
 * occasions, every status/visibility). Ownership is established by the
 * canonical accountId on the family's experiences. Returns null if the
 * account has no family yet.
 */
export async function getFamilyWebsiteForAccount(accountId: string): Promise<FamilyWebsite | null> {
  // The account's experiences point at their family; take the most-used one.
  const owned = await prisma.experience.findFirst({
    where: { accountId },
    select: { familyId: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!owned?.familyId) return null;

  const family = await prisma.family.findUnique({
    where: { id: owned.familyId },
    select: {
      id: true, name: true, slug: true, visibility: true,
      experiences: { select: EXPERIENCE_SELECT },
    },
  });
  if (!family) return null;

  const occasions = family.experiences.map(toOccasionCard);
  return {
    family: { id: family.id, name: family.name, slug: family.slug, visibility: family.visibility },
    sections: groupIntoSections(occasions, { viewerIsOwner: true }),
    isOwner: true,
  };
}

/**
 * Ensure a family has a website slug, deriving a unique one from its name.
 * Idempotent: returns the existing slug when already set. Used by the
 * deliberate deploy backfill and future family creation.
 */
export async function ensureFamilySlug(familyId: string, name: string): Promise<string> {
  const existing = await prisma.family.findUnique({ where: { id: familyId }, select: { slug: true } });
  if (existing?.slug) return existing.slug;

  const base = familySlugFrom(name);
  let candidate = base;
  let n = 1;
  // Loop until the slug is unique across families (bounded in practice).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.family.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash) break;
    n += 1;
    candidate = `${base}-${n}`;
  }
  await prisma.family.update({ where: { id: familyId }, data: { slug: candidate } });
  return candidate;
}
