// ── Membership Builder — Life Journey catalog ───────────────────
// The canonical occasion structure: TWELVE top-level "Journeys" (each a
// reservable occasion for pricing), and within each Journey a set of nested
// sub-occasions ("milestones") that personalize it — they do NOT add to the
// occasion count or the price. This keeps the selector to twelve elegant
// chapters instead of dozens of loose cards. ALL pricing/discount/upgrade logic
// lives in the canonical pricing engine (lib/pricing-engine.ts).

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
  /** Nested sub-occasions within this Journey (personalization, not priced). */
  milestones: Milestone[];
}

const m = (id: string, label: string): Milestone => ({ id, label });

export const EXPERIENCES: LifeExperience[] = [
  {
    id: "relationship", label: "Relationship Journey", icon: "💕",
    blurb: "Everything leading up to marriage and beyond.", photo: "/story/proposal.jpg",
    milestones: [
      m("dating", "Dating"), m("first-date", "First Date"), m("proposal", "Proposal"),
      m("engagement", "Engagement"), m("bridal-shower", "Bridal Shower"),
      m("bachelor-bachelorette", "Bachelor/Bachelorette"), m("wedding", "Wedding"),
      m("honeymoon", "Honeymoon"), m("anniversary", "Anniversary"), m("vow-renewal", "Vow Renewal"),
    ],
  },
  {
    id: "baby", label: "Baby Journey", icon: "👶",
    blurb: "One complete journey from announcement through baby's first year.", photo: "/story/baby.jpg",
    milestones: [
      m("pregnancy-announcement", "Pregnancy Announcement"), m("gender-reveal", "Gender Reveal"),
      m("baby-shower", "Baby Shower"), m("nursery-reveal", "Nursery Reveal"), m("birth-story", "Birth Story"),
      m("welcome-baby", "Welcome Baby"), m("first-holidays", "First Holidays"),
      m("first-birthday", "First Birthday"), m("baby-milestones", "Baby Milestones"),
    ],
  },
  {
    id: "birthday", label: "Birthday Journey", icon: "🎂",
    blurb: "For every birthday celebration.", photo: "/story/birthday.jpg",
    milestones: [
      m("kids-birthdays", "Kids Birthdays"), m("sweet-16", "Sweet 16"), m("quinceanera", "Quinceañera"),
      m("18th-birthday", "18th Birthday"), m("21st-birthday", "21st Birthday"),
      m("adult-milestone-birthdays", "Adult Milestone Birthdays"), m("surprise-parties", "Surprise Parties"),
    ],
  },
  {
    id: "graduation", label: "Graduation Journey", icon: "🎓",
    blurb: "Everything from senior year through graduation.", photo: "/story/graduation.jpg",
    milestones: [
      m("senior-pictures", "Senior Pictures"), m("prom", "Prom"), m("senior-night", "Senior Night"),
      m("college-acceptance", "College Acceptance"), m("scholarships", "Scholarships"),
      m("graduation", "Graduation"), m("graduation-party", "Graduation Party"),
    ],
  },
  {
    id: "home", label: "Home Journey", icon: "🏡",
    blurb: "Every chapter of finding and creating a home.", photo: "/story/newhome.jpg",
    milestones: [
      m("buying-a-home", "Buying a Home"), m("building-a-home", "Building a Home"),
      m("selling-a-home", "Selling a Home"), m("moving", "Moving"), m("rental-journey", "Rental Journey"),
      m("home-renovation", "Home Renovation"), m("housewarming", "Housewarming"),
    ],
  },
  {
    id: "travel", label: "Travel Journey", icon: "✈️",
    blurb: "Every memorable trip.", photo: "/story/vacation.jpg",
    milestones: [
      m("vacation", "Vacation"), m("honeymoon", "Honeymoon"), m("cruise", "Cruise"),
      m("family-trip", "Family Trip"), m("weekend-getaway", "Weekend Getaway"),
      m("international-travel", "International Travel"),
    ],
  },
  {
    id: "military", label: "Military Journey", icon: "🎖",
    blurb: "The complete military experience.", photo: "/story/military.jpg",
    milestones: [
      m("enlistment", "Enlistment"), m("basic-training", "Basic Training"), m("graduation", "Graduation"),
      m("deployment", "Deployment"), m("homecoming", "Homecoming"), m("promotion", "Promotion"),
      m("retirement", "Retirement"),
    ],
  },
  {
    id: "sports", label: "Sports Journey", icon: "🏆",
    blurb: "One journey for every athlete.", photo: "/story/sports.jpg",
    milestones: [
      m("cheer", "Cheer"), m("football", "Football"), m("basketball", "Basketball"),
      m("baseball", "Baseball"), m("soccer", "Soccer"), m("volleyball", "Volleyball"),
      m("dance", "Dance"), m("gymnastics", "Gymnastics"), m("season-highlights", "Season Highlights"),
      m("championships", "Championships"), m("college-signing", "College Signing"),
    ],
  },
  {
    id: "family", label: "Family Journey", icon: "👨‍👩‍👧‍👦",
    blurb: "Family memories and gatherings.", photo: "/story/reunion.jpg",
    milestones: [
      m("family-reunion", "Family Reunion"), m("holiday-celebrations", "Holiday Celebrations"),
      m("family-vacations", "Family Vacations"), m("family-milestones", "Family Milestones"),
      m("generational-stories", "Generational Stories"),
    ],
  },
  {
    id: "career", label: "Career Journey", icon: "💼",
    blurb: "Professional accomplishments.", photo: "/story/career.jpg",
    milestones: [
      m("new-job", "New Job"), m("promotion", "Promotion"), m("business-launch", "Business Launch"),
      m("grand-opening", "Grand Opening"), m("retirement", "Retirement"),
      m("career-milestones", "Career Milestones"),
    ],
  },
  {
    id: "celebration-of-life", label: "Celebration of Life Journey", icon: "🕊",
    blurb: "Honoring loved ones.", photo: "/story/memorial.jpg",
    milestones: [
      m("memorial", "Memorial"), m("obituary", "Obituary"), m("celebration-of-life", "Celebration of Life"),
      m("tribute-gallery", "Tribute Gallery"), m("legacy-stories", "Legacy Stories"),
    ],
  },
  {
    id: "custom", label: "Custom Journey", icon: "✨",
    blurb: "Create your own Magical Moment for any occasion not listed.", photo: "/story/custom.jpg",
    milestones: [],
  },
];

/** Look up a top-level Journey by id. */
export function getExperience(id: string): LifeExperience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}

// Back-compat: the flat {id,label} list of the TOP-LEVEL Journeys, used where
// only the reservable occasion units are needed (pricing count, preview pills).
export interface Occasion {
  id: string;
  label: string;
}
export const OCCASIONS: Occasion[] = EXPERIENCES.map(({ id, label }) => ({ id, label }));
