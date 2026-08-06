// ── Unified Family Website — structure & privacy (pure) ─────────
//
// Phase 1 foundation. Each client has ONE permanent Magical Moments website
// (e.g. /family/the-johnson-family). Inside are PERMANENT Journey sections
// (Wedding, Baby, Housing, …); each Journey holds its occasion pages.
//
// This module is PURE — no prisma, no I/O — so the taxonomy, the rich Journey
// grouping, and (most importantly) the three-level PRIVACY decision are
// unit-tested directly. The DB service is a thin, ownership-checked shell.
//
// THREE PRIVACY LEVELS (independent, never force-inherited):
//   1. Family website  (Family.visibility)
//   2. Journey section (Family.journeySettings[sectionId].visibility)
//   3. Occasion        (Experience.visibility + status)
// A client can keep the site private, share the Wedding, hide the Baby
// Journey, yet make one occasion public — all at once.
//
// Permanence: every section is always present in canonical order, even empty.
// Nothing expires by date.

import { slugify } from "@/lib/slug";

export type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
const VISIBILITIES: Visibility[] = ["PUBLIC", "UNLISTED", "PRIVATE"];

export function normalizeVisibility(v: string | null | undefined): Visibility {
  return v && (VISIBILITIES as string[]).includes(v) ? (v as Visibility) : "PUBLIC";
}

/** The 12 permanent Journey sections, in the owner's canonical order. */
export interface JourneySection {
  id: string;    // URL segment, e.g. "wedding", "celebration-of-life"
  label: string; // display name, e.g. "Baby Journey"
  icon: string;  // icon key (shared vocabulary with experience-types)
  blurb: string; // one warm line for the section header
}

export const JOURNEY_SECTIONS: JourneySection[] = [
  { id: "wedding", label: "Wedding", icon: "rings", blurb: "Two stories becoming one." },
  { id: "baby", label: "Baby Journey", icon: "baby", blurb: "The story of a brand-new life." },
  { id: "housing", label: "Housing", icon: "home", blurb: "From groundbreaking to move-in." },
  { id: "graduation", label: "Graduation", icon: "cap", blurb: "The milestone that started everything." },
  { id: "travel", label: "Travel", icon: "plane", blurb: "The journeys, kept forever." },
  { id: "family", label: "Family", icon: "tree", blurb: "Everyone, together again." },
  { id: "birthday", label: "Birthday", icon: "cake", blurb: "Another year worth celebrating." },
  { id: "career", label: "Career", icon: "sun", blurb: "A life's work, honored." },
  { id: "military", label: "Military", icon: "flag", blurb: "Service, homecoming, and honor." },
  { id: "sports", label: "Sports", icon: "trophy", blurb: "Every season, every win." },
  { id: "celebration-of-life", label: "Celebration of Life", icon: "dove", blurb: "A life remembered with love." },
  { id: "custom", label: "Custom", icon: "sparkle", blurb: "Your one-of-a-kind moments." },
];

const SECTION_BY_ID = new Map(JOURNEY_SECTIONS.map((s) => [s.id, s]));
export function getJourneySection(id: string): JourneySection | undefined {
  return SECTION_BY_ID.get(id);
}

/** Map an Experience `type` to its Journey section. Unknown → "custom". */
const SECTION_FOR_TYPE: Record<string, string> = {
  wedding: "wedding", proposal: "wedding", engagement: "wedding", bridalshower: "wedding", anniversary: "wedding",
  baby: "baby", babyshower: "baby", genderreveal: "baby", firstbirthday: "baby",
  newhome: "housing", home: "housing", moving: "housing",
  graduation: "graduation", prom: "graduation",
  vacation: "travel", travel: "travel",
  reunion: "family",
  birthday: "birthday", sweet16: "birthday", quinceanera: "birthday",
  retirement: "career", career: "career",
  military: "military",
  sports: "sports",
  memorial: "celebration-of-life",
  custom: "custom",
};

export function sectionForType(type: string | null | undefined): string {
  if (!type) return "custom";
  return SECTION_FOR_TYPE[type.toLowerCase()] ?? "custom";
}

/** A single occasion page as the family website needs to list it. */
export interface OccasionCard {
  id: string;
  slug: string;
  type: string;
  title: string;
  subtitle: string | null;
  status: string;      // DRAFT | PUBLISHED | ARCHIVED
  visibility: Visibility;
  eventDate: string | null;
  updatedAt: string;   // for "most recent activity"
  mediaCount: number;
  coverImage: string | null;
}

/** Per-journey owner overrides, stored as JSON on Family.journeySettings. */
export interface JourneySetting { visibility?: Visibility; coverImage?: string; order?: number; }
export type JourneySettings = Record<string, JourneySetting>;

export function parseJourneySettings(json: string | null | undefined): JourneySettings {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return {};
    const out: JourneySettings = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const s = v as Record<string, unknown>;
      out[k] = {
        visibility: typeof s.visibility === "string" ? normalizeVisibility(s.visibility) : undefined,
        coverImage: typeof s.coverImage === "string" ? s.coverImage : undefined,
        order: typeof s.order === "number" ? s.order : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** A Journey section enriched for meaningful cards (dashboard + public). */
export interface JourneyCard extends JourneySection {
  journeyVisibility: Visibility;      // level-2 visibility
  listedPublicly: boolean;            // shows in the public site's nav/home
  coverImage: string | null;
  occasionCount: number;
  publishedCount: number;
  draftCount: number;
  mostRecentActivity: string | null;  // ISO, max updatedAt among occasions
  occasions: OccasionCard[];          // ordered, newest first
}

// ── privacy decisions (the security boundary — heavily tested) ──

/** Whether a single occasion may be viewed by this viewer (direct access). */
export interface AccessInput {
  familyVisibility: Visibility;
  journeyVisibility: Visibility;
  occasionVisibility: Visibility;
  occasionStatus: string;
  viewerIsOwner: boolean;
}
export type AccessDecision = "allow" | "hidden";

/**
 * The definitive access rule for one occasion. "hidden" means the route
 * should render notFound() — we never leak the existence of private/draft
 * content, and never crash.
 */
export function occasionAccess(a: AccessInput): AccessDecision {
  if (a.viewerIsOwner) return "allow";                 // owner sees everything
  if (a.familyVisibility === "PRIVATE") return "hidden";
  if (a.journeyVisibility === "PRIVATE") return "hidden";
  if (a.occasionStatus !== "PUBLISHED") return "hidden"; // drafts never leak
  if (a.occasionVisibility === "PRIVATE") return "hidden";
  // PUBLIC or UNLISTED occasion inside a non-private journey → reachable.
  return "allow";
}

/** Whether a Journey section is listed on the public site (home/nav). */
export function journeyListedPublicly(familyVis: Visibility, journeyVis: Visibility): boolean {
  if (familyVis === "PRIVATE") return false;
  return journeyVis === "PUBLIC";
}

/** Whether an occasion appears in a public LISTING (vs. reachable by direct link). */
export function occasionListedPublicly(o: { visibility: Visibility; status: string }): boolean {
  return o.visibility === "PUBLIC" && o.status === "PUBLISHED";
}

// ── grouping ────────────────────────────────────────────────────

function pickCover(setting: JourneySetting | undefined, occasions: OccasionCard[]): string | null {
  if (setting?.coverImage) return setting.coverImage;
  const withCover = occasions.find((o) => o.coverImage);
  return withCover?.coverImage ?? null;
}

const sortOccasions = (a: OccasionCard, b: OccasionCard) => {
  const da = a.eventDate || "";
  const db = b.eventDate || "";
  if (da && db && da !== db) return da < db ? 1 : -1; // newest event first
  if (da && !db) return -1;
  if (!da && db) return 1;
  return a.title.localeCompare(b.title);
};

/**
 * Group occasions into the 12 permanent Journey cards. Owner view includes
 * everything; public view includes only occasions that are publicly listable,
 * and marks each journey's `listedPublicly` per the privacy rules.
 *
 * Counts (occasion/published/draft) and mostRecentActivity are computed over
 * the occasions INCLUDED for this viewer, so a public card never reveals draft
 * counts.
 */
export function groupIntoJourneys(
  occasions: OccasionCard[],
  opts: { viewerIsOwner: boolean; familyVisibility: Visibility; journeySettings?: JourneySettings },
): JourneyCard[] {
  const settings = opts.journeySettings ?? {};

  const bySection = new Map<string, OccasionCard[]>();
  for (const o of occasions) {
    const sid = sectionForType(o.type);
    const bucket = bySection.get(sid) ?? [];
    bucket.push(o);
    bySection.set(sid, bucket);
  }

  const cards = JOURNEY_SECTIONS.map((s): JourneyCard => {
    const journeyVis = settings[s.id]?.visibility ?? "PUBLIC";
    const all = (bySection.get(s.id) ?? []).slice().sort(sortOccasions);

    const included = opts.viewerIsOwner ? all : all.filter(occasionListedPublicly);
    const mostRecent = included.reduce<string | null>((acc, o) => (!acc || o.updatedAt > acc ? o.updatedAt : acc), null);

    return {
      ...s,
      journeyVisibility: journeyVis,
      listedPublicly: journeyListedPublicly(opts.familyVisibility, journeyVis),
      coverImage: pickCover(settings[s.id], included),
      occasionCount: included.length,
      publishedCount: included.filter((o) => o.status === "PUBLISHED").length,
      draftCount: included.filter((o) => o.status === "DRAFT").length,
      mostRecentActivity: mostRecent,
      occasions: included,
    };
  });

  // Optional owner-defined ordering; otherwise canonical order is preserved.
  return cards.sort((a, b) => {
    const oa = settings[a.id]?.order;
    const ob = settings[b.id]?.order;
    if (oa !== undefined && ob !== undefined && oa !== ob) return oa - ob;
    if (oa !== undefined && ob === undefined) return -1;
    if (oa === undefined && ob !== undefined) return 1;
    return 0; // stable → canonical JOURNEY_SECTIONS order
  });
}

/** Journeys to actually show a PUBLIC visitor: listed + non-empty. */
export function publicJourneys(cards: JourneyCard[]): JourneyCard[] {
  return cards.filter((j) => j.listedPublicly && j.occasionCount > 0);
}

/** Derive a family website slug from a family name (uniqueness enforced in DB). */
export function familySlugFrom(name: string | null | undefined): string {
  return slugify(name || "our-family") || "our-family";
}
