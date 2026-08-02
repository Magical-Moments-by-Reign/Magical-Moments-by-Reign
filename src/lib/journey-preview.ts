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
  "Kept forever on your Family Legacy Timeline",
];

// Generic FAQ built from the Founder's example AI questions.
const BASE_FAQ: FaqItem[] = [
  { q: "What happens after the event?", a: "Nothing is ever lost. Your Journey becomes a permanent chapter on your Family Legacy Timeline — you can revisit, add to it, and share it for years to come." },
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
      { when: "Forever", what: "Kept on your Family Legacy Timeline" },
    ],
    faq: f.faq ?? BASE_FAQ,
    sampleSlug: SAMPLE_SLUG[typeId],
    marketplace: f.marketplace ?? ["Trusted local professionals", "Photographers", "Venues", "Caterers", "Keepsakes & printing"],
  };
}
