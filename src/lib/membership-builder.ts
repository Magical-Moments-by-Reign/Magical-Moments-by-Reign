// ── Membership Builder — pricing engine (pure, honest) ──────────
// The official Membership Builder logic: a customer picks one or more
// occasions and a term; the price is computed live. Every price here is REAL
// and approved — nothing is invented. The one figure not yet set (Monthly) is
// represented as `null` so the UI can say "ask your concierge" instead of
// showing a fabricated number.

export interface Occasion {
  id: string;
  label: string;
}

// The 20 occasions a membership can hold ( + one custom on the top Lifetime ).
export const OCCASIONS: Occasion[] = [
  { id: "wedding", label: "Wedding" },
  { id: "engagement", label: "Engagement" },
  { id: "birthday", label: "Birthday" },
  { id: "baby", label: "Baby Journey" },
  { id: "baby-shower", label: "Baby Shower" },
  { id: "gender-reveal", label: "Gender Reveal" },
  { id: "graduation", label: "Graduation" },
  { id: "anniversary", label: "Anniversary" },
  { id: "vacation", label: "Vacation & Travel" },
  { id: "new-home", label: "New Home" },
  { id: "retirement", label: "Retirement" },
  { id: "military", label: "Military" },
  { id: "reunion", label: "Family Reunion" },
  { id: "holiday", label: "Holiday" },
  { id: "faith", label: "Faith & Religious" },
  { id: "business", label: "Business" },
  { id: "relationship", label: "Relationship" },
  { id: "memorial", label: "Celebration of Life" },
  { id: "pet", label: "Pet" },
  { id: "legacy", label: "Legacy" },
];

export type TermId = "free" | "monthly" | "annual" | "5yr" | "10yr" | "lifetime";

export interface Term {
  id: TermId;
  label: string;
  sub: string;
}

export const TERMS: Term[] = [
  { id: "free", label: "Free Forever", sub: "Begin at no cost" },
  { id: "monthly", label: "Monthly", sub: "Pay month to month" },
  { id: "annual", label: "Annual", sub: "One beautiful year" },
  { id: "5yr", label: "5 Years", sub: "The story keeps growing" },
  { id: "10yr", label: "10 Years", sub: "A decade of milestones" },
  { id: "lifetime", label: "Lifetime", sub: "Kept forever" },
];

// The three Lifetime tiers, chosen automatically by how many occasions the
// member wants included. (Approved pricing.)
export interface LifetimeTier {
  maxOccasions: number;
  price: number;
  label: string;
  custom?: boolean;
}
export const LIFETIME_TIERS: LifetimeTier[] = [
  { maxOccasions: 5, price: 2499, label: "Up to 5 occasions" },
  { maxOccasions: 10, price: 4999, label: "Up to 10 occasions" },
  { maxOccasions: 20, price: 9999, label: "All 20 occasions + 1 custom", custom: true },
];

// White Glove: a done-for-you Lifetime with 5 occasions — our team creates the
// entire experience. Consultative, so it is requested, not self-checked-out.
export const WHITE_GLOVE = {
  id: "white-glove" as const,
  label: "White Glove Lifetime",
  price: 5000,
  sub: "Done for you — we create it, start to finish",
};

// Fixed-price terms with a real, approved number. Monthly is intentionally
// absent (price not set yet) so the UI degrades honestly.
const FIXED_TERM_PRICE: Partial<Record<TermId, number>> = {
  free: 0,
  annual: 249,
  "5yr": 799,
  "10yr": 1499,
};

export interface PriceResult {
  /** Dollar amount, or null when the price is not yet set (e.g. Monthly). */
  price: number | null;
  /** e.g. "one-time", "per month", "per year", or "" for free. */
  unit: string;
  /** The Lifetime tier label when applicable. */
  tierLabel?: string;
  /** Honest note shown under the price. */
  note: string;
}

/** Pick the Lifetime tier that fits the requested occasion count. */
export function lifetimeTierFor(occasionCount: number): LifetimeTier {
  const n = Math.max(1, occasionCount);
  return LIFETIME_TIERS.find((t) => n <= t.maxOccasions) ?? LIFETIME_TIERS[LIFETIME_TIERS.length - 1];
}

/** Compute the live price for a (term, occasion count) selection. Pure. */
export function priceFor(term: TermId, occasionCount: number): PriceResult {
  if (term === "lifetime") {
    const tier = lifetimeTierFor(occasionCount);
    return {
      price: tier.price,
      unit: "one-time",
      tierLabel: tier.label,
      note: `A permanent home for ${tier.custom ? "all your occasions, plus one custom" : `up to ${tier.maxOccasions} occasions`} — kept forever.`,
    };
  }
  if (term === "monthly") {
    return { price: null, unit: "per month", note: "Monthly pricing is being finalized — your concierge will share it and set you up." };
  }
  const price = FIXED_TERM_PRICE[term];
  if (price === 0) return { price: 0, unit: "", note: "Start free and keep everything you create. Upgrade whenever you wish." };
  if (typeof price === "number") {
    const years = term === "annual" ? "one year" : term === "5yr" ? "five years" : "ten years";
    return { price, unit: "one-time", note: `One-time payment for ${years} of preservation. Taxes calculated at checkout. Upgrade anytime without losing a dollar.` };
  }
  return { price: null, unit: "", note: "Your concierge will help you choose the right membership." };
}
