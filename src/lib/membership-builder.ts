// ── Membership Builder — occasion catalog ───────────────────────
// The 20 occasions a membership can hold. ALL pricing/discount/upgrade logic
// lives in the canonical pricing engine (lib/pricing-engine.ts) — this file is
// only the occasion list the builder renders. Never duplicate pricing here.

export interface Occasion {
  id: string;
  label: string;
}

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
