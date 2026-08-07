// ── Unified Family Website — data service (DB shell) ────────────
//
// Thin, ownership-aware layer around the pure structure in family-website.ts.
// ALL taxonomy / grouping / privacy LOGIC lives in the pure module (unit
// tested); here we only fetch, map, and enforce ownership at the query level.
//
// Route-resolution correctness (per spec §6): every resolver verifies the
// family exists, the slug matches, the Journey belongs to the family, the
// occasion belongs to that Journey AND family, drafts never leak publicly,
// and private content returns an appropriate "hidden" result — never a crash.

import { prisma } from "@/lib/db";
import { getExperienceBySlug } from "@/lib/experiences";
import type { HydratedExperience } from "@/lib/serialize";
import {
  groupIntoJourneys, parseJourneySettings, normalizeVisibility, sectionForType,
  occasionAccess, journeyListedPublicly, getJourneySection,
  familySlugFrom, type OccasionCard, type JourneyCard, type Visibility,
} from "@/lib/family-website";

export interface FamilyWebsite {
  family: { id: string; name: string; slug: string | null; visibility: Visibility };
  journeys: JourneyCard[];
  isOwner: boolean;
}

const EXPERIENCE_SELECT = {
  id: true, slug: true, type: true, title: true, subtitle: true,
  status: true, visibility: true, eventDate: true, updatedAt: true,
  _count: { select: { media: true } },
  media: { where: { kind: "IMAGE" }, orderBy: { createdAt: "asc" as const }, take: 1, select: { url: true } },
} as const;

type ExperienceRow = {
  id: string; slug: string; type: string; title: string; subtitle: string | null;
  status: string; visibility: string; eventDate: Date | null; updatedAt: Date;
  _count: { media: number }; media: { url: string }[];
};

function toOccasionCard(r: ExperienceRow): OccasionCard {
  return {
    id: r.id, slug: r.slug, type: r.type, title: r.title, subtitle: r.subtitle,
    status: r.status, visibility: normalizeVisibility(r.visibility),
    eventDate: r.eventDate ? r.eventDate.toISOString() : null,
    updatedAt: r.updatedAt.toISOString(),
    mediaCount: r._count.media,
    coverImage: r.media[0]?.url ?? null,
  };
}

async function loadFamilyBySlug(slug: string) {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  // slug is indexed but not a DB unique constraint (uniqueness is enforced in
  // the backfill), so this is a findFirst rather than findUnique.
  return prisma.family.findFirst({
    where: { slug: clean },
    select: {
      id: true, name: true, slug: true, visibility: true, journeySettings: true,
      experiences: { select: EXPERIENCE_SELECT },
    },
  });
}

/**
 * Resolve a family website for a PUBLIC visitor by its slug. Returns null when
 * the slug is unknown or the family is PRIVATE. Only publicly listable content
 * is surfaced; journey/occasion privacy is applied in the pure grouping.
 */
export async function getPublicFamilyWebsite(slug: string): Promise<FamilyWebsite | null> {
  const family = await loadFamilyBySlug(slug);
  if (!family) return null;
  const familyVisibility = normalizeVisibility(family.visibility);
  if (familyVisibility === "PRIVATE") return null; // owners preview via the dashboard

  const occasions = family.experiences.map(toOccasionCard);
  return {
    family: { id: family.id, name: family.name, slug: family.slug, visibility: familyVisibility },
    journeys: groupIntoJourneys(occasions, {
      viewerIsOwner: false,
      familyVisibility,
      journeySettings: parseJourneySettings(family.journeySettings),
    }),
    isOwner: false,
  };
}

/**
 * Resolve the signed-in account's own family website (owner view — every
 * occasion, every status/visibility). Ownership is established by the
 * canonical accountId on the family's experiences.
 */
export async function getFamilyWebsiteForAccount(accountId: string): Promise<FamilyWebsite | null> {
  const owned = await prisma.experience.findFirst({
    where: { accountId }, select: { familyId: true }, orderBy: { updatedAt: "desc" },
  });
  if (!owned?.familyId) return null;

  const family = await prisma.family.findUnique({
    where: { id: owned.familyId },
    select: {
      id: true, name: true, slug: true, visibility: true, journeySettings: true,
      experiences: { select: EXPERIENCE_SELECT },
    },
  });
  if (!family) return null;

  const familyVisibility = normalizeVisibility(family.visibility);
  const occasions = family.experiences.map(toOccasionCard);
  return {
    family: { id: family.id, name: family.name, slug: family.slug, visibility: familyVisibility },
    journeys: groupIntoJourneys(occasions, {
      viewerIsOwner: true, familyVisibility, journeySettings: parseJourneySettings(family.journeySettings),
    }),
    isOwner: true,
  };
}

// ── single-Journey resolution ───────────────────────────────────

export type JourneyResult =
  | { status: "ok"; family: FamilyWebsite["family"]; journey: JourneyCard }
  | { status: "not_found" };

/**
 * Resolve one Journey section of a family for a PUBLIC visitor. The Journey
 * must exist in the catalog, the family must resolve, and the Journey must be
 * publicly listed (PUBLIC under a non-private family) — otherwise "not_found",
 * so unlisted/private Journeys don't leak.
 */
export async function getPublicFamilyJourney(familySlug: string, journeyId: string): Promise<JourneyResult> {
  if (!getJourneySection(journeyId)) return { status: "not_found" };
  const family = await loadFamilyBySlug(familySlug);
  if (!family) return { status: "not_found" };
  const familyVisibility = normalizeVisibility(family.visibility);
  if (familyVisibility === "PRIVATE") return { status: "not_found" };

  const settings = parseJourneySettings(family.journeySettings);
  const journeyVis = settings[journeyId]?.visibility ?? "PUBLIC";
  if (!journeyListedPublicly(familyVisibility, journeyVis)) return { status: "not_found" };

  const occasions = family.experiences.map(toOccasionCard);
  const journeys = groupIntoJourneys(occasions, { viewerIsOwner: false, familyVisibility, journeySettings: settings });
  const journey = journeys.find((j) => j.id === journeyId);
  if (!journey) return { status: "not_found" };
  return {
    status: "ok",
    family: { id: family.id, name: family.name, slug: family.slug, visibility: familyVisibility },
    journey,
  };
}

// ── single-occasion resolution (nested route) ───────────────────

export type OccasionResult =
  | { status: "ok"; family: { name: string; slug: string | null }; journeyId: string; experience: HydratedExperience }
  | { status: "not_found" };

/**
 * Resolve a nested occasion: /family/[slug]/[journey]/[occasionSlug].
 * Verifies (in order): family exists → occasion exists AND belongs to this
 * family → occasion belongs to THIS Journey → access is allowed by the
 * three-level privacy rule. Any failure returns "not_found" (no existence
 * leak, no crash). `viewerAccountId` grants owner view when it matches the
 * occasion's canonical account.
 */
export async function getFamilyOccasion(
  familySlug: string,
  journeyId: string,
  occasionSlug: string,
  viewerAccountId?: string | null,
): Promise<OccasionResult> {
  if (!getJourneySection(journeyId)) return { status: "not_found" };

  const family = await prisma.family.findFirst({
    where: { slug: familySlug.trim().toLowerCase() },
    select: { id: true, name: true, slug: true, visibility: true, journeySettings: true },
  });
  if (!family) return { status: "not_found" };

  // The occasion must belong to THIS family (ownership at the query level).
  const occ = await prisma.experience.findFirst({
    where: { slug: occasionSlug, familyId: family.id },
    select: { id: true, slug: true, type: true, status: true, visibility: true, accountId: true },
  });
  if (!occ) return { status: "not_found" };

  // The occasion must belong to THIS Journey section.
  if (sectionForType(occ.type) !== journeyId) return { status: "not_found" };

  const familyVisibility = normalizeVisibility(family.visibility);
  const journeyVis = parseJourneySettings(family.journeySettings)[journeyId]?.visibility ?? "PUBLIC";
  const viewerIsOwner = Boolean(viewerAccountId && occ.accountId && occ.accountId === viewerAccountId);

  const decision = occasionAccess({
    familyVisibility,
    journeyVisibility: journeyVis,
    occasionVisibility: normalizeVisibility(occ.visibility),
    occasionStatus: occ.status,
    viewerIsOwner,
  });
  if (decision === "hidden") return { status: "not_found" };

  const experience = await getExperienceBySlug(occasionSlug);
  if (!experience) return { status: "not_found" };
  return { status: "ok", family: { name: family.name, slug: family.slug }, journeyId, experience };
}

/**
 * Ensure a family has a website slug, deriving a unique one from its name.
 * Idempotent + STABLE: once a slug exists it is never regenerated (a family
 * rename does not change the slug). Collision-safe via numeric suffixes.
 */
export async function ensureFamilySlug(familyId: string, name: string): Promise<string> {
  const existing = await prisma.family.findUnique({ where: { id: familyId }, select: { slug: true } });
  if (existing?.slug) return existing.slug; // stable — never regenerated

  const base = familySlugFrom(name);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.family.findFirst({ where: { slug: candidate }, select: { id: true } });
    if (!clash) break;
    n += 1;
    candidate = `${base}-${n}`;
  }
  await prisma.family.update({ where: { id: familyId }, data: { slug: candidate } });
  return candidate;
}
