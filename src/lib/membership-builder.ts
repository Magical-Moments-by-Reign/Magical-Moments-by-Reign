// ── Membership Builder — Life Experience catalog ────────────────
// A two-level catalog. TOP-LEVEL "Life Experiences" are the chapters a member
// chooses first (each one is a reservable Life Estate / occasion for pricing).
// NESTED "milestones" personalize a chosen chapter — they do NOT add to the
// occasion count or the price; they simply let a member shape the story within
// a chapter. This keeps the selector from overwhelming members with dozens of
// top-level cards. ALL pricing/discount/upgrade logic lives in the canonical
// pricing engine (lib/pricing-engine.ts) — never duplicate pricing here.

export interface Milestone {
  id: string;
  label: string;
}

export interface LifeExperience {
  id: string;
  label: string;
  icon: string; // emoji glyph
  blurb: string;
  /** Background photo for the card. Cards without one fall back to a gradient. */
  photo?: string;
  /** Optional milestones within this chapter (personalization, not priced). */
  milestones: Milestone[];
}

const m = (id: string, label: string): Milestone => ({ id, label });

export const EXPERIENCES: LifeExperience[] = [
  {
    id: "wedding", label: "Wedding Journey", icon: "💍",
    blurb: "Two stories becoming one.", photo: "/story/wedding.jpg",
    milestones: [
      m("proposal", "Proposal"), m("engagement", "Engagement"), m("bridal-shower", "Bridal Shower"),
      m("wedding-day", "Wedding Day"), m("honeymoon", "Honeymoon"), m("vow-renewal", "Vow Renewal"),
    ],
  },
  {
    id: "birthday", label: "Birthday Celebration", icon: "🎂",
    blurb: "Every year, beautifully marked.", photo: "/story/birthday.jpg",
    milestones: [
      m("first-birthday", "First Birthday"), m("sweet-16", "Sweet 16"), m("quinceanera", "Quinceañera"),
      m("18th", "18th Birthday"), m("21st", "21st Birthday"), m("30th", "30th"),
      m("40th", "40th"), m("50th", "50th"),
    ],
  },
  {
    id: "baby", label: "Baby Journey", icon: "🍼",
    blurb: "The first chapter of a new life.", photo: "/story/baby.jpg",
    milestones: [
      m("pregnancy", "Pregnancy"), m("gender-reveal", "Gender Reveal"), m("baby-shower", "Baby Shower"),
      m("birth", "Birth"), m("first-birthday", "First Birthday"),
    ],
  },
  {
    id: "graduation", label: "Graduation Journey", icon: "🎓",
    blurb: "From the last year to the next beginning.", photo: "/story/graduation.jpg",
    milestones: [
      m("senior-year", "Senior Year"), m("prom", "Prom"), m("graduation", "Graduation"),
      m("college-move-in", "College Move-In"),
    ],
  },
  { id: "anniversary", label: "Anniversary", icon: "❤️", blurb: "Love, year after year.", photo: "/story/anniversary.jpg", milestones: [] },
  { id: "travel", label: "Vacation & Travel", icon: "✈️", blurb: "Journeys worth remembering.", photo: "/story/vacation.jpg", milestones: [] },
  { id: "new-home", label: "New Home Journey", icon: "🏡", blurb: "Every home decision, from dream to keys.", photo: "/story/newhome.jpg", milestones: [] },
  { id: "military", label: "Military Homecoming", icon: "🎖️", blurb: "The moment they walk through the door.", photo: "/story/military.jpg", milestones: [] },
  { id: "reunion", label: "Family Reunion", icon: "👨‍👩‍👧‍👦", blurb: "The whole family, together again.", photo: "/story/reunion.jpg", milestones: [] },
  { id: "retirement", label: "Retirement", icon: "🌅", blurb: "A lifetime of work, honored.", photo: "/story/retirement.jpg", milestones: [] },
  { id: "celebration-of-life", label: "Celebration of Life", icon: "🕊️", blurb: "A life remembered with love.", photo: "/story/memorial.jpg", milestones: [] },
  { id: "business", label: "Business", icon: "👔", blurb: "Build your legacy by design.", milestones: [] },
  { id: "legacy", label: "Legacy", icon: "📜", blurb: "Love, preserved for generations.", milestones: [] },
  { id: "relationship", label: "Relationship", icon: "💞", blurb: "The story of you two.", photo: "/story/proposal.jpg", milestones: [] },
  { id: "custom", label: "Custom Life Moment", icon: "✨", blurb: "A chapter all your own.", milestones: [] },
];

/** Look up a top-level experience by id. */
export function getExperience(id: string): LifeExperience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}

// Back-compat: the flat {id,label} list of the TOP-LEVEL experiences, used where
// only the reservable occasion units are needed (pricing count, preview pills).
export interface Occasion {
  id: string;
  label: string;
}
export const OCCASIONS: Occasion[] = EXPERIENCES.map(({ id, label }) => ({ id, label }));
