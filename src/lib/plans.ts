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
      "One active Magical Moment",
      "Magical Moments by Reign page address",
      // Core celebration features — included with EVERY paid membership.
      "Digital invitations & RSVP tracking",
      "Guest messaging & guestbook",
      "Registry & gift links",
      "Photo & video galleries",
      "Timeline & planning tools",
      "Event details & countdown",
      "Privacy & password controls",
      "Shareable link & QR code",
      // Capacity that grows with higher tiers:
      "1 AI-generated video included",
      "Up to 3 family contributors",
      "Mobile-friendly design",
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
      // Everything in Silver, plus more preservation & capacity (not new core features):
      "Five years of Memory Preservation",
      "3 AI-generated videos included",
      "Up to 8 family contributors",
      "More photo & video storage",
      "Unlimited page updates during the term",
      "Multiple story chapters",
      "Premium page designs",
      "Enhanced Ask Magical assistance",
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
      "5 AI-generated videos included",
      "Up to 15 family contributors",
      "Premium AI-designed experience",
      "Advanced Ask Magical assistance",
      "Priority design generation",
      "Larger media storage",
      "Private family access",
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
      "10 AI-generated videos included",
      "Unlimited family contributors (reasonable-use limits)",
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

// ── The White-Glove Concierge Experience (application-based) ─────
// Not a self-serve cart plan — our most exclusive, fully bespoke, done-for-you
// offering at a $5,000 one-time investment, designed personally with the
// Founder. Accepted on a limited basis; the CTA routes to an application /
// consultation request (never a self-serve checkout — no payment is faked).
export const CONCIERGE = {
  id: "concierge" as const,
  name: "The White-Glove Concierge Experience",
  shortName: "Custom Concierge",
  price: 5000,
  priceKind: "One-Time Investment",
  label: "White-glove, done-for-you storytelling",
  tagline: "Not every story should be built from a template. Some moments deserve something entirely unique.",
  intro: [
    "The White-Glove Concierge Experience is our most exclusive offering, created for clients who want a one-of-a-kind digital experience designed personally with the founder of Magical Moments by Reign.",
    "Whether you're celebrating a luxury wedding, welcoming your first baby, honoring a loved one, documenting a once-in-a-lifetime vacation, or creating a permanent family legacy, we'll build every detail together from the ground up.",
    "This is more than a website. It's a handcrafted digital legacy.",
  ],
  includes: [
    {
      title: "Private Discovery Consultation",
      body: "We begin with a one-on-one planning session where we learn your story, vision, family traditions, colors, style, and everything that makes your moment uniquely yours.",
    },
    {
      title: "Completely Custom Design",
      body: "No templates. Every page, layout, animation, gallery, and experience is designed specifically for your story.",
    },
    {
      title: "White-Glove Website Setup",
      body: "We build everything for you, including:",
      items: [
        "Photo galleries", "Video galleries", "Timelines", "Invitations",
        "RSVP management", "Registries & gift links", "Guestbook", "Countdown timers",
        "Interactive maps", "Travel information", "Planning checklists", "Event schedules",
        "Custom branding", "Personalized colors", "Typography", "Mobile optimization",
      ],
    },
    {
      title: "AI Personalization",
      body: "Your experience comes with Ask Magical fully configured to help you manage your journey long after launch.",
    },
    {
      title: "Launch Day",
      body: "We make sure everything is polished, beautiful, and ready to share with family and friends.",
    },
  ],
  support: {
    title: "Two Weeks of Personal Support",
    body: "After your experience launches, you'll receive two full weeks of dedicated concierge support. During this time we'll answer questions, make reasonable edits, help with uploads, assist with setup, and ensure you feel completely comfortable using your new experience.",
  },
  ongoingIntro:
    "After your two-week concierge period ends, your Magical Moment officially becomes yours to continue growing. You'll have access to all of the powerful tools included with your membership:",
  ongoing: [
    "Ask Magical AI",
    "Upload unlimited memories within your plan limits",
    "Add new galleries",
    "Share updates",
    "Invite new guests",
    "Manage your registry",
    "Add milestones",
    "Continue your timeline",
    "Create future memories",
  ],
  ongoingNote: "Your story continues. Only the white-glove design service concludes.",
  legacy: [
    "This isn't just another event website.",
    "It's a place your children… their children… and future generations can return to again and again.",
    "Because life's most meaningful moments deserve to live forever.",
  ],
  // Compact feature list for the /pricing summary card.
  features: [
    "A dedicated producer & design lead",
    "Personal discovery consultation",
    "Fully bespoke, hand-crafted design (beyond our templates)",
    "Custom video allowance determined by project scope",
    "Human copy editing included",
    "Priority service included",
    "Professional media curation & editing",
    "Cinematic AI video production",
    "Custom domain & premium setup, done for you",
    "Lifetime Memory Preservation included",
    "Two weeks of personal concierge support",
    "White-glove revisions until it's perfect",
  ],
  cta: "✨ Begin My White-Glove Experience",
  applicationsNote:
    "Applications are accepted on a limited basis to ensure every family receives the highest level of care and attention.",
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
  // ── Core celebration features — included with EVERY paid membership ──
  { label: "Digital invitations", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "RSVP tracking", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Guest messaging & guestbook", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Registry & gift links", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Photo & video galleries", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Guest photo & video uploads", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Timeline & planning tools", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "Privacy & password controls", values: { silver: "✓", gold: "✓", diamond: "✓", lifetime: "✓" } },
  { label: "QR code", values: { silver: "✓", gold: "✓", diamond: "Branded", lifetime: "Branded" } },
  // ── Tier differentiators — preservation, capacity, AI, concierge ──
  { label: "Custom domain", values: { silver: "—", gold: "—", diamond: "1 included", lifetime: "1 included" } },
  { label: "Photo storage", values: { silver: "2 GB", gold: "15 GB", diamond: "75 GB", lifetime: "250 GB" } },
  { label: "Video storage", values: { silver: "1 GB", gold: "10 GB", diamond: "50 GB", lifetime: "200 GB" } },
  { label: "Ask Magical usage", values: { silver: "Basic", gold: "Enhanced", diamond: "Advanced", lifetime: "Highest" } },
  { label: "AI-generated videos included", values: { silver: "1", gold: "3", diamond: "5", lifetime: "10" } },
  { label: "Family contributors", values: { silver: "Up to 3", gold: "Up to 8", diamond: "Up to 15", lifetime: "Unlimited*" } },
  { label: "Family access", values: { silver: "Upload access", gold: "Upload access", diamond: "Private access", lifetime: "Multi-generation" } },
  { label: "Annual archive", values: { silver: "—", gold: "—", diamond: "✓", lifetime: "✓" } },
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

// Six approved add-ons only. Everything your plan needs is already included —
// these are true enhancements, not fees for basic features. (Professional copy
// review, extended guest uploads, and per-bundle contributors were removed:
// Ask Magical polishes wording for everyone, uploads follow the plan term, and
// contributors are included by package. Human copy editing lives in the
// Concierge Experience.)
export const ADD_ONS: AddOn[] = [
  { id: "ai-video", name: "Additional AI video generation", description: "Extra AI-crafted video moments — only after you've used the videos included in your plan.", price: 29, unit: "each", icon: "sparkle", receive: "One additional AI-generated video clip.", quantitySelectable: true, maxQty: 20, recurring: false, requiresShipping: false, bestWith: "diamond" },
  { id: "storage", name: "Additional storage", description: "More room for photos & videos — buy more as you need it.", price: 19, unit: "per 25 GB", icon: "home", receive: "An extra 25 GB of media storage.", quantitySelectable: true, maxQty: 40, recurring: false, requiresShipping: false },
  { id: "extra-domain", name: "Extra custom domain", description: "Point a second custom address at your experience. Domain availability must be confirmed.", price: 39, unit: "per year", icon: "star", receive: "One additional custom domain for a year.", quantitySelectable: true, maxQty: 10, recurring: true, requiresShipping: false, requiresAck: "I understand domain registration and availability are subject to confirmation, and extra domains renew annually.", bestWith: "diamond" },
  { id: "keepsake-book", name: "Printed keepsake book", description: "A beautifully bound book of your Magical Moment.", price: 119, unit: "each", icon: "gift", receive: "One printed, bound keepsake book (shipped).", quantitySelectable: true, maxQty: 20, recurring: false, requiresShipping: true },
  { id: "highlight-film", name: "Downloadable highlight film", description: "A professionally formatted, downloadable keepsake film.", price: 79, unit: "each", icon: "trophy", receive: "One downloadable highlight film.", quantitySelectable: true, maxQty: 10, recurring: false, requiresShipping: false },
  { id: "rush", name: "Rush & priority creation", description: "Move your experience to the front of the creation queue for time-sensitive occasions. Availability must be confirmed.", price: 149, unit: "per experience", icon: "crown", receive: "Front-of-queue, expedited creation of your experience.", quantitySelectable: false, maxQty: 1, recurring: false, requiresShipping: false, requiresAck: "I understand rush & priority availability must be confirmed by the Magical Moments by Reign team." },
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
