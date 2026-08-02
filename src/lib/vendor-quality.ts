// ── Vendor Quality Standards & Review Policy ────────────────────
// Magical Moments maintains a trusted marketplace of dependable vendors.
// Services/contracts/pricing stay between customer and independent vendor, but
// we monitor performance and may suspend or remove vendors who repeatedly fail
// community standards. This is the PURE policy engine: what counts as a strike,
// the graduated three-strike actions, one-year probation, reinstatement
// criteria, and immediate-suspension rights.
//
// Fairness first: a negative review only becomes a strike AFTER verification;
// fraudulent/abusive/retaliatory/unrelated reviews are dismissed and never
// count. Notification delivery and admin review UI are seams.

// ── What is a negative review ────────────────────────────────────
export const NEGATIVE_RATING_THRESHOLD = 2; // overall 1–2 stars

export function isNegativeReview(r: { overallRating: number; recommend?: boolean }): boolean {
  return r.overallRating <= NEGATIVE_RATING_THRESHOLD || r.recommend === false;
}

// ── Review verification ─────────────────────────────────────────
export type ReviewVerification = "pending" | "verified" | "dismissed";

export const REVIEW_DISMISS_REASONS = ["fraudulent", "abusive", "retaliatory", "unrelated"] as const;
export type ReviewDismissReason = (typeof REVIEW_DISMISS_REASONS)[number];

/** Only a VERIFIED negative review counts toward a vendor's performance history. */
export function reviewCountsAsStrike(verification: ReviewVerification, negative: boolean): boolean {
  return verification === "verified" && negative;
}

// ── Graduated performance actions (three strikes) ───────────────
export interface StrikeOutcome {
  strike: number;
  active: boolean;         // is the vendor still active in the marketplace?
  searchPenalty: boolean;  // lowered in search rankings?
  warning: boolean;        // formal performance warning issued?
  removed: boolean;        // removed from the marketplace?
  summary: string;
  actions: string[];
}

/** The action for the Nth verified negative review (per Founder policy). */
export function strikeOutcome(strike: number): StrikeOutcome {
  if (strike <= 1) {
    return {
      strike: 1, active: true, searchPenalty: true, warning: false, removed: false,
      summary: "First verified negative review — vendor remains active.",
      actions: [
        "Vendor remains active",
        "Vendor profile is moved lower in search rankings",
        "Vendor receives a courtesy email summarizing the customer feedback",
        "Vendor is encouraged to improve future service",
      ],
    };
  }
  if (strike === 2) {
    return {
      strike: 2, active: true, searchPenalty: true, warning: true, removed: false,
      summary: "Second verified negative review — formal performance warning.",
      actions: [
        "Vendor remains active",
        "Vendor receives a formal performance warning",
        "Vendor is notified that one additional verified negative review may result in removal",
        "Vendor profile continues to receive lower search priority",
      ],
    };
  }
  return {
    strike: 3, active: false, searchPenalty: true, warning: true, removed: true,
    summary: "Third verified negative review — removed from the marketplace.",
    actions: [
      "Vendor is removed from the Magical Moments Vendor Marketplace",
      "Vendor profile becomes inactive",
      "Vendor may not accept new bookings through Magical Moments",
      "Existing confirmed bookings may continue unless otherwise directed",
    ],
  };
}

// ── Vendor performance state ────────────────────────────────────
export type PerformanceStatus = "active" | "warned" | "removed" | "suspended";

export interface VendorPerformance {
  verifiedNegatives: number;
  status: PerformanceStatus;
  searchPenalty: boolean;
  probationUntil: string | null; // ISO; set when removed
}

export function newPerformance(): VendorPerformance {
  return { verifiedNegatives: 0, status: "active", searchPenalty: false, probationUntil: null };
}

export const PROBATION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PerformanceUpdate {
  performance: VendorPerformance;
  outcome: StrikeOutcome;
  notify: ("vendor" | "customer" | "admins")[];
}

/**
 * Record a VERIFIED negative review as a strike and apply the graduated action.
 * On the third strike the vendor is removed and enters a one-year probation.
 */
export function recordVerifiedNegative(perf: VendorPerformance, now: Date): PerformanceUpdate {
  const count = perf.verifiedNegatives + 1;
  const outcome = strikeOutcome(count);
  const status: PerformanceStatus = outcome.removed ? "removed" : count === 2 ? "warned" : "active";
  const probationUntil = outcome.removed
    ? new Date(now.getTime() + PROBATION_DAYS * DAY_MS).toISOString()
    : perf.probationUntil;
  return {
    performance: { verifiedNegatives: count, status, searchPenalty: outcome.searchPenalty, probationUntil },
    outcome,
    notify: outcome.removed ? ["vendor", "admins"] : ["vendor"],
  };
}

// ── One-year probation & reinstatement ──────────────────────────
/** During probation a removed vendor may not apply/accept/advertise. */
export function inProbation(perf: VendorPerformance, now: Date): boolean {
  return !!perf.probationUntil && now < new Date(perf.probationUntil);
}

/** After one year the vendor may submit a NEW application (reinstatement not guaranteed). */
export function canReapply(perf: VendorPerformance, now: Date): boolean {
  if (perf.status !== "removed") return true;
  return !!perf.probationUntil && now >= new Date(perf.probationUntil);
}

export const REINSTATEMENT_CRITERIA = [
  "Previous customer feedback",
  "Corrective actions taken",
  "Updated business information",
  "Current licensing and insurance (if applicable)",
  "Overall marketplace standards",
] as const;

export const REINSTATEMENT_NOT_GUARANTEED =
  "After one year the vendor may submit a new application. Reinstatement is not guaranteed.";

// ── Immediate suspension (independent of strikes) ───────────────
export const IMMEDIATE_SUSPENSION_REASONS = [
  "fraud", "illegal activity", "safety concerns", "harassment", "discrimination",
  "conduct that may place customers at risk",
] as const;
export type ImmediateSuspensionReason = (typeof IMMEDIATE_SUSPENSION_REASONS)[number];

/** Immediately suspend a vendor for serious cause — bypasses the strike ladder. */
export function immediateSuspend(perf: VendorPerformance, reason: ImmediateSuspensionReason): PerformanceUpdate {
  return {
    performance: { ...perf, status: "suspended" },
    outcome: {
      strike: perf.verifiedNegatives, active: false, searchPenalty: true, warning: false, removed: false,
      summary: `Immediate suspension: ${reason}.`,
      actions: [`Vendor suspended immediately for ${reason}`, "Complaint investigated; documentation may be requested"],
    },
    notify: ["vendor", "admins"],
  };
}

// ── Magical Moments rights & goal (copy) ────────────────────────
export const MARKETPLACE_RIGHTS = [
  "Suspend a vendor immediately for fraud, illegal activity, safety concerns, harassment, discrimination, or conduct that may place customers at risk.",
  "Remove vendors who violate marketplace policies.",
  "Investigate customer complaints.",
  "Request documentation when necessary.",
  "Restore vendors when appropriate.",
] as const;

export const QUALITY_GOAL =
  "This policy is designed to protect families while giving vendors a fair opportunity to improve. Strong communication, accountability, and excellent customer service create the best experience for everyone.";

// The review dimensions collected after a completed event (mirrors REVIEW_CATEGORIES).
export const PERFORMANCE_REVIEW_DIMENSIONS = [
  "Communication", "Professionalism", "Quality of Service", "Timeliness",
  "Overall Experience", "Would You Recommend This Vendor?",
] as const;
