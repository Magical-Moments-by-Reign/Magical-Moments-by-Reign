// ── Vendor Portal — access & dashboard domain layer (pure) ──────
// Decides what a vendor may see and do in their portal based on their
// application/marketplace/membership/compliance state, and produces the
// dashboard's summary cards, "What Needs Your Attention" items, and the
// encouraging (never shaming) compliance/agreement/document messages.
//
// PURE — no I/O, fully unit-tested (vendor-portal.test.ts). The DB wiring lives
// in src/lib/vendor-auth.ts and the pages. Reuses the marketplace/membership/
// badge/quality domain libs; it does not rebuild them.

// The persisted marketplace status (Vendor.status, normalized to lowercase).
export type VendorMarketStatus = "pending" | "approved" | "rejected" | "suspended" | "removed";
export type VendorMembershipStatusLike = "active" | "inactive" | "pending_verification" | "suspended";

// The richer, portal-facing status the spec asks us to surface.
export type VendorPortalStatus =
  | "applicant" | "under_review" | "additional_info" | "approved" | "active"
  | "temporarily_inactive" | "suspended" | "removed" | "probation"
  | "reapplication_pending" | "reinstated";

export interface VendorPortalState {
  marketStatus: VendorMarketStatus;
  membershipStatus: VendorMembershipStatusLike;
  /** A submitted application that hasn't been approved yet. */
  hasPendingApplication: boolean;
  /** Admin asked the vendor for more information. */
  additionalInfoRequested?: boolean;
  agreementAccepted: boolean;
  /** Required credentials provided + verified + unexpired. */
  complianceOk: boolean;
  /** probationUntil is in the future. */
  onProbation?: boolean;
  reapplicationPending?: boolean;
  /** Recently reinstated after a hold/suspension. */
  reinstated?: boolean;
  temporarilyInactive?: boolean;
}

/** Derive the portal-facing status from the persisted state. */
export function portalStatus(s: VendorPortalState): VendorPortalStatus {
  if (s.marketStatus === "removed") return s.reapplicationPending ? "reapplication_pending" : "removed";
  if (s.marketStatus === "suspended") return "suspended";
  if (s.marketStatus === "rejected") return "additional_info"; // rejected apps route back to "provide more info"
  if (s.marketStatus === "pending") {
    if (s.additionalInfoRequested) return "additional_info";
    return s.hasPendingApplication ? "under_review" : "applicant";
  }
  // approved marketplace record from here
  if (s.onProbation) return "probation";
  if (s.temporarilyInactive || s.membershipStatus === "inactive") return "temporarily_inactive";
  const fullyLive = s.agreementAccepted && s.complianceOk && s.membershipStatus === "active";
  if (fullyLive) return s.reinstated ? "reinstated" : "active";
  return "approved"; // approved but not yet fully live (agreement/docs/membership pending)
}

// ── Sections ────────────────────────────────────────────────────
export type PortalSection =
  | "overview" | "application_status" | "profile" | "compliance" | "agreement"
  | "messages" | "bookings" | "assignments" | "calendar" | "reviews"
  | "badges" | "membership" | "payments" | "settings";

export const PORTAL_SECTIONS: { id: PortalSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "application_status", label: "Application Status" },
  { id: "profile", label: "Profile" },
  { id: "compliance", label: "Compliance" },
  { id: "agreement", label: "Agreements" },
  { id: "messages", label: "Messages" },
  { id: "bookings", label: "Bookings" },
  { id: "assignments", label: "Assignments" },
  { id: "calendar", label: "Calendar" },
  { id: "reviews", label: "Reviews" },
  { id: "badges", label: "Badges" },
  { id: "membership", label: "Membership" },
  { id: "payments", label: "Payments" },
  { id: "settings", label: "Settings" },
];

// While an applicant/under-review/needs-info, only these are available.
const APPLICANT_SECTIONS: PortalSection[] = ["overview", "application_status", "profile", "compliance", "agreement", "messages", "settings"];
// Suspended / removed / inactive: read-mostly + a path back.
const RESTRICTED_SECTIONS: PortalSection[] = ["overview", "compliance", "agreement", "messages", "settings"];
const ALL_SECTIONS: PortalSection[] = PORTAL_SECTIONS.map((s) => s.id);

/** The sections a vendor in this status may open (server-enforced by guards). */
export function allowedSections(status: VendorPortalStatus): PortalSection[] {
  switch (status) {
    case "applicant":
    case "under_review":
    case "additional_info":
    case "approved": // approved but not fully live — keep them in the completion flow
    case "reapplication_pending":
      return APPLICANT_SECTIONS;
    case "active":
    case "reinstated":
    case "probation":            // full access, with a notice banner
    case "temporarily_inactive": // full access so they can fix what's needed
      return ALL_SECTIONS;
    case "suspended":
    case "removed":
      return RESTRICTED_SECTIONS;
    default:
      return ["overview", "settings"];
  }
}

export function canAccessSection(status: VendorPortalStatus, section: PortalSection): boolean {
  return allowedSections(status).includes(section);
}

/** Public marketplace visibility: fully live only. Mirrors the marketplace rule
 *  (never public while docs are missing/expired/rejected/under review/suspended).
 *  Probation vendors remain visible but are ranked lower (handled by search). */
export function publiclyVisible(s: VendorPortalState): boolean {
  return (
    s.marketStatus === "approved" &&
    s.membershipStatus === "active" &&
    s.agreementAccepted &&
    s.complianceOk &&
    !s.temporarilyInactive
  );
}

// ── What Needs Your Attention ───────────────────────────────────
export interface AttentionFlags {
  agreementAccepted: boolean;
  complianceOk: boolean;
  missingDocuments: string[];      // human labels of docs not yet provided
  expiringDocuments: string[];     // docs expiring soon
  pendingBookingCount: number;
  standbyAwaitingConfirm: number;
  unreadInquiryCount: number;
  upcomingEventsToReview: number;
  annualVerificationDue: boolean;
  additionalInfoRequested: boolean;
}
export interface AttentionItem { id: string; label: string; urgency: "high" | "normal"; section: PortalSection }

/** Encouraging, action-oriented items — never "you are missing X". */
export function whatNeedsAttention(f: AttentionFlags): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (f.additionalInfoRequested) items.push({ id: "more_info", label: "Send the additional information our team requested.", urgency: "high", section: "messages" });
  if (!f.agreementAccepted) items.push({ id: "agreement", label: "Review and sign your vendor agreement to go live.", urgency: "high", section: "agreement" });
  for (const d of f.missingDocuments) items.push({ id: `doc_${d}`, label: `Add your ${d} to complete verification.`, urgency: "high", section: "compliance" });
  for (const d of f.expiringDocuments) items.push({ id: `exp_${d}`, label: `Upload a renewed ${d} before it expires.`, urgency: "high", section: "compliance" });
  if (f.annualVerificationDue) items.push({ id: "annual", label: "Complete your annual verification to stay active.", urgency: "normal", section: "compliance" });
  if (f.standbyAwaitingConfirm > 0) items.push({ id: "standby", label: `Confirm your availability for ${f.standbyAwaitingConfirm} standby request(s).`, urgency: "high", section: "assignments" });
  if (f.pendingBookingCount > 0) items.push({ id: "bookings", label: `Accept or decline ${f.pendingBookingCount} booking request(s).`, urgency: "high", section: "bookings" });
  if (f.unreadInquiryCount > 0) items.push({ id: "inquiries", label: `Respond to ${f.unreadInquiryCount} customer inquiry(ies).`, urgency: "normal", section: "messages" });
  if (f.upcomingEventsToReview > 0) items.push({ id: "events", label: `Review ${f.upcomingEventsToReview} upcoming event(s).`, urgency: "normal", section: "calendar" });
  return items;
}

// ── Dashboard cards ─────────────────────────────────────────────
export interface VendorDashboardData {
  completedBookings: number;
  ratingAvg: number;
  reviewCount: number;
  verifiedNegatives: number;
  badge: string;
  membershipRenewalDate: string | null;
  membershipFeeDeducted: boolean;
  docsExpiringSoon: number;
  complianceAlerts: number;
  // Booking/message/payment metrics — sourced from features that are gated until
  // their seams (storage/Square/bookings UI) are wired; surfaced with gated=true.
  newInquiries?: number;
  pendingBookings?: number;
  primaryAssignments?: number;
  standbyAssignments?: number;
  upcomingEvents?: number;
  unreadMessages?: number;
  pendingPayouts?: number;
}
export interface DashboardCard { id: string; label: string; value: string | number; gated: boolean }

export function dashboardCards(d: VendorDashboardData): DashboardCard[] {
  const g = (v: number | undefined) => v ?? 0;
  return [
    { id: "completed", label: "Completed Magical Moments", value: d.completedBookings, gated: false },
    { id: "rating", label: "Average rating", value: d.reviewCount ? d.ratingAvg.toFixed(1) : "—", gated: false },
    { id: "negatives", label: "Verified negative reviews", value: d.verifiedNegatives, gated: false },
    { id: "badge", label: "Current badge", value: d.badge, gated: false },
    { id: "renewal", label: "Membership renewal", value: d.membershipRenewalDate ?? "—", gated: false },
    { id: "fee", label: "First-booking fee", value: d.membershipFeeDeducted ? "Deducted" : "Pending", gated: false },
    { id: "docs_expiring", label: "Documents expiring soon", value: d.docsExpiringSoon, gated: false },
    { id: "compliance_alerts", label: "Compliance alerts", value: d.complianceAlerts, gated: false },
    // Gated metrics (bookings/messages/payouts arrive with Phase 2/3 + seams):
    { id: "inquiries", label: "New inquiries", value: g(d.newInquiries), gated: true },
    { id: "pending_bookings", label: "Pending bookings", value: g(d.pendingBookings), gated: true },
    { id: "primary", label: "Primary assignments", value: g(d.primaryAssignments), gated: true },
    { id: "standby", label: "Standby assignments", value: g(d.standbyAssignments), gated: true },
    { id: "upcoming", label: "Upcoming events", value: g(d.upcomingEvents), gated: true },
    { id: "messages", label: "Unread messages", value: g(d.unreadMessages), gated: true },
    { id: "payouts", label: "Pending payouts", value: g(d.pendingPayouts), gated: true },
  ];
}

// ── Encouraging status messages ─────────────────────────────────
export function statusMessage(status: VendorPortalStatus): { tone: "info" | "ok" | "warn"; text: string } {
  switch (status) {
    case "applicant": return { tone: "info", text: "Welcome! Finish your profile and upload your documents whenever you're ready — nothing has to be done all at once." };
    case "under_review": return { tone: "info", text: "Your application is with our team. We'll message you here as soon as there's an update." };
    case "additional_info": return { tone: "warn", text: "Our team needs a little more information to continue. Check your messages for details." };
    case "approved": return { tone: "info", text: "You're approved! Sign your agreement and finish verification to go live in the marketplace." };
    case "active": return { tone: "ok", text: "You're live in the marketplace. Keep your profile and documents current to stay visible." };
    case "reinstated": return { tone: "ok", text: "Welcome back — your account has been reinstated and is active again." };
    case "probation": return { tone: "warn", text: "Your account is active but on a review period. Excellent service restores full standing." };
    case "temporarily_inactive": return { tone: "warn", text: "Your listing is temporarily hidden. Update the items below to restore it." };
    case "suspended": return { tone: "warn", text: "Your account is suspended. Please review the details and contact our team to resolve it." };
    case "removed": return { tone: "warn", text: "Your account has been removed from the marketplace. You may reapply after the probation period." };
    case "reapplication_pending": return { tone: "info", text: "Your reapplication is being reviewed. We'll be in touch here." };
  }
}

export function agreementMessage(accepted: boolean): string {
  return accepted
    ? "Your vendor agreement is signed and up to date."
    : "Review and sign your vendor agreement to activate your listing.";
}

export function missingDocumentsMessage(missing: string[]): string {
  if (missing.length === 0) return "All required documents are on file. Thank you!";
  if (missing.length === 1) return `You're one step away — add your ${missing[0]}.`;
  return `Add these to complete verification: ${missing.join(", ")}.`;
}

/** Storage isn't connected yet — show honest copy instead of a fake upload button. */
export const UPLOAD_COMING_SOON = "Secure document upload activates once encrypted storage is connected. Until then, our team can accept documents directly — check your messages.";
