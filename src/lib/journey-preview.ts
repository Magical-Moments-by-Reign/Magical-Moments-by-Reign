// ── Journey Experience Preview ──────────────────────────────────
// Before buying any Occasion, the customer takes a guided tour — hero,
// Magical AI welcome, what's included, planning timeline, gallery, a
// sample website, FAQ, marketplace, and pricing — so they know exactly
// what they're getting before checkout. See
// docs/design-bible/STANDARD-journey-experience.md.
//
// Content is derived from the experience catalog with per-Occasion flavor
// for the flagship journeys and strong generic fallbacks for the rest, so
// every Occasion gets a real preview page.

import { getExperienceType } from "@/lib/experience-types";

export interface PreviewTimelineItem { when: string; what: string; }
export interface FaqItem { q: string; a: string; }

export interface JourneyPreview {
  typeId: string;
  label: string;
  aiWelcome: string;
  overview: string;
  included: string[];
  timeline: PreviewTimelineItem[];
  faq: FaqItem[];
  /** slug of a seeded sample experience to explore, if one exists */
  sampleSlug?: string;
  /** marketplace categories for this Journey (trusted partners — later phase) */
  marketplace: string[];
}

// A short "duration" line for the Explore Journeys cards + preview.
const DURATION: Record<string, string> = {
  wedding: "A 12-month guided plan", proposal: "From plan to the big moment",
  baby: "Pregnancy through the first year", babyshower: "Plan the celebration",
  genderreveal: "Plan the big reveal", birthday: "Plan in a few weeks",
  firstbirthday: "The whole first year", sweet16: "Plan the big night",
  quinceanera: "Plan the celebration", graduation: "The whole senior year",
  anniversary: "Celebrate the years", newhome: "Blueprint to move-in day",
  vacation: "From first idea to home again", reunion: "Plan the gathering",
  military: "Countdown to reunion", memorial: "A lasting tribute",
  retirement: "The next chapter", sports: "Every season", prom: "Plan the night",
  bridalshower: "Plan the celebration", custom: "A guided journey, your way",
};

export function journeyDuration(typeId: string): string {
  return DURATION[typeId] ?? "A guided journey";
}

// "Continue Your Story" — the natural next chapters for each Journey.
const RELATED: Record<string, string[]> = {
  proposal: ["wedding", "anniversary", "newhome"],
  wedding: ["baby", "newhome", "anniversary"],
  baby: ["firstbirthday", "birthday", "graduation"],
  firstbirthday: ["birthday", "graduation", "sweet16"],
  birthday: ["sweet16", "graduation", "vacation"],
  sweet16: ["graduation", "birthday", "vacation"],
  graduation: ["wedding", "newhome", "vacation"],
  anniversary: ["vacation", "retirement", "newhome"],
  newhome: ["baby", "anniversary", "reunion"],
  vacation: ["anniversary", "reunion", "retirement"],
  reunion: ["vacation", "retirement", "memorial"],
  retirement: ["vacation", "anniversary", "reunion"],
  military: ["newhome", "wedding", "reunion"],
  memorial: ["reunion", "anniversary", "retirement"],
};

export function relatedJourneys(typeId: string): string[] {
  return RELATED[typeId] ?? ["wedding", "baby", "vacation"];
}

// Seeded demo experiences customers can explore as a real sample website.
const SAMPLE_SLUG: Record<string, string> = {
  wedding: "smithwedding",
  baby: "babyolivia",
  birthday: "karlie2027",
  firstbirthday: "karlie2027",
  memorial: "rememberinggrandpajoe",
  vacation: "italy2026",
  newhome: "thejohnsonhome",
};

// Generic, always-true "what's included" for any Journey.
const BASE_INCLUDED = [
  "A beautiful, personalized Journey website",
  "Photo & video galleries",
  "A personalized planning timeline",
  "Guest messages & guestbook",
  "Magical AI planning assistant",
  "Private sharing & privacy controls",
  "Kept forever in your Magical Moments Library",
];

// Generic FAQ built from the Founder's example AI questions.
const BASE_FAQ: FaqItem[] = [
  { q: "What happens after the event?", a: "Nothing is ever lost. Your Journey becomes a permanent chapter in your Magical Moments Library — you can revisit, add to it, and share it for years to come." },
  { q: "Can I invite guests?", a: "Yes. Share a private link with the people you choose, collect their messages and photos, and control exactly who can see what." },
  { q: "Can I upload videos?", a: "Yes — photos and videos both, up to your membership's storage. You can always upgrade for more room." },
  { q: "Can I transfer ownership?", a: "Lifetime memberships can designate a family member to carry the Journey forward, so your family's story continues across generations." },
  { q: "Can I make this private?", a: "Absolutely. Every Journey is private by default; you decide what stays private, what's shared with family, and what's public." },
];

interface Flavor {
  aiWelcome?: string;
  overview?: string;
  included?: string[];
  timeline?: PreviewTimelineItem[];
  faq?: FaqItem[];
  marketplace?: string[];
}

const FLAVOR: Record<string, Flavor> = {
  wedding: {
    aiWelcome: "Hi! Welcome to the Wedding Journey. I'm Magical AI, and I'd love to show you everything included before you decide if this Journey is right for you. Take your time exploring — when you're ready, you can add this Journey to your cart.",
    overview: "The Wedding Journey begins the moment you get engaged and carries you all the way from \"Yes…\" to \"I Do\" — and into married life. A calm, guided experience with personalized planning, your own wedding website, and every memory preserved forever.",
    included: [
      "Personalized planning timeline & countdown",
      "Venue & photographer comparison help",
      "Guest list & RSVP management",
      "Invitations & wedding-party portal",
      "Registry & cash gifts (we never hold funds)",
      "Wedding-day live feed & after-gallery",
      "The transition into married life",
    ],
    timeline: [
      { when: "Month 12", what: "Choose your date" },
      { when: "Month 11", what: "Book your venue" },
      { when: "Month 10", what: "Choose your wedding party" },
      { when: "Month 9", what: "Find your photographer" },
      { when: "Month 6", what: "Invitations & registry" },
      { when: "Month 1", what: "Final details & rehearsal" },
      { when: "Wedding Day", what: "Live feed & celebration" },
      { when: "After", what: "Gallery, anniversaries & married life" },
    ],
    marketplace: ["Venues", "Photographers", "Caterers", "Florists", "DJs & bands", "Wedding planners", "Cake designers", "Rentals", "Officiants", "Honeymoon travel"],
  },
  vacation: {
    aiWelcome: "Welcome to the Vacation Journey. Let's explore everything this Journey can do for you — from planning the perfect trip to preserving every memory.",
    overview: "Plan, build, and remember the whole trip in one place. The Vacation Journey turns your travels into a cinematic story you can relive — with a smart trip builder that connects flights, stay, and adventures into one itinerary.",
    timeline: [
      { when: "Dreaming", what: "Choose your destination & dates" },
      { when: "Planning", what: "Build your itinerary — flights, stay, car" },
      { when: "Booking", what: "Excursions, dining & travel documents" },
      { when: "Packing", what: "Smart packing checklist & budget" },
      { when: "The trip", what: "Capture photos & videos as you go" },
      { when: "After", what: "A cinematic travel story, kept forever" },
    ],
    marketplace: ["Flights", "Hotels", "Cruises", "Vacation packages", "Car rentals", "Travel insurance", "Excursions & tours", "Restaurants", "Passport assistance", "Travel accessories"],
  },
  baby: {
    aiWelcome: "Welcome to the Baby Journey. I'm here to help you preserve every moment — from the first heartbeat onward. Let me show you what's inside.",
    overview: "A living timeline that grows with your little one — from the first heartbeat, through the pregnancy, to first smiles and beyond. Every milestone, gently organized and preserved.",
    marketplace: ["Baby registries", "Nursery & furniture", "Photographers", "Keepsakes", "Baby gear", "Classes & support"],
  },
  newhome: {
    aiWelcome: "Welcome to Housing Hub. Whether you're searching, buying, building, renovating, or moving, I'll guide you every step of the way. Let's explore.",
    overview: "Your complete housing ecosystem — from searching for land to building your dream home, buying, renovating, leasing, or managing property. One trusted guide, every document preserved, from beginning to end.",
    marketplace: ["Realtors", "Mortgage lenders", "Builders", "Architects", "Interior designers", "Contractors", "Inspectors", "Movers", "Home stores"],
  },
  memorial: {
    aiWelcome: "Welcome to the Celebration of Life Journey. This is a warm, personal space to honor a life and the love that remains. Take your time — I'm here to help.",
    overview: "A warm, personal tribute that celebrates who they were — favorite memories, family messages, photos, and a lasting place for loved ones to gather and remember together.",
    marketplace: ["Florists", "Memorial keepsakes", "Celebrants", "Catering", "Printing & programs"],
  },
  graduation: {
    aiWelcome: "Welcome to the Graduation Journey. Let's celebrate this milestone — I'll show you everything included before you decide.",
    overview: "The whole senior story in one place — countdown, memories, blessings, and a registry — a milestone celebrated and preserved for the years ahead.",
    marketplace: ["Photographers", "Announcements & printing", "Party venues", "Caterers", "Gift registries"],
  },
  proposal: {
    aiWelcome: "Welcome to the Proposal Journey. Let me show you how we help you plan — and preserve — the moment everything changes.",
    overview: "The question, the yes, the happy tears — planned beautifully and captured the way it deserves to be, ready to flow right into your Wedding Journey.",
    marketplace: ["Jewelers", "Photographers", "Videographers", "Event planners", "Florists"],
  },
  sports: {
    aiWelcome: "Welcome to the Sports Journey. I'm Magical AI — your recruiting & planning companion. I'll help you preserve every season and navigate the road from youth sports to college and beyond. (Recruiting & NIL guidance is educational only.)",
    overview: "Not just a photo gallery — one living Journey for the athlete that grows every season, from first practice through college, the pros, coaching, and beyond. Every game, award, stat, and milestone becomes part of a permanent Magical Moments Library.",
    included: [
      "Athlete profile & pro-style dashboard",
      "Game Center — a page for every game & season",
      "Highlight Reel Builder (your uploads stay untouched)",
      "Auto-built Athletic Resume (export to PDF)",
      "Recruitment Center — plain-language education & checklists",
      "College Visit Planner & side-by-side compare",
      "Scholarship Hub with deadline reminders",
      "NIL Education Center (educational only)",
      "Coach Portal (parent-controlled permissions)",
      "Parent Dashboard — schedules, travel, forms & expenses",
      "Teammate connections & guestbook",
      "Your athletic story, preserved in your Magical Moments Library",
    ],
    timeline: [
      { when: "Youth sports", what: "Start the profile — first teams & first memories" },
      { when: "Each season", what: "Game Center: stats, film, photos & awards" },
      { when: "Recruiting years", what: "Athletic resume, highlight reel & readiness" },
      { when: "College search", what: "Visits, offers, scholarships & NIL education" },
      { when: "Signing Day", what: "Celebrate the commitment" },
      { when: "College & beyond", what: "College stats, graduation, pro & coaching" },
    ],
    faq: [
      { q: "Does this guarantee recruitment or a scholarship?", a: "No. We help you organize, prepare, and present your athlete's story with checklists and education — but we never guarantee recruitment or scholarships." },
      { q: "Is the recruiting and NIL information advice?", a: "It's educational only — plain-language guidance and checklists, not legal, tax, or financial advice. We encourage consulting the appropriate licensed professional." },
      { q: "Can coaches contribute?", a: "Yes — invited coaches can verify stats, upload film, and write recommendations. Parents control coach permissions." },
      { q: "What happens to my game film and photos?", a: "Your original uploads are never altered. Magical AI can help assemble highlight reels while the originals stay untouched." },
      { q: "Can I export an athletic resume?", a: "Yes — a professional athlete resume builds automatically and exports to PDF." },
      { q: "Does the Journey end after high school?", a: "Never. It continues through college, the pros, and coaching — one permanent Magical Moments Library." },
    ],
    marketplace: ["Showcases & camps", "Recruiting services", "Highlight-video editors", "Sports photographers", "Trainers & coaches", "Equipment", "ACT/SAT test prep", "Sports medicine"],
  },
};

export function previewFor(typeId: string): JourneyPreview | null {
  const t = getExperienceType(typeId);
  if (!t) return null;
  const f = FLAVOR[typeId] ?? {};
  return {
    typeId,
    label: t.label,
    aiWelcome: f.aiWelcome ?? `Welcome to the ${t.label}. I'm Magical AI — let me show you everything included before you decide if this Journey is right for you.`,
    overview: f.overview ?? t.description,
    included: f.included ?? BASE_INCLUDED,
    timeline: f.timeline ?? [
      { when: "Getting started", what: "Tell us about your moment" },
      { when: "Planning", what: "A personalized timeline & checklist" },
      { when: "The celebration", what: "Your beautiful website goes live" },
      { when: "Sharing", what: "Guests add messages, photos & videos" },
      { when: "Forever", what: "Kept in your Magical Moments Library" },
    ],
    faq: f.faq ?? BASE_FAQ,
    sampleSlug: SAMPLE_SLUG[typeId],
    marketplace: f.marketplace ?? ["Trusted local professionals", "Photographers", "Venues", "Caterers", "Keepsakes & printing"],
  };
}
