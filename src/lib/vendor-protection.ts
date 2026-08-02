// ── Primary & Standby Vendor System (Vendor Protection) ─────────
// Lets a customer choose a Primary Vendor and an OPTIONAL Standby Vendor for an
// event, to reduce stress if a vendor becomes unavailable. This is the PURE
// state machine: choices, acceptance, statuses, activate/release transitions,
// timeline milestones, and the notification targets each transition implies.
//
// Guardrails (independent vendors): Magical Moments only facilitates
// communication — the customer confirms contracts & pricing directly with each
// vendor, and a Standby Vendor is an option for continuity, not a guarantee of
// availability, pricing, or performance. No vendor is confirmed until they
// accept. The Standby Vendor is NOT automatically hired — they reserve
// availability until released or activated. Delivery of notifications
// (email/SMS/real-time) is an integration seam; this module returns WHO to
// notify, deterministically.

export type VendorRole = "primary" | "standby";
export type ProtectionChoice = "primary_only" | "primary_plus_standby";

export type PrimaryStatus = "pending" | "accepted" | "declined" | "completed";
export type StandbyStatus = "pending" | "accepted" | "released" | "activated" | "declined";

export interface BookingState {
  choice: ProtectionChoice;
  primaryStatus: PrimaryStatus;
  /** null when the customer chose primary-only. */
  standbyStatus: StandbyStatus | null;
}

export type NotifyTarget = "customer" | "primary_vendor" | "standby_vendor" | "admins";

export type TransitionResult =
  | { ok: true; state: BookingState; notify: NotifyTarget[] }
  | { ok: false; reason: string };

// ── Acceptance copy ─────────────────────────────────────────────
export const PRIMARY_ACCEPTANCE = "I accept this event.";
export const STANDBY_ACCEPTANCE = "I agree to remain available as the Standby Vendor for this event.";

// ── Customer booking prompt ─────────────────────────────────────
export const STANDBY_PROMPT = {
  question: "Would you like to request a Standby Vendor?",
  explain:
    "A Standby Vendor provides an extra layer of peace of mind by remaining available should your Primary Vendor become unavailable before your event.",
  yes: "Yes, I'd like a Standby Vendor.",
  no: "No, I'll use only my Primary Vendor.",
} as const;

// ── Confirmation helpers ────────────────────────────────────────
export function isPrimaryConfirmed(s: BookingState): boolean {
  return s.primaryStatus === "accepted";
}
export function isStandbyConfirmed(s: BookingState): boolean {
  return s.standbyStatus === "accepted";
}

/** Start a booking. A standby seat exists only when the customer opts in. */
export function newBooking(choice: ProtectionChoice): BookingState {
  return {
    choice,
    primaryStatus: "pending",
    standbyStatus: choice === "primary_plus_standby" ? "pending" : null,
  };
}

// ── Vendor acceptance ───────────────────────────────────────────
export function acceptPrimary(s: BookingState): TransitionResult {
  if (s.primaryStatus !== "pending") return { ok: false, reason: "Primary vendor is not awaiting acceptance." };
  return { ok: true, state: { ...s, primaryStatus: "accepted" }, notify: ["customer"] };
}

export function declinePrimary(s: BookingState): TransitionResult {
  if (s.primaryStatus === "completed" || s.primaryStatus === "declined") {
    return { ok: false, reason: "Primary vendor can no longer decline." };
  }
  // If a standby has accepted, the customer can now activate it — flag the admins too.
  const notify: NotifyTarget[] = s.standbyStatus === "accepted"
    ? ["customer", "admins"]
    : ["customer"];
  return { ok: true, state: { ...s, primaryStatus: "declined" }, notify };
}

export function completePrimary(s: BookingState): TransitionResult {
  if (s.primaryStatus !== "accepted") return { ok: false, reason: "Only an accepted primary vendor can complete." };
  return { ok: true, state: { ...s, primaryStatus: "completed" }, notify: ["customer"] };
}

export function acceptStandby(s: BookingState): TransitionResult {
  if (s.choice !== "primary_plus_standby") return { ok: false, reason: "This booking has no standby vendor." };
  if (s.standbyStatus !== "pending") return { ok: false, reason: "Standby vendor is not awaiting acceptance." };
  return { ok: true, state: { ...s, standbyStatus: "accepted" }, notify: ["customer"] };
}

export function declineStandby(s: BookingState): TransitionResult {
  if (s.choice !== "primary_plus_standby") return { ok: false, reason: "This booking has no standby vendor." };
  if (s.standbyStatus !== "pending" && s.standbyStatus !== "accepted") {
    return { ok: false, reason: "Standby vendor can no longer decline." };
  }
  return { ok: true, state: { ...s, standbyStatus: "declined" }, notify: ["customer"] };
}

// ── Activate / release the standby ──────────────────────────────
/** Standby may be activated only when it has accepted AND the primary is gone. */
export function canActivateStandby(s: BookingState): boolean {
  return s.choice === "primary_plus_standby" && s.standbyStatus === "accepted" && s.primaryStatus === "declined";
}

export function activateStandby(s: BookingState): TransitionResult {
  if (!canActivateStandby(s)) return { ok: false, reason: "Standby can only be activated after the primary is unavailable and the standby has accepted." };
  // Notify the standby immediately, plus the customer and admins.
  return { ok: true, state: { ...s, standbyStatus: "activated" }, notify: ["standby_vendor", "customer", "admins"] };
}

/** Standby may be released (with appreciation) once the primary remains confirmed. */
export function canReleaseStandby(s: BookingState): boolean {
  return s.choice === "primary_plus_standby" && s.standbyStatus === "accepted" && s.primaryStatus === "accepted";
}

export function releaseStandby(s: BookingState): TransitionResult {
  if (!canReleaseStandby(s)) return { ok: false, reason: "Standby can only be released while it is reserved and the primary remains confirmed." };
  return { ok: true, state: { ...s, standbyStatus: "released" }, notify: ["standby_vendor"] };
}

export const STANDBY_RELEASE_MESSAGE =
  "Thank you for reserving this date as our Standby Vendor. Your Primary Vendor remains confirmed, so you are released with our appreciation.";

// ── Event timeline milestones ───────────────────────────────────
export interface Milestone { key: string; label: string; done: boolean; }

export function vendorMilestones(s: BookingState): Milestone[] {
  const milestones: Milestone[] = [
    { key: "primary_confirmed", label: "Primary Vendor Confirmed", done: s.primaryStatus === "accepted" || s.primaryStatus === "completed" },
  ];
  if (s.choice === "primary_plus_standby") {
    milestones.push({
      key: "standby_confirmed",
      label: "Standby Vendor Confirmed",
      done: s.standbyStatus === "accepted" || s.standbyStatus === "activated" || s.standbyStatus === "released",
    });
    milestones.push({ key: "vendor_released", label: "Vendor Released", done: s.standbyStatus === "released" });
  }
  milestones.push({
    key: "event_completed",
    label: "Event Completed",
    done: s.primaryStatus === "completed",
  });
  return milestones;
}

// ── Disclaimers ─────────────────────────────────────────────────
export const VENDOR_PROTECTION_DISCLAIMERS = [
  "Magical Moments facilitates communication between customers and independent vendors.",
  "The customer remains responsible for reviewing contracts and confirming pricing directly with each vendor.",
  "A Standby Vendor represents an additional option for event continuity but does not guarantee availability, pricing, or performance.",
] as const;

// ── Future enhancements (documented; not built) ─────────────────
export const VENDOR_PROTECTION_FUTURE = [
  "Vendor deposits", "Availability syncing", "Automatic backup matching",
  "AI vendor recommendations", "Verified vendors", "Premium vendor memberships",
  "Emergency vendor replacement", "Calendar integration", "Text notifications",
  "Real-time acceptance updates",
] as const;
