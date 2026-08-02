// ── Memory Preservation Plans ───────────────────────────────────
// Single source of truth for pricing tiers, the comparison matrix,
// and add-ons. Consumed by /pricing, the comparison table, /checkout,
// the dashboard, and Ask Magical so everything stays in sync.
//
// APPROVED PRICING (do not alter without sign-off): Silver $249 /
// Gold $799 / Diamond $1,499 / Lifetime $2,499 one-time. Savings are
// shown vs. buying consecutive one-year ($249) plans. No invented,
// crossed-out, introductory, monthly, or discounted prices.

export type PlanId = "silver" | "gold" | "diamond" | "lifetime";

export interface Plan {
  id: PlanId;
  name: string; // "Silver Keepsake"
  term: string; // "1 Year of Memory Preservation"
  termShort: string; // "1 Year"
  price: number; // USD, one-time for the term
  priceKind: string; // "one-time" | "one-time · 10 years" etc.
  label: string; // official card label
  badge?: string; // "Most Popular" | "Best Legacy Value"
  savingsNote?: string;
  domain: string; // domain inclusion wording
  bestFor: string[];
  inheritsFrom?: PlanId;
  features: string[];
  addressExample: string;
  cta: string;
  /** card theme key for premium per-tier styling */
  theme: PlanId;
}

export const ONE_YEAR_PRICE = 249;

export const PLANS: Plan[] = [
  {
    id: "silver",
    name: "Silver Keepsake",
    term: "1 Year of Memory Preservation",
    termShort: "1 Year",
    price: 249,
    priceKind: "one-time · 1 year",
    label: "Perfect for one unforgettable year",
    domain: "Magical Moments by Reign page address",
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
      "Magical Moments by Reign page address",
      "Photo gallery",
      "Video uploads",
      "Guest messages",
      "Event details & countdown",
      "Shareable link",
      "Mobile-friendly design",
      "Privacy controls",
      "Basic Ask Magical assistance",
      "Extend or upgrade anytime",
    ],
    addressExample: "magicalmomentsbyreign.com/sarahs-18th",
    cta: "Choose Silver Keepsake",
    theme: "silver",
  },
  {
    id: "gold",
    name: "Gold Legacy",
    term: "5 Years of Memory Preservation",
    termShort: "5 Years",
    price: 799,
    priceKind: "one-time · 5 years",
    label: "Five years to keep the story growing",
    savingsNote: "Five separate one-year plans would total $1,245 — you save $446.",
    domain: "Magical Moments by Reign page address",
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
      "More photo & video storage",
      "Unlimited page updates during the term",
      "Multiple story chapters",
      "Premium page designs",
      "Family upload access",
      "Password-protected galleries",
      "Registry links & RSVP tools",
      "Timeline features",
      "Additional Ask Magical design revisions",
      "Downloadable QR code",
    ],
    addressExample: "magicalmomentsbyreign.com/karlie-class-of-2027",
    cta: "Choose Gold Legacy",
    theme: "gold",
  },
  {
    id: "diamond",
    name: "Diamond Experience",
    term: "10 Years of Memory Preservation",
    termShort: "10 Years",
    price: 1499,
    priceKind: "one-time · 10 years",
    label: "Ten years of milestones and memories",
    badge: "Most Popular",
    savingsNote: "Ten separate one-year plans would total $2,490 — you save $991.",
    domain: "One custom domain included, subject to availability & stated renewal terms",
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
      "Guest photo & video uploads",
      "Download center & annual archive",
      "Premium animations & transitions",
      "Branded QR code",
      "Priority customer support",
    ],
    addressExample: "karliesenioryear.com",
    cta: "Choose Diamond Experience",
    theme: "diamond",
  },
  {
    id: "lifetime",
    name: "Lifetime Legacy",
    term: "Lifetime of the Magical Moments by Reign service",
    termShort: "Lifetime",
    price: 2499,
    priceKind: "one-time",
    label: "A lasting home for your family's story",
    badge: "Best Legacy Value",
    domain: "One custom domain included, subject to availability & stated renewal terms",
    bestFor: [
      "Multi-generation family legacies",
      "A journey that grows with a child",
      "Forever keepsakes",
      "Stories meant to be handed down",
    ],
    inheritsFrom: "diamond",
    features: [
      "Lifetime Memory Preservation (see terms)",
      "One custom domain included",
      "Ongoing domain management while the plan is active",
      "Family Vault",
      "Multi-generation access",
      "Transfer access to a designated family member",
      "Unlimited story chapters (fair-use)",
      "Future milestone additions",
      "Annual downloadable archive",
      "Premium AI design updates",
      "Highest Ask Magical allowance",
      "Priority AI video creation",
      "Premium support & legacy transfer",
    ],
    addressExample: "babyoliviajourney.com",
    cta: "Choose Lifetime Legacy",
    theme: "lifetime",
  },
];

// ── Custom Concierge (white-glove, quote-based service) ─────────
// Not a self-serve cart plan — a fully bespoke, done-for-you offering
// starting at $5,000. Handled personally by the Magical Moments team.
export const CONCIERGE = {
  id: "concierge" as const,
  name: "Custom Concierge",
  price: 5000,
  priceKind: "starting at · one-time",
  label: "White-glove, done-for-you storytelling",
  tagline: "We design, build, and produce your entire experience for you.",
  features: [
    "A dedicated producer & design lead",
    "Personal discovery consultation",
    "Fully bespoke, hand-crafted design (beyond our templates)",
    "Professional media curation & editing",
    "Cinematic AI video production",
    "Custom domain & premium setup, done for you",
    "Lifetime Memory Preservation included",
    "White-glove revisions until it's perfect",
    "Priority everything",
  ],
  cta: "Request a Concierge consultation",
};

/** Required legal wording for Lifetime — display verbatim. */
export const LIFETIME_LEGAL =
  "Lifetime preservation is provided for the lifetime of the Magical Moments by Reign service, " +
  "subject to the Terms of Service, fair-use limits, storage allowances, domain-renewal terms, " +
  "and platform availability.";

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

// ── Comparison matrix ───────────────────────────────────────────
export interface ComparisonRow {
  label: string;
  values: Record<PlanId, string>;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Price", values: { silver: "$249", gold: "$799", diamond: "$1,499", lifetime: "$2,499" } },
  { label: "Billing", values: { silver: "One-time", gold: "One-time", diamond: "One-time", lifetime: "One-time" } },
  { label: "Preservation term", values: { silver: "1 year", gold: "5 years", diamond: "10 years", lifetime: "Lifetime*" } },
  { label: "You save vs. yearly", values: { silver: "—", gold: "$446", diamond: "$991", lifetime: "—" } },
  { label: "Magical Moments URL", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Custom domain", values: { silver: "—", gold: "—", diamond: "1 included", lifetime: "1 included" } },
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
  { label: "Upgrade anytime", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "—" } },
];

// ── Optional add-ons ────────────────────────────────────────────
export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string; // "each" | "per 25 GB" | "per year" | "per contributor bundle"
  icon: string; // OccasionIcon key
  receive: string; // what the customer gets
  quantitySelectable: boolean;
  maxQty: number; // 1 = one per experience
  recurring: boolean; // e.g. extra domain renews annually
  requiresShipping: boolean;
  requiresAck?: string; // acknowledgment text shown at checkout
  bundleSize?: number; // e.g. contributors per bundle
  bestWith?: PlanId; // "Best with…" suggestion
}

export const ADD_ONS: AddOn[] = [
  { id: "ai-video", name: "Additional AI video generation", description: "Extra AI-crafted video moments for your experience.", price: 29, unit: "each", icon: "sparkle", receive: "One additional AI-generated video clip.", quantitySelectable: true, maxQty: 20, recurring: false, requiresShipping: false, bestWith: "diamond" },
  { id: "storage", name: "Additional storage", description: "More room for photos & videos.", price: 19, unit: "per 25 GB", icon: "home", receive: "An extra 25 GB of media storage.", quantitySelectable: true, maxQty: 40, recurring: false, requiresShipping: false },
  { id: "extra-domain", name: "Extra custom domain", description: "Point a second custom address at your experience.", price: 39, unit: "per year", icon: "star", receive: "One additional custom domain for a year.", quantitySelectable: true, maxQty: 10, recurring: true, requiresShipping: false, requiresAck: "I understand domain registration and availability are subject to confirmation, and extra domains renew annually.", bestWith: "diamond" },
  { id: "keepsake-book", name: "Printed keepsake book", description: "A beautifully bound book of your Magical Moment.", price: 119, unit: "each", icon: "gift", receive: "One printed, bound keepsake book (shipped).", quantitySelectable: true, maxQty: 20, recurring: false, requiresShipping: true },
  { id: "highlight-film", name: "Downloadable highlight film", description: "A shareable highlight film of your memories.", price: 79, unit: "each", icon: "trophy", receive: "One downloadable highlight film.", quantitySelectable: true, maxQty: 10, recurring: false, requiresShipping: false },
  { id: "priority-design", name: "Priority design service", description: "Move to the front of the design queue.", price: 99, unit: "per experience", icon: "crown", receive: "Priority placement in the design queue.", quantitySelectable: false, maxQty: 1, recurring: false, requiresShipping: false },
  { id: "copy-review", name: "Professional copy review", description: "A human editor polishes your words.", price: 79, unit: "per experience", icon: "heart", receive: "A professional edit of your written content.", quantitySelectable: false, maxQty: 1, recurring: false, requiresShipping: false },
  { id: "extended-uploads", name: "Extended guest upload period", description: "Give guests more time to add their memories.", price: 39, unit: "per experience", icon: "balloon", receive: "An extended window for guest uploads.", quantitySelectable: false, maxQty: 1, recurring: false, requiresShipping: false },
  { id: "family-contributors", name: "Additional family contributors", description: "Invite more loved ones to collaborate.", price: 29, unit: "per bundle of 3", icon: "tree", receive: "A bundle of 3 additional family contributors.", quantitySelectable: true, maxQty: 10, recurring: false, requiresShipping: false, bundleSize: 3 },
  { id: "rush", name: "Rush creation", description: "Expedited creation for time-sensitive moments.", price: 149, unit: "per experience", icon: "plane", receive: "Expedited creation of your experience.", quantitySelectable: false, maxQty: 1, recurring: false, requiresShipping: false, requiresAck: "I understand rush availability must be confirmed by the Magical Moments by Reign team." },
];

export function getAddOn(id: string): AddOn | undefined {
  return ADD_ONS.find((a) => a.id === id);
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

// ── Plan-recommendation quiz ("Which plan fits my story?") ───────
export interface QuizOption {
  label: string;
  plan: PlanId;
}
export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export const PLAN_QUIZ: QuizQuestion[] = [
  {
    question: "How long do you want this moment to live on?",
    options: [
      { label: "Just this year", plan: "silver" },
      { label: "A few years", plan: "gold" },
      { label: "A whole decade", plan: "diamond" },
      { label: "For generations", plan: "lifetime" },
    ],
  },
  {
    question: "Is this a single event or an unfolding journey?",
    options: [
      { label: "One special event", plan: "silver" },
      { label: "A journey over a few years", plan: "gold" },
      { label: "A milestone I'll revisit for years", plan: "diamond" },
      { label: "A family legacy to hand down", plan: "lifetime" },
    ],
  },
  {
    question: "Do you want your own custom web address?",
    options: [
      { label: "The Magical Moments address is perfect", plan: "silver" },
      { label: "Happy with the Magical Moments address", plan: "gold" },
      { label: "Yes — my own custom domain", plan: "diamond" },
      { label: "Yes, and I want it forever", plan: "lifetime" },
    ],
  },
];
