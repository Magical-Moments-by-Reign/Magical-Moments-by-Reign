// ── Vendor Membership, Verification & Compliance ────────────────
// An ongoing, trust-based relationship for marketplace vendors: no upfront fee
// (the annual membership fee is deducted from the vendor's first completed,
// successfully-paid booking), annual renewal, and annual business verification
// (licenses, insurance, certifications). Expired/missing required credentials
// auto-inactivate the vendor; once re-approved they auto-return to Active.
//
// This is the PURE domain layer: fee-collection logic, renewal dates,
// verification checklist, compliance evaluation, expiration reminders, and the
// independent-contractor / right-to-verify copy. Vendors are INDEPENDENT
// businesses — Magical Moments provides no insurance and guarantees no
// performance. Actual fee deduction runs through Square (booking payout seam),
// document uploads through storage, and reminders through email — all gated.

// ── Membership status ───────────────────────────────────────────
export type MembershipStatus = "active" | "inactive" | "pending_verification" | "suspended";

// ── Credentials & verification ──────────────────────────────────
export type CredentialKind =
  | "business_info"
  | "contact_info"
  | "business_address"
  | "service_areas"
  | "business_license"
  | "certification"
  | "gl_insurance"
  | "workers_comp"
  | "other_required";

export const VERIFICATION_ITEMS: { kind: CredentialKind; label: string; conditional: boolean }[] = [
  { kind: "business_info", label: "Business information", conditional: false },
  { kind: "contact_info", label: "Contact information", conditional: false },
  { kind: "business_address", label: "Business address", conditional: false },
  { kind: "service_areas", label: "Service areas", conditional: false },
  { kind: "business_license", label: "Business license", conditional: true },
  { kind: "certification", label: "Professional certifications", conditional: true },
  { kind: "gl_insurance", label: "General liability insurance", conditional: false },
  { kind: "workers_comp", label: "Workers' compensation insurance", conditional: true },
  { kind: "other_required", label: "Any documentation required by state or local law", conditional: true },
];

export interface Credential {
  kind: CredentialKind;
  /** Whether this credential is required for THIS vendor (some are conditional). */
  required: boolean;
  /** Present/uploaded. */
  provided: boolean;
  /** Reviewed & approved by Magical Moments. */
  verified: boolean;
  /** Expiration (ISO) for licenses/insurance/certs; null when not date-bound. */
  expiresAt?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function isExpired(expiresAt: string | null | undefined, nowISO: string): boolean {
  if (!expiresAt) return false;
  return new Date(nowISO).getTime() > new Date(expiresAt).getTime();
}

export interface ComplianceStatus {
  compliant: boolean;
  missing: CredentialKind[];      // required but not provided/verified
  expired: CredentialKind[];      // required and past expiration
  expiringSoon: { kind: CredentialKind; expiresAt: string; daysOut: number }[];
}

/**
 * Evaluate a vendor's credentials. Compliant only when every REQUIRED credential
 * is provided, verified, and unexpired. `expiringSoon` surfaces credentials
 * within `soonDays` (default 90) for reminders.
 */
export function complianceStatus(credentials: Credential[], nowISO: string, soonDays = 90): ComplianceStatus {
  const missing: CredentialKind[] = [];
  const expired: CredentialKind[] = [];
  const expiringSoon: { kind: CredentialKind; expiresAt: string; daysOut: number }[] = [];
  const now = new Date(nowISO).getTime();

  for (const c of credentials) {
    if (!c.required) continue;
    if (!c.provided || !c.verified) { missing.push(c.kind); continue; }
    if (isExpired(c.expiresAt, nowISO)) { expired.push(c.kind); continue; }
    if (c.expiresAt) {
      const daysOut = Math.ceil((new Date(c.expiresAt).getTime() - now) / DAY_MS);
      if (daysOut <= soonDays) expiringSoon.push({ kind: c.kind, expiresAt: c.expiresAt, daysOut });
    }
  }
  return { compliant: missing.length === 0 && expired.length === 0, missing, expired, expiringSoon };
}

// ── Marketplace activity resolution (auto in/out) ───────────────
export interface MarketplaceState {
  membershipStatus: MembershipStatus;
  compliance: ComplianceStatus;
}
export interface MarketplaceResolution {
  active: boolean;
  reason: "ok" | "membership_inactive" | "suspended" | "noncompliant";
  /** Effects while inactive (searches, bookings). */
  hiddenFromSearch: boolean;
  canAcceptBookings: boolean;
}

/**
 * A vendor is marketplace-active only when their membership is active AND they
 * are compliant. Non-compliant or inactive vendors are hidden and cannot accept
 * new bookings — existing completed bookings always remain in history.
 */
export function resolveMarketplace(state: MarketplaceState): MarketplaceResolution {
  if (state.membershipStatus === "suspended") {
    return { active: false, reason: "suspended", hiddenFromSearch: true, canAcceptBookings: false };
  }
  if (state.membershipStatus !== "active") {
    return { active: false, reason: "membership_inactive", hiddenFromSearch: true, canAcceptBookings: false };
  }
  if (!state.compliance.compliant) {
    return { active: false, reason: "noncompliant", hiddenFromSearch: true, canAcceptBookings: false };
  }
  return { active: true, reason: "ok", hiddenFromSearch: false, canAcceptBookings: true };
}

export const INACTIVE_EFFECTS = [
  "The vendor will not appear in marketplace searches.",
  "The vendor cannot accept new bookings.",
  "Existing completed bookings remain in history.",
  "The vendor dashboard clearly displays what documents require updating.",
] as const;

// ── Membership fee (no upfront cost) ────────────────────────────
export interface FeeDeduction {
  feeCents: number;
  deductedCents: number;   // amount taken from this booking
  vendorNetCents: number;  // what the vendor receives from this booking after the fee
  shortfallCents: number;  // remaining fee owed if the booking couldn't cover it
  fullyCollected: boolean;
}

/**
 * Deduct the (annual) membership fee from a completed, paid booking. No upfront
 * fee — this runs on the vendor's FIRST completed booking. If the booking can't
 * cover the whole fee, the shortfall is owed (→ direct-payment request).
 */
export function deductMembershipFee(bookingAmountCents: number, feeCents: number): FeeDeduction {
  const booking = Math.max(0, Math.round(bookingAmountCents));
  const fee = Math.max(0, Math.round(feeCents));
  const deducted = Math.min(booking, fee);
  return {
    feeCents: fee,
    deductedCents: deducted,
    vendorNetCents: booking - deducted,
    shortfallCents: fee - deducted,
    fullyCollected: deducted >= fee,
  };
}

// ── Renewal ─────────────────────────────────────────────────────
/** Annual renewal date (one year after join / last renewal). */
export function computeRenewalDate(fromISO: string): string {
  const d = new Date(fromISO);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

export function renewalDue(renewalDateISO: string, nowISO: string): boolean {
  return new Date(nowISO).getTime() >= new Date(renewalDateISO).getTime();
}

export interface RenewalPlan {
  due: boolean;
  /** After renewal is due, the fee comes from the first completed booking. */
  collectFromNextBooking: boolean;
  /** If no completed booking arrives within the window, request direct payment. */
  directPaymentRequired: boolean;
}

/**
 * How to collect the renewal fee. When renewal is due, take it from the next
 * completed booking; if none arrives within `graceDays`, request direct payment.
 */
export function renewalPlan(renewalDateISO: string, nowISO: string, hasBookingSinceRenewal: boolean, graceDays = 60): RenewalPlan {
  const due = renewalDue(renewalDateISO, nowISO);
  if (!due) return { due: false, collectFromNextBooking: false, directPaymentRequired: false };
  if (hasBookingSinceRenewal) return { due: true, collectFromNextBooking: true, directPaymentRequired: false };
  const daysSinceDue = Math.floor((new Date(nowISO).getTime() - new Date(renewalDateISO).getTime()) / DAY_MS);
  return { due: true, collectFromNextBooking: true, directPaymentRequired: daysSinceDue >= graceDays };
}

// ── Expiration reminders (delivery is a seam) ───────────────────
export const REMINDER_DAYS_BEFORE = [90, 60, 30, 14, 7, 0] as const;

export interface ExpirationReminder { daysBefore: number; atISO: string; }

/** The reminder timeline for a credential's expiration (past reminders omitted vs `nowISO`). */
export function expirationReminders(expiresAtISO: string, nowISO?: string): ExpirationReminder[] {
  const exp = new Date(expiresAtISO).getTime();
  const reminders = REMINDER_DAYS_BEFORE.map((d) => ({ daysBefore: d, atISO: new Date(exp - d * DAY_MS).toISOString() }));
  if (!nowISO) return reminders;
  const now = new Date(nowISO).getTime();
  return reminders.filter((r) => new Date(r.atISO).getTime() >= now);
}

// ── Copy (independent contractor / trust / verify) ──────────────
export const INDEPENDENT_CONTRACTOR_TERMS = {
  intro: "All vendors participate in the Magical Moments Marketplace as independent businesses.",
  createsNone: ["Employment", "Partnership", "Agency", "Franchise", "Joint Venture"],
  vendorResponsibleFor: [
    "Employees", "Independent contractors", "Payroll", "Taxes", "Equipment", "Insurance",
    "Licenses", "Contracts", "Service delivery", "Business operations", "Legal compliance",
  ],
} as const;

export const NO_INSURANCE_NOTICE =
  "Magical Moments by Reign does not provide insurance coverage for vendors. Each vendor is an independent business and is solely responsible for complying with all federal, state, and local laws.";

export const RIGHT_TO_VERIFY =
  "Magical Moments by Reign reserves the right to verify licenses, insurance, certifications, permits, and business information directly with issuing agencies or insurance providers at any time. Providing false, expired, altered, misleading, or fraudulent documentation may result in immediate suspension or permanent removal from the marketplace.";

export const CUSTOMER_TRUST_NOTICE =
  "Vendors in the Magical Moments Marketplace are expected to maintain current business credentials throughout their participation. The annual verification process helps maintain a trusted marketplace; however, Magical Moments by Reign does not guarantee the quality, pricing, scheduling, or performance of independent vendors.";
