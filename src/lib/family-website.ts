// ── Unified Family Website — structure (pure, config-driven) ─────
//
// Phase 1 foundation. Each client has ONE permanent Magical Moments website
// (e.g. /family/the-johnson-family). Inside it are PERMANENT Journey sections
// (Wedding, Baby, Housing, …). Each Journey holds its occasion pages — the
// individual Experiences the family created.
//
// This module is PURE: it maps and groups plain occasion records into the
// canonical section layout. No prisma, no I/O — so the taxonomy and grouping
// are unit-tested directly and the DB service (family-website-service.ts)
// stays a thin, ownership-checked shell around it.
//
// Permanence: every section is always present in canonical order, even when
// empty — a family website never "loses" a Journey. Nothing expires by date.

import { slugify } from "@/lib/slug";

/** The 12 permanent Journey sections, in the owner's canonical order. */
export interface JourneySection {
  id: string;    // URL segment, e.g. "wedding", "celebration-of-life"
  label: string; // display name, e.g. "Baby Journey"
  blurb: string; // one warm line for the section header
}

export const JOURNEY_SECTIONS: JourneySection[] = [
  { id: "wedding", label: "Wedding", blurb: "Two stories becoming one." },
  { id: "baby", label: "Baby Journey", blurb: "The story of a brand-new life." },
  { id: "housing", label: "Housing", blurb: "From groundbreaking to move-in." },
  { id: "graduation", label: "Graduation", blurb: "The milestone that started everything." },
  { id: "travel", label: "Travel", blurb: "The journeys, kept forever." },
  { id: "family", label: "Family", blurb: "Everyone, together again." },
  { id: "birthday", label: "Birthday", blurb: "Another year worth celebrating." },
  { id: "career", label: "Career", blurb: "A life's work, honored." },
  { id: "military", label: "Military", blurb: "Service, homecoming, and honor." },
  { id: "sports", label: "Sports", blurb: "Every season, every win." },
  { id: "celebration-of-life", label: "Celebration of Life", blurb: "A life remembered with love." },
  { id: "custom", label: "Custom", blurb: "Your one-of-a-kind moments." },
];

const SECTION_BY_ID = new Map(JOURNEY_SECTIONS.map((s) => [s.id, s]));

export function getJourneySection(id: string): JourneySection | undefined {
  return SECTION_BY_ID.get(id);
}

/**
 * Map an Experience `type` to the Journey section it belongs to. Unknown or
 * missing types fall back to "custom" so nothing is ever dropped.
 */
const SECTION_FOR_TYPE: Record<string, string> = {
  // Wedding journey
  wedding: "wedding",
  proposal: "wedding",
  engagement: "wedding",
  bridalshower: "wedding",
  anniversary: "wedding",
  // Baby journey
  baby: "baby",
  babyshower: "baby",
  genderreveal: "baby",
  firstbirthday: "baby",
  // Housing
  newhome: "housing",
  home: "housing",
  moving: "housing",
  // Graduation
  graduation: "graduation",
  prom: "graduation",
  // Travel
  vacation: "travel",
  travel: "travel",
  // Family
  reunion: "family",
  // Birthday
  birthday: "birthday",
  sweet16: "birthday",
  quinceanera: "birthday",
  // Career
  retirement: "career",
  career: "career",
  // Military
  military: "military",
  // Sports
  sports: "sports",
  // Celebration of Life
  memorial: "celebration-of-life",
  // Custom
  custom: "custom",
};

export function sectionForType(type: string | null | undefined): string {
  if (!type) return "custom";
  return SECTION_FOR_TYPE[type.toLowerCase()] ?? "custom";
}

/** A single occasion page as the family website needs to list it. */
export interface OccasionCard {
  id: string;
  slug: string;   // permanent public route: /{slug}
  type: string;
  title: string;
  subtitle: string | null;
  status: string;      // DRAFT | PUBLISHED | ARCHIVED
  visibility: string;  // PUBLIC | UNLISTED | PRIVATE
  eventDate: string | null;
  mediaCount: number;
}

/** A Journey section with the occasions that belong to it. */
export interface SectionWithOccasions extends JourneySection {
  occasions: OccasionCard[];
}

/**
 * Can this occasion be shown on the PUBLIC website (no session)?
 * PUBLIC + PUBLISHED only. Owners see everything via the dashboard;
 * the public site follows privacy settings (acceptance test #10).
 */
export function isPubliclyVisible(o: { visibility: string; status: string }): boolean {
  return o.visibility === "PUBLIC" && o.status === "PUBLISHED";
}

/**
 * Group occasions into the 12 permanent sections, in canonical order. Every
 * section is always returned (even empty). Occasions inside a section are
 * ordered by event date (newest first), then title.
 *
 * `viewerIsOwner` controls privacy: the public site sees only publicly
 * visible occasions; the owner sees all of theirs.
 */
export function groupIntoSections(
  occasions: OccasionCard[],
  opts: { viewerIsOwner: boolean },
): SectionWithOccasions[] {
  const visible = opts.viewerIsOwner ? occasions : occasions.filter(isPubliclyVisible);

  const bySection = new Map<string, OccasionCard[]>();
  for (const o of visible) {
    const sid = sectionForType(o.type);
    const bucket = bySection.get(sid) ?? [];
    bucket.push(o);
    bySection.set(sid, bucket);
  }

  const sortOccasions = (a: OccasionCard, b: OccasionCard) => {
    const da = a.eventDate || "";
    const db = b.eventDate || "";
    if (da && db && da !== db) return da < db ? 1 : -1; // newest first
    if (da && !db) return -1;
    if (!da && db) return 1;
    return a.title.localeCompare(b.title);
  };

  return JOURNEY_SECTIONS.map((s) => ({
    ...s,
    occasions: (bySection.get(s.id) ?? []).sort(sortOccasions),
  }));
}

/** Only the sections that actually have occasions (for compact public nav). */
export function nonEmptySections(sections: SectionWithOccasions[]): SectionWithOccasions[] {
  return sections.filter((s) => s.occasions.length > 0);
}

/** Derive a family website slug from a family name (uniqueness enforced in DB). */
export function familySlugFrom(name: string | null | undefined): string {
  const base = slugify(name || "our-family") || "our-family";
  return base;
}
