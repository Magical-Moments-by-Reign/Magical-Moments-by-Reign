// ── Membership access — the entitlements business rule (pure) ────
// Occasions and Life Estates are unlocked by MEMBERSHIP. Free Forever is a
// basic introduction to Magical Moments — NOT a free version of the whole
// platform. This module is the single source of truth for what each tier can
// do. The Membership Builder UI, the server guards, and any API all import from
// here, so the rule is enforced identically in the UI, in routing, and in the
// backend. Pure and I/O-free so it is unit-testable and safe on client + server.
//
// Business rule: Membership determines access. Access determines which Life
// Estates can be created. There is never a state where Free Forever selects or
// begins creating a paid occasion.

export type MembershipTier =
  | "free" | "monthly" | "annual" | "5yr" | "10yr" | "legacy" | "reign" | "magical";

export const FREE_TIER: MembershipTier = "free";

/** Human-facing membership names (for dashboards, receipts, badges). */
export const MEMBERSHIP_LABEL: Record<MembershipTier, string> = {
  free: "Free Forever",
  monthly: "Monthly",
  annual: "Annual",
  "5yr": "5-Year",
  "10yr": "10-Year",
  legacy: "Lifetime Legacy",
  reign: "Lifetime Reign",
  magical: "Lifetime Magical",
};

/** Special owner label. The owner/internal account (magical tier + owner role)
 *  displays a permanent "Forever Lifetime Membership — Owner Access" — this is a
 *  DISPLAY-only distinction and never grants entitlements to regular customers. */
export const OWNER_LIFETIME_LABEL = "Forever Lifetime Membership — Owner Access";

export function membershipDisplay(tier: string | null | undefined, opts?: { owner?: boolean }): string {
  const t = normalizeTier(tier);
  if (opts?.owner && t === "magical") return OWNER_LIFETIME_LABEL;
  return MEMBERSHIP_LABEL[t];
}

const PAID_TIERS: readonly MembershipTier[] = ["monthly", "annual", "5yr", "10yr", "legacy", "reign", "magical"];
const ALL_TIERS: readonly MembershipTier[] = ["free", ...PAID_TIERS];

// Aliases that may appear in stored data or query params, mapped to canonical.
const TIER_ALIASES: Record<string, MembershipTier> = {
  "1yr": "annual",
  yearly: "annual",
  annual: "annual",
  lifetime: "magical", // a bare "lifetime" is still a paid Lifetime tier
};

/**
 * Canonicalize any stored/raw value to a known tier. Unknown values fall back
 * to "free" — least privilege, so an unrecognized value never grants paid
 * access by accident.
 */
export function normalizeTier(raw: string | null | undefined): MembershipTier {
  if (!raw) return "free";
  const v = String(raw).trim().toLowerCase();
  if ((ALL_TIERS as readonly string[]).includes(v)) return v as MembershipTier;
  return TIER_ALIASES[v] ?? "free";
}

/** True for any paying membership (everything except Free Forever). */
export function isPaidMember(tier: string | null | undefined): boolean {
  return normalizeTier(tier) !== "free";
}

/**
 * Whether this tier may SELECT or CREATE an occasion / Life Estate. Only paid
 * members can. This is the core gate the Builder, the create action, and the
 * route guard all use.
 */
export function canCreateOccasions(tier: string | null | undefined): boolean {
  return isPaidMember(tier);
}

/** Whether this tier may unlock planning tools, documents, checklists, concierge planning. */
export function canUnlockPlanningTools(tier: string | null | undefined): boolean {
  return isPaidMember(tier);
}

// What Free Forever DOES include — a basic introduction to Magical Moments.
export const FREE_FOREVER_INCLUDES: readonly string[] = [
  "A basic account",
  "Explore the platform",
  "View public content",
  "Learn how Magical Moments works",
  "Save your profile",
  "Receive announcements",
  "Browse available Experiences",
  "Upgrade at any time",
];

// What Free Forever does NOT include — unlocked only by a paid Membership.
export const FREE_FOREVER_EXCLUDES: readonly string[] = [
  "Selecting or creating a Life Estate or occasion",
  "Beginning to build an occasion",
  "Planning tools, documents and checklists",
  "Concierge planning",
  "Premium features",
];

// The elegant message shown when a Free Forever member reaches a paid gate.
// Never make the member think they already have access.
export const UPGRADE_COPY = {
  eyebrow: "Included with a Membership",
  title: "This Life Estate is included with a Magical Moments Membership.",
  body: "Upgrade to begin creating unforgettable experiences.",
  cta: "View Memberships",
  href: "/membership",
} as const;
