// ── Memory Preservation Plans ───────────────────────────────────
// Single source of truth for pricing tiers, the comparison matrix,
// and add-ons. Consumed by /pricing, the comparison table, and
// /checkout so everything stays in sync.
//
// ┌───────────────────────────────────────────────────────────────┐
// │  PRICING IS PLACEHOLDER. The dollar amounts below are           │
// │  reasonable stand-ins so the page feels real — Tabitha should   │
// │  confirm final pricing. Change them here and every surface      │
// │  updates. Legal/term wording follows the approved copy.         │
// └───────────────────────────────────────────────────────────────┘

export type PlanId = "silver" | "gold" | "diamond" | "lifetime";

export interface Plan {
  id: PlanId;
  name: string; // "Silver Keepsake"
  term: string; // "Preserved for 1 Year"
  termShort: string; // "1 Year"
  /** placeholder price in USD — CONFIRM before launch */
  price: number;
  priceSuffix: string; // "one-time · 1 year" | "for 10 years" | "one-time"
  badge?: string; // "Most Popular"
  tagline: string;
  bestFor: string[];
  inheritsFrom?: PlanId; // "Includes everything in Gold, plus:"
  features: string[];
  addressType: "Magical Moments page address" | "Custom domain included";
  exampleUrl: string;
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: "silver",
    name: "Silver Keepsake",
    term: "Preserved for 1 Year",
    termShort: "1 Year",
    price: 49,
    priceSuffix: "for 1 year",
    tagline: "Beautiful for a season worth remembering.",
    bestFor: [
      "Birthday invitations",
      "Baby showers",
      "Gender reveals",
      "Graduation announcements",
      "Short-term celebrations",
      "Holiday events",
    ],
    features: [
      "One Magical Moment experience",
      "Magical Moments branded page address",
      "Photo gallery",
      "Video uploads",
      "Guest messages",
      "Event details",
      "Countdown",
      "Shareable link",
      "Mobile-friendly design",
      "Privacy controls",
      "Basic Ask Magical assistance",
      "Ability to extend before expiration",
    ],
    addressType: "Magical Moments page address",
    exampleUrl: "magicalmomentsbyreign.com/sarahs-18th",
    cta: "Choose Silver Keepsake",
  },
  {
    id: "gold",
    name: "Gold Legacy",
    term: "Preserved for 5 Years",
    termShort: "5 Years",
    price: 149,
    priceSuffix: "for 5 years",
    tagline: "Room for a story that keeps unfolding.",
    bestFor: [
      "Weddings",
      "Graduation journeys",
      "Baby journeys",
      "Family reunions",
      "Sports seasons",
      "Anniversary stories",
    ],
    inheritsFrom: "silver",
    features: [
      "Five years of Memory Preservation",
      "More photo and video storage",
      "Unlimited page updates during the plan term",
      "Multiple story chapters",
      "Premium page designs",
      "Family upload access",
      "Password-protected galleries",
      "Registry links",
      "RSVP tools",
      "Timeline features",
      "Additional Ask Magical design revisions",
      "Downloadable QR code",
    ],
    addressType: "Magical Moments page address",
    exampleUrl: "magicalmomentsbyreign.com/karlie-class-of-2027",
    cta: "Choose Gold Legacy",
  },
  {
    id: "diamond",
    name: "Diamond Experience",
    term: "Preserved for 10 Years",
    termShort: "10 Years",
    price: 299,
    priceSuffix: "for 10 years",
    badge: "Most Popular",
    tagline: "Your own address and a decade of magic.",
    bestFor: [
      "Milestone weddings",
      "Multi-year journeys",
      "Senior year stories",
      "Once-in-a-lifetime celebrations",
    ],
    inheritsFrom: "gold",
    features: [
      "Ten years of Memory Preservation",
      "One custom domain included",
      "Domain registration for the initial term included",
      "Premium AI-designed experience",
      "Advanced Ask Magical assistance",
      "AI video enhancement allowance",
      "Priority design generation",
      "Larger media storage",
      "Private family access",
      "Guest photo and video uploads",
      "Download center",
      "Premium animations",
      "Custom page transitions",
      "Branded QR code",
      "Annual downloadable archive",
      "Priority customer support",
    ],
    addressType: "Custom domain included",
    exampleUrl: "karliesenioryear.com",
    cta: "Choose Diamond Experience",
  },
  {
    id: "lifetime",
    name: "Lifetime Legacy Collection",
    term: "Preserved for the Lifetime of the Service",
    termShort: "Lifetime",
    price: 799,
    priceSuffix: "one-time",
    tagline: "A living heirloom, carried across generations.",
    bestFor: [
      "Multi-generation family legacies",
      "A journey that grows with a child",
      "Forever keepsakes",
      "Stories meant to be handed down",
    ],
    inheritsFrom: "diamond",
    features: [
      "Lifetime Memory Preservation",
      "One custom domain included",
      "Ongoing domain management while the plan remains active",
      "Family Legacy Vault",
      "Multi-generation access",
      "Transfer access to a designated family member",
      "Unlimited story chapters within fair-use limits",
      "Future milestone additions",
      "Annual downloadable archive",
      "Premium AI design updates",
      "Highest Ask Magical allowance",
      "Priority AI video creation",
      "Premium support",
      "Legacy transfer instructions",
      "Long-term family collaboration",
      "Ability to evolve one journey into future milestones",
    ],
    addressType: "Custom domain included",
    exampleUrl: "babyaveryjourney.com",
    cta: "Choose Lifetime Legacy",
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

// ── Comparison matrix ───────────────────────────────────────────
// Ordered rows exactly as the brief specifies. "—" = not included.
// Qualitative/GB values are placeholders — confirm before launch.

export interface ComparisonRow {
  label: string;
  values: Record<PlanId, string>;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Preservation term", values: { silver: "1 year", gold: "5 years", diamond: "10 years", lifetime: "Lifetime*" } },
  { label: "Magical Moments URL", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Custom domain", values: { silver: "—", gold: "—", diamond: "1 included", lifetime: "1 included + management" } },
  { label: "Photo storage", values: { silver: "2 GB", gold: "15 GB", diamond: "75 GB", lifetime: "250 GB" } },
  { label: "Video storage", values: { silver: "1 GB", gold: "10 GB", diamond: "50 GB", lifetime: "200 GB" } },
  { label: "Ask Magical usage", values: { silver: "Basic", gold: "Enhanced", diamond: "Advanced", lifetime: "Highest" } },
  { label: "AI video enhancements", values: { silver: "—", gold: "—", diamond: "Allowance", lifetime: "Priority" } },
  { label: "Guest uploads", values: { silver: "Messages only", gold: "Family upload", diamond: "Photos & video", lifetime: "Photos & video" } },
  { label: "Password protection", values: { silver: "—", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Registry links", values: { silver: "—", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "RSVP tools", values: { silver: "—", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Timeline", values: { silver: "—", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "QR code", values: { silver: "—", gold: "Downloadable", diamond: "Branded", lifetime: "Branded" } },
  { label: "Annual archive", values: { silver: "—", gold: "—", diamond: "✓", lifetime: "✓" } },
  { label: "Family access", values: { silver: "—", gold: "Upload access", diamond: "Private access", lifetime: "Multi-generation" } },
  { label: "Priority support", values: { silver: "—", gold: "—", diamond: "✓", lifetime: "✓" } },
  { label: "Ownership transfer", values: { silver: "—", gold: "—", diamond: "—", lifetime: "✓" } },
];

// ── Optional add-ons ────────────────────────────────────────────
// Placeholder prices — confirm before launch.

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  priceSuffix?: string;
}

export const ADD_ONS: AddOn[] = [
  { id: "ai-video", name: "Additional AI video generations", description: "Extra AI-crafted video moments for your experience.", price: 19, priceSuffix: "each" },
  { id: "storage", name: "Additional storage", description: "Add 25 GB of photo & video storage.", price: 15 },
  { id: "extra-domain", name: "Extra custom domain", description: "Point a second custom address at your experience.", price: 25, priceSuffix: "/yr" },
  { id: "keepsake-book", name: "Printed keepsake book", description: "A beautifully bound book of your Magical Moment.", price: 89 },
  { id: "highlight-film", name: "Downloadable highlight film", description: "A shareable highlight film of your memories.", price: 49 },
  { id: "priority-design", name: "Priority design service", description: "Move to the front of the design queue.", price: 79 },
  { id: "copy-review", name: "Professional copy review", description: "A human editor polishes your words.", price: 59 },
  { id: "extended-uploads", name: "Extended guest upload period", description: "Give guests more time to add their memories.", price: 29 },
  { id: "family-contributors", name: "Additional family contributors", description: "Invite more loved ones to collaborate.", price: 19 },
  { id: "rush", name: "Rush creation", description: "Expedited creation for time-sensitive moments.", price: 99 },
];

export function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}
