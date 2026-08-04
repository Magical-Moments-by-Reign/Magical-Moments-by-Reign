// ── Pricing Engine v1.0 (Founder Approved) ──────────────────────
// Canonical rules: docs/design-bible/STANDARD-pricing-engine.md
//
// Customers BUILD the membership they need. We sell (1) Occasions and
// (2) a Membership Term. The engine keeps a running total, shows real
// savings, recommends better value without pressure, protects the value
// of Lifetime Memberships, and — on upgrade — credits prior purchases so
// customers only ever pay the difference.
//
// ★ SINGLE SOURCE OF PRICING ★
// Every dollar amount the platform charges lives in this file — in
// PRICING_CONFIG (per-occasion / per-term / add-ons) and
// LIFETIME_COLLECTIONS (the three Lifetime tiers). To change any price in
// the future, edit ONLY those two blocks: the Membership Builder,
// checkout, trial, and every price shown across the site read from here.
// Never hardcode a price anywhere else in the app.
//
// All amounts below are OFFICIAL (set `PRICING_CONFIG.official = true`).

export type TermId = "monthly" | "1yr" | "5yr" | "10yr" | "lifetime";

export interface Term {
  id: TermId;
  label: string; // "5 Years"
  short: string; // "5 yr"
  years: number | null; // null = lifetime
  recurring: boolean; // monthly is billed on a recurring cadence
  suffix?: string; // e.g. "/mo" shown after the amount
  blurb: string;
}

export const TERMS: Term[] = [
  { id: "monthly", label: "Monthly", short: "mo", years: null, recurring: true, suffix: "/mo", blurb: "Pay month to month. Upgrade anytime." },
  { id: "1yr", label: "1 Year", short: "1 yr", years: 1, recurring: false, blurb: "Perfect for a single celebration." },
  { id: "5yr", label: "5 Years", short: "5 yr", years: 5, recurring: false, blurb: "Let the story keep growing." },
  { id: "10yr", label: "10 Years", short: "10 yr", years: 10, recurring: false, blurb: "A decade of milestones." },
  { id: "lifetime", label: "Lifetime", short: "Life", years: null, recurring: false, blurb: "Kept for generations — the best long-term value." },
];

export function getTerm(id: TermId): Term {
  return TERMS.find((t) => t.id === id) ?? TERMS[0];
}

// ── Lifetime Collections (Founder-FIXED amounts) ────────────────
export interface LifetimeCollection {
  id: "legacy" | "reign" | "magical";
  name: string;
  price: number; // USD — FIXED by the Founder
  maxOccasions: number; // Infinity = every current + future occasion
  includesEverything: boolean;
  customJourneys: number;
  blurb: string;
}

export const LIFETIME_COLLECTIONS: LifetimeCollection[] = [
  { id: "legacy", name: "Lifetime Legacy", price: 2499, maxOccasions: 5, includesEverything: false, customJourneys: 0, blurb: "Up to 5 Lifetime Occasions." },
  { id: "reign", name: "Lifetime Reign", price: 4999, maxOccasions: 10, includesEverything: false, customJourneys: 0, blurb: "Up to 10 Lifetime Occasions." },
  { id: "magical", name: "Lifetime Magical Moments", price: 9999, maxOccasions: Infinity, includesEverything: true, customJourneys: 1, blurb: "Every current + future Occasion, plus 1 Custom Journey." },
];

/** Smallest Lifetime Collection that covers `occasionCount` occasions. */
export function collectionFor(occasionCount: number): LifetimeCollection {
  return (
    LIFETIME_COLLECTIONS.find((c) => occasionCount <= c.maxOccasions) ??
    LIFETIME_COLLECTIONS[LIFETIME_COLLECTIONS.length - 1]
  );
}

// ── PRICE KNOBS — the one place to change prices ────────────────
// OFFICIAL, active pricing. Tuned so the Pricing Protection Rule reads
// coherently in preview (long multi-occasion term builds cost more than the
// comparable Lifetime Collection, so Lifetime always wins as the long-term
// value). To change prices later, edit these values (and LIFETIME_COLLECTIONS)
// — nothing else in the app needs to change.
export const PRICING_CONFIG = {
  currency: "USD" as const,
  official: true, // amounts here are the official, active prices
  // Price of the FIRST occasion at each non-lifetime term (monthly = per month):
  firstOccasion: { monthly: 19, "1yr": 149, "5yr": 499, "10yr": 899 } as Record<Exclude<TermId, "lifetime">, number>,
  // Price of EACH ADDITIONAL occasion (bundle value — cheaper than the first):
  additionalOccasion: { monthly: 12, "1yr": 99, "5yr": 349, "10yr": 649 } as Record<Exclude<TermId, "lifetime">, number>,
  // Journey Protection™ optional add-on:
  journeyProtection: { monthly: 2.99, annual: 29.99 },
};

// ── Membership options (the account-entry selection) ────────────
// Every account BEGINS by selecting one of these. There is no guest /
// anonymous membership — everyone (including Free Forever) completes a
// checkout to create their account and accept the Terms & Privacy Policy.
export type MembershipTierId =
  | "free" | "monthly" | "annual" | "5yr" | "10yr" | "legacy" | "reign" | "magical";

export interface MembershipOption {
  id: MembershipTierId;
  name: string;
  glyph: string; // small accent (Founder's canonical marker)
  price: number | null; // 0 = free, null = built from Occasions × term, else fixed
  priceLabel: string;
  tier: "free" | "paid" | "lifetime";
  note: string;
}

export const MEMBERSHIP_OPTIONS: MembershipOption[] = [
  { id: "free", name: "Free Forever Magical Moments", glyph: "🩶", price: 0, priceLabel: "$0.00", tier: "free", note: "Our gift to every family. Begin organizing and preserving today." },
  { id: "monthly", name: "Monthly Membership", glyph: "💜", price: null, priceLabel: "Build your price", tier: "paid", note: "Pay month to month. Upgrade anytime." },
  { id: "annual", name: "Annual Membership", glyph: "💜", price: null, priceLabel: "Build your price", tier: "paid", note: "Pay yearly. Upgrade anytime." },
  { id: "5yr", name: "5-Year Membership", glyph: "💜", price: null, priceLabel: "Build your price", tier: "paid", note: "One term for five years." },
  { id: "10yr", name: "10-Year Membership", glyph: "💜", price: null, priceLabel: "Build your price", tier: "paid", note: "One term for ten years." },
  { id: "legacy", name: "Lifetime Legacy", glyph: "👑", price: 2499, priceLabel: formatUSD(2499), tier: "lifetime", note: "Up to 5 Lifetime Occasions." },
  { id: "reign", name: "Lifetime Reign", glyph: "👑", price: 4999, priceLabel: formatUSD(4999), tier: "lifetime", note: "Up to 10 Lifetime Occasions." },
  { id: "magical", name: "Lifetime Magical Moments", glyph: "✨", price: 9999, priceLabel: formatUSD(9999), tier: "lifetime", note: "Every current + future Occasion, plus 1 Custom Journey." },
];

// Billing cadences a paid membership can be charged on.
export const BILLING_CADENCES = [
  { id: "monthly", label: "Monthly", note: "Pay month to month. Upgrade anytime." },
  { id: "annual", label: "Annual", note: "Pay yearly. Upgrade anytime." },
  { id: "5yr", label: "5 Years", note: "One payment for five years." },
  { id: "10yr", label: "10 Years", note: "One payment for ten years." },
  { id: "lifetime", label: "Lifetime", note: "One payment. The best long-term value." },
] as const;

// ── Free Forever (required account · always included) ────────────
// The account, Family Vault, and dashboard are created at $0.00. Every
// paid membership also includes these; cancel a paid membership and the
// account automatically returns to Free Forever — nothing is deleted.
export const FREE_FOREVER = {
  name: "Free Forever Magical Moments",
  price: 0,
  priceLabel: "$0.00",
  promise:
    "Every family deserves a home inside Magical Moments. Free Forever ensures " +
    "everyone can begin organizing and preserving life's important moments — whether " +
    "they upgrade today or not. Your account is never deleted simply because you cancel.",
  features: [
    "Family Dashboard",
    "Family Vault (Basic)",
    "Family Calendar",
    "Grocery Lists",
    "Doctor Appointment Tracker",
    "Medical Timeline (Basic)",
    "School Center (Basic)",
    "Emergency Contacts",
    "Family Profiles",
    "Voice Notes",
    "AI Reminders (Basic)",
    "One Basic Journey",
    "Limited Photo Storage",
    "Limited Document Storage",
    "Basic Message Center",
    "Basic Sharing",
  ],
};

// ── The quote ───────────────────────────────────────────────────
export interface Quote {
  occasionCount: number;
  term: TermId;
  /** what it would cost with no bundle value (reference for savings) */
  listTotal: number;
  /** the price actually charged for this build */
  total: number;
  /** listTotal − total */
  savings: number;
  /** for a lifetime build, which collection applies */
  collection: LifetimeCollection | null;
  recurring: boolean; // monthly is billed on a recurring cadence
  suffix?: string; // e.g. "/mo"
  currency: "USD";
  placeholderAmounts: boolean; // true unless it's purely a Lifetime Collection
}

/** Core price of a built membership. */
export function quote(occasionCount: number, term: TermId): Quote {
  const n = Math.max(0, Math.floor(occasionCount));
  const t = getTerm(term);

  if (term === "lifetime") {
    const collection = collectionFor(n);
    return {
      occasionCount: n,
      term,
      listTotal: collection.price,
      total: collection.price,
      savings: 0,
      collection,
      recurring: false,
      currency: "USD",
      placeholderAmounts: false, // Lifetime Collections are Founder-fixed
    };
  }

  const first = PRICING_CONFIG.firstOccasion[term];
  const add = PRICING_CONFIG.additionalOccasion[term];
  const listTotal = n * first; // every occasion at full first-occasion rate
  const total = n === 0 ? 0 : first + (n - 1) * add;

  return {
    occasionCount: n,
    term,
    listTotal,
    total,
    savings: Math.max(0, listTotal - total),
    collection: null,
    recurring: t.recurring,
    suffix: t.suffix,
    currency: "USD",
    placeholderAmounts: !PRICING_CONFIG.official,
  };
}

// ── Lifetime Price Ceiling (Founding Principle) ─────────────────
// A Lifetime Collection must ALWAYS be the best long-term value. The
// comparable Lifetime price is the ceiling/floor no recurring or term
// price — after any promotion — may drop below.
export function lifetimeCeiling(occasionCount: number): number {
  return collectionFor(occasionCount).price;
}

/**
 * The most valuable membership to recommend for a given number of Journeys
 * (3 → Legacy, 8 → Reign, 15 → Magical Moments), per the Smart Pricing Engine.
 */
export function recommendedCollection(occasionCount: number): LifetimeCollection {
  return collectionFor(Math.max(1, occasionCount));
}

/**
 * Lifetime Value Protection check for the Specials engine. The Lifetime floor
 * only binds when a non-lifetime build is already in Lifetime territory (its
 * undiscounted price meets/exceeds the comparable Collection). A discount on a
 * small build that never offered Lifetime value can't "beat Lifetime," so it's
 * allowed. Returns whether the discounted price is permitted + the floor.
 */
export function protectsLifetime(undiscounted: number, discounted: number, occasionCount: number): { ok: boolean; floor: number } {
  const floor = lifetimeCeiling(occasionCount);
  if (undiscounted >= floor) return { ok: discounted >= floor, floor };
  return { ok: true, floor };
}

// ── Pricing Protection Rule ─────────────────────────────────────
// No discount / coupon / promo / bundle / loyalty / upgrade credit may
// reduce a recurring or term price BELOW the comparable Lifetime
// Collection. Any future discount logic MUST route through this guard.
export function applyProtectedDiscount(
  price: number,
  discount: number,
  occasionCount: number,
): number {
  const floor = collectionFor(occasionCount).price;
  const discounted = Math.max(0, price - Math.max(0, discount));
  // If the un-discounted price already meets/exceeds Lifetime, never let a
  // discount dip below the comparable Lifetime price.
  if (price >= floor) return Math.max(discounted, floor);
  return discounted;
}

// ── Smart Savings recommendations (educate, never pressure) ──────
export interface Recommendation {
  kind: "add-occasion" | "compare-lifetime" | "compare-term";
  headline: string;
  detail: string;
  cta: string;
}

export function recommendations(occasionCount: number, term: TermId): Recommendation[] {
  const recs: Recommendation[] = [];
  if (occasionCount <= 0) return recs;

  if (term !== "lifetime") {
    const current = quote(occasionCount, term).total;
    const collection = collectionFor(occasionCount);

    // Approaching (or past) the comparable Lifetime Collection → compare it.
    if (current >= collection.price * 0.7) {
      recs.push({
        kind: "compare-lifetime",
        headline: `Compare ${collection.name}`,
        detail:
          current >= collection.price
            ? `Your ${getTerm(term).label.toLowerCase()} build is ${formatUSD(current)} — ${collection.name} is ${formatUSD(collection.price)} and keeps these Occasions for life.`
            : `You're close to ${collection.name} (${formatUSD(collection.price)}) — the best long-term value for these Occasions.`,
        cta: "Compare Lifetime",
      });
    }

    // One more occasion is cheaper per-occasion than the first → nudge to compare.
    if (occasionCount >= 1) {
      const next = quote(occasionCount + 1, term).total;
      const delta = next - current;
      recs.push({
        kind: "add-occasion",
        headline: `Add one more Occasion for ${formatUSD(delta)}`,
        detail: `You've selected ${occasionCount} ${occasionCount === 1 ? "Occasion" : "Occasions"}. Each additional Occasion is added at a lower rate — compare adding one more.`,
        cta: "See the value",
      });
    }
  }

  return recs;
}

// ── Upgrades — credit prior purchases, pay only the difference ───
export interface UpgradeQuote {
  previousPaid: number;
  newTotal: number;
  credit: number; // never exceeds what was paid or the new total
  amountDue: number; // never negative
  currency: "USD";
}

export function upgradeQuote(previousPaid: number, next: Quote): UpgradeQuote {
  const paid = Math.max(0, previousPaid);
  const credit = Math.min(paid, next.total);
  return {
    previousPaid: paid,
    newTotal: next.total,
    credit,
    amountDue: Math.max(0, next.total - credit),
    currency: "USD",
  };
}

// ── Journey Protection™ (pause add-on) ──────────────────────────
export const JOURNEY_PROTECTION = {
  name: "Journey Protection",
  monthly: PRICING_CONFIG.journeyProtection.monthly,
  annual: PRICING_CONFIG.journeyProtection.annual,
  pauseMonths: [1, 2, 3] as const,
  keeps: ["Account", "Memories", "Photos", "Videos", "Documents", "Website"],
  pausedFeatures: [
    "Uploads",
    "Editing",
    "Premium AI",
    "Premium Planning",
    "Premium Invitations",
    "Premium Storage",
    "Premium Galleries",
  ],
  billingNote:
    "The pause period is added to the end of your membership — you never lose paid time.",
};

// ── Formatting ──────────────────────────────────────────────────
export function formatUSD(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded)
    ? `$${rounded.toLocaleString("en-US")}`
    : `$${rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
