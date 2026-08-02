// ── Magical Moments Verified Program — vendor recognition badges ─
// A modular vendor-reputation system. Badges reward excellent vendors and help
// families identify highly trusted businesses. Lower tiers are EARNED from real
// signals (completed events + verified average rating + a clean complaint
// record); the top tiers additionally require ADMIN approval and can never be
// auto-awarded. Standards are re-checked every time, so a badge downgrades when
// a vendor no longer qualifies, and a suspended/removed/probation vendor carries
// no badge. Admins may override. Pure & testable; persistence + audit live in
// the schema and (future) admin surface.

import type { VendorStatus } from "@/lib/vendors";

export type BadgeTier = "new" | "trusted" | "family_favorite" | "verified" | "elite";

export interface BadgeDef {
  tier: BadgeTier;
  label: string;
  icon: string;          // emoji today; swap for custom art without other changes
  description: string;
  meaning: string;       // customer-facing "what this means"
  invitationOnly: boolean;
  adminApproval: boolean; // requires admin approval to be awarded
}

export const VENDOR_BADGES: BadgeDef[] = [
  {
    tier: "new", label: "New Vendor", icon: "🌱",
    description: "Approved vendor with limited platform history.",
    meaning: "A welcomed, approved vendor who is just getting started on Magical Moments.",
    invitationOnly: false, adminApproval: false,
  },
  {
    tier: "trusted", label: "Trusted Vendor", icon: "🤝",
    description: "At least 10 completed events, 4.7+ average rating, no unresolved complaints.",
    meaning: "A dependable vendor with a solid record of happy families.",
    invitationOnly: false, adminApproval: false,
  },
  {
    tier: "family_favorite", label: "Family Favorite", icon: "💛",
    description: "At least 25 completed events, 4.9+ average rating, strong communication & satisfaction.",
    meaning: "A beloved vendor families consistently rave about.",
    invitationOnly: false, adminApproval: false,
  },
  {
    tier: "verified", label: "Magical Moments Verified", icon: "🛡️",
    description: "50+ completed events, 4.9+ rating, verified business info, on-time performance, admin-approved.",
    meaning: "An exceptional, verified vendor that meets our highest standard and has been reviewed by our team.",
    invitationOnly: false, adminApproval: true,
  },
  {
    tier: "elite", label: "Elite Partner", icon: "👑",
    description: "Invitation only — top-performing vendors with exceptional reviews and professionalism.",
    meaning: "Our most distinguished partners, invited personally by Magical Moments.",
    invitationOnly: true, adminApproval: true,
  },
];

const ORDER: BadgeTier[] = ["new", "trusted", "family_favorite", "verified", "elite"];

export function badgeDef(tier: BadgeTier): BadgeDef {
  return VENDOR_BADGES.find((b) => b.tier === tier)!;
}
export function badgeRank(tier: BadgeTier): number {
  return ORDER.indexOf(tier);
}

// ── Objective thresholds ────────────────────────────────────────
export const BADGE_THRESHOLDS = {
  trusted: { events: 10, rating: 4.7 },
  family_favorite: { events: 25, rating: 4.9 },
  verified: { events: 50, rating: 4.9 },
} as const;

export interface VendorBadgeStats {
  status: VendorStatus;            // must be "approved" to carry any badge
  completedEvents: number;         // qualification data
  ratingAvg: number;               // 0–5, from verified reviews
  unresolvedComplaints: number;    // must be 0 for elevated badges
  verifiedNegatives: number;       // performance strikes (also block elevation)
  businessInfoVerified?: boolean;  // required for Verified
  onTimeConsistent?: boolean;      // required for Verified
  verifiedApproved?: boolean;      // ADMIN approval for Magical Moments Verified
  eliteInvited?: boolean;          // ADMIN invitation for Elite Partner
  badgeOverride?: BadgeTier | null; // ADMIN manual override
}

/** In good standing = approved, no strikes, no unresolved complaints. */
export function inGoodStanding(s: VendorBadgeStats): boolean {
  return s.status === "approved" && s.verifiedNegatives === 0 && s.unresolvedComplaints === 0;
}

/** Does the vendor meet the OBJECTIVE data for a tier (ignoring admin approval)? */
export function qualifiesFor(tier: BadgeTier, s: VendorBadgeStats): boolean {
  if (tier === "new") return s.status === "approved";
  if (!inGoodStanding(s)) return false;
  const t = BADGE_THRESHOLDS;
  switch (tier) {
    case "trusted":
      return s.completedEvents >= t.trusted.events && s.ratingAvg >= t.trusted.rating;
    case "family_favorite":
      return s.completedEvents >= t.family_favorite.events && s.ratingAvg >= t.family_favorite.rating;
    case "verified":
      return s.completedEvents >= t.verified.events && s.ratingAvg >= t.verified.rating &&
        !!s.businessInfoVerified && !!s.onTimeConsistent;
    case "elite":
      return false; // never earned by data — invitation only
  }
}

/** Highest tier the vendor's DATA supports (excludes admin-gated award). */
export function qualifiedTier(s: VendorBadgeStats): BadgeTier {
  if (qualifiesFor("verified", s)) return "verified";
  if (qualifiesFor("family_favorite", s)) return "family_favorite";
  if (qualifiesFor("trusted", s)) return "trusted";
  return "new";
}

/**
 * The badge actually AWARDED (what to display), applying admin gates, override,
 * and standing. Returns null for vendors that carry no badge (not approved).
 * Re-runs from current data, so it auto-downgrades when standards lapse.
 */
export function awardedBadge(s: VendorBadgeStats): BadgeDef | null {
  if (s.status !== "approved") return null; // suspended / removed / rejected / pending

  // Admin override wins (an admin action), but never survives a strike/complaint.
  if (s.badgeOverride && inGoodStanding(s)) return badgeDef(s.badgeOverride);

  // Elite: invitation-only + admin, and only in good standing.
  if (s.eliteInvited && inGoodStanding(s)) return badgeDef("elite");

  // Verified: objective data + verified business info + on-time + admin approval.
  if (qualifiesFor("verified", s) && s.verifiedApproved) return badgeDef("verified");

  // Auto tiers.
  if (qualifiesFor("family_favorite", s)) return badgeDef("family_favorite");
  if (qualifiesFor("trusted", s)) return badgeDef("trusted");
  return badgeDef("new");
}

// ── Dashboard progress ──────────────────────────────────────────
export interface Requirement { label: string; met: boolean; }
export interface BadgeProgress {
  current: BadgeTier;
  next: BadgeTier | null;      // next auto-earnable tier (null if none / next is admin/elite)
  requirements: Requirement[]; // requirements for `next` (empty if none)
  needsAdminApproval: boolean; // true when the next step is admin-gated (verified)
}

/** Progress toward the next tier, for the vendor dashboard. */
export function badgeProgress(s: VendorBadgeStats): BadgeProgress {
  const current = awardedBadge(s)?.tier ?? "new";
  const t = BADGE_THRESHOLDS;
  const noComplaints = s.verifiedNegatives === 0 && s.unresolvedComplaints === 0;

  // Determine the next meaningful target above the qualified tier.
  const q = qualifiedTier(s);
  let next: BadgeTier | null = null;
  const idx = ORDER.indexOf(q);
  const candidate = ORDER[idx + 1];
  if (candidate && candidate !== "elite") next = candidate;

  let requirements: Requirement[] = [];
  if (next === "trusted") {
    requirements = [
      { label: "10 completed events", met: s.completedEvents >= t.trusted.events },
      { label: "4.7+ average rating", met: s.ratingAvg >= t.trusted.rating },
      { label: "No unresolved complaints", met: noComplaints },
    ];
  } else if (next === "family_favorite") {
    requirements = [
      { label: "25 completed events", met: s.completedEvents >= t.family_favorite.events },
      { label: "4.9+ average rating", met: s.ratingAvg >= t.family_favorite.rating },
      { label: "No unresolved complaints", met: noComplaints },
    ];
  } else if (next === "verified") {
    requirements = [
      { label: "50 completed events", met: s.completedEvents >= t.verified.events },
      { label: "4.9+ average rating", met: s.ratingAvg >= t.verified.rating },
      { label: "Verified business information", met: !!s.businessInfoVerified },
      { label: "Consistent on-time performance", met: !!s.onTimeConsistent },
      { label: "Admin approval", met: !!s.verifiedApproved },
    ];
  }

  return { current, next, requirements, needsAdminApproval: next === "verified" };
}
