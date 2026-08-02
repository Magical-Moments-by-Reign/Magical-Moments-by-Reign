// ── Magical Preview Pass — trial membership + billing logic ──────
// A trial that lets a new customer explore before a paid monthly membership
// begins. It must be TRANSPARENT: exact price, exact billing date, exact trial
// length, the selected paid plan, an un-pre-checked consent box, easy online
// cancellation, and no surprise charges. This module is the PURE domain layer —
// trial-date math, the exact disclosure/consent/refund copy (versioned),
// reminder scheduling, status + cancellation + failed-payment logic, and
// one-trial-per-customer eligibility.
//
// NOT billing itself: card capture, tokenization, recurring charges, webhooks,
// receipts, and reminder delivery run server-side through Square + email seams.
// Nothing here charges a card or fabricates a conversion. Prices are always
// validated server-side (never trusted from the browser). Trial length is
// configurable (stored in config/DB) — DEFAULT_TRIAL_DAYS is only the default.

export const TRIAL_NAME = "Magical Preview Pass";
export const TRIAL_TAGLINE = "Explore the experience before your paid membership begins.";
export const DEFAULT_TRIAL_DAYS = 7;

export const CONSENT_TEXT_VERSION = "TRIAL_CONSENT_V1";
export const REFUND_POLICY_VERSION = "TRIAL_REFUND_V1";
export const BILLING_FREQUENCY = "monthly";

// ── Dates ───────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface TrialDates {
  startISO: string;
  endISO: string;         // last moment of trial access
  firstBillingISO: string; // the card is charged when the trial ends
}

/** Compute trial start/end and the first billing date from a start + length. */
export function computeTrialDates(startISO: string, days: number = DEFAULT_TRIAL_DAYS): TrialDates {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + Math.max(1, days) * DAY_MS);
  return { startISO: start.toISOString(), endISO: end.toISOString(), firstBillingISO: end.toISOString() };
}

/** Deterministic "Month D, YYYY" (UTC) for disclosure copy. */
export function formatBillingDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatUSD(cents: number): string {
  const dollars = Math.max(0, Math.round(cents)) / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: dollars % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Whole days remaining in the trial (never negative) — for the dashboard countdown. */
export function daysRemaining(endISO: string, nowISO: string): number {
  const ms = new Date(endISO).getTime() - new Date(nowISO).getTime();
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

// ── Exact disclosures (shown beside the consent box) ────────────
export interface DisclosureInput {
  planName: string;
  days: number;
  monthlyCents: number;
  firstBillingISO: string;
}

/** The exact consent-checkbox wording (values interpolated). Never pre-checked. */
export function consentText(i: DisclosureInput): string {
  const amount = formatUSD(i.monthlyCents);
  const date = formatBillingDate(i.firstBillingISO);
  return (
    `I understand that I am beginning a ${i.days}-day ${TRIAL_NAME} and that a valid payment card is required. ` +
    `Unless I cancel before my trial ends, my selected membership (${i.planName}) will automatically begin and my card ` +
    `will be charged ${amount} on ${date}, then every month until canceled. I understand that forgetting to cancel does ` +
    `not qualify for a refund, and that I may cancel through my account before the next billing date.`
  );
}

/** The billing summary block for checkout / the trial page. */
export function billingSummary(i: DisclosureInput) {
  return {
    selectedMembership: i.planName,
    trialLength: `${i.days} days`,
    amountDueToday: formatUSD(0),
    firstBillingDate: formatBillingDate(i.firstBillingISO),
    amountAfterTrial: formatUSD(i.monthlyCents),
    billingFrequency: "Monthly",
    renewal: "Renews automatically each month until canceled",
  };
}

/** The line shown directly beneath the "Start" button. */
export function ctaFinePrint(i: DisclosureInput): string {
  return `$0 due today. Your card will be charged ${formatUSD(i.monthlyCents)} on ${formatBillingDate(i.firstBillingISO)} unless canceled before the trial ends.`;
}

export const START_BUTTON_LABEL = (days: number) => `Start My ${days}-Day ${TRIAL_NAME}`;

export const TRIAL_CONVERSION_REFUND_POLICY = {
  version: REFUND_POLICY_VERSION,
  title: "Trial Conversion and Refund Policy",
  body: [
    `Your ${TRIAL_NAME} automatically converts to the paid membership you selected unless you cancel before the trial ends.`,
    "If you do not cancel before the stated billing date, your card will be charged and your paid membership will remain active for that monthly billing period.",
    "Magical Moments by Reign does not offer refunds solely because a customer forgot to cancel the trial or forgot about an upcoming renewal.",
    "Customers retain access to the paid membership through the end of the period already paid for.",
    "This policy does not limit any refund, dispute, or cancellation rights that may be required by applicable law.",
  ],
  legalNote: "The final wording must be reviewed by legal counsel before launch.",
} as const;

// ── Trial access vs. limits ─────────────────────────────────────
export const TRIAL_ACCESS = [
  "Create one draft Magical Moment", "Explore Ask Magical", "Select an occasion",
  "Test the experience builder", "Upload a limited number of photos", "Preview galleries",
  "Add sample event details", "Explore invitations", "Explore RSVP tools",
  "Explore registry and gift options", "Preview timeline features", "Preview planning tools",
  "Preview the vendor marketplace", "Preview social-sharing tools", "View pricing and preservation options",
] as const;

export const TRIAL_LIMITS = [
  "Draft experience only", "No public publishing", "No custom domain",
  "No full-resolution downloads", "No external guest invitations", "No vendor booking",
  "No live social publishing", "No printed products", "Limited uploads and storage",
  "Limited AI generations", "Watermark on preview output where appropriate",
] as const;

// ── Reminder schedule (delivery is a seam) ──────────────────────
export type ReminderType = "signup" | "three_days_before" | "one_day_before";
export interface ScheduledReminder { type: ReminderType; atISO: string; label: string; }

/** Pre-conversion reminders. Post-conversion / cancellation notices are
 *  event-triggered, not scheduled. Reminders in the past are omitted. */
export function reminderSchedule(dates: TrialDates): ScheduledReminder[] {
  const end = new Date(dates.endISO).getTime();
  const all: ScheduledReminder[] = [
    { type: "signup", atISO: dates.startISO, label: "Trial confirmation" },
    { type: "three_days_before", atISO: new Date(end - 3 * DAY_MS).toISOString(), label: "Your trial ends in 3 days" },
    { type: "one_day_before", atISO: new Date(end - 1 * DAY_MS).toISOString(), label: "Final reminder — your trial ends tomorrow" },
  ];
  // Keep only reminders at/after the signup moment (guards very short trials).
  const start = new Date(dates.startISO).getTime();
  return all.filter((r) => new Date(r.atISO).getTime() >= start);
}

// ── Membership status ───────────────────────────────────────────
export type MembershipStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

/** When the trial ends: a successful charge → active; a failed charge → past_due. */
export function onTrialEnd(paymentSucceeded: boolean): MembershipStatus {
  return paymentSucceeded ? "active" : "past_due";
}

// ── Cancellation ────────────────────────────────────────────────
export interface CancellationPreview {
  chargeWillOccur: boolean;
  accessEndsISO: string;
  contentRetained: boolean;
  canReactivate: boolean;
  message: string;
}

/**
 * What to show before confirming a cancellation. Canceling DURING the trial
 * means no charge and access through the trial end; canceling a PAID membership
 * keeps access through the period already paid for.
 */
export function cancellationPreview(
  status: MembershipStatus,
  dates: { trialEndISO: string; periodEndISO?: string },
): CancellationPreview {
  if (status === "trialing") {
    return {
      chargeWillOccur: false,
      accessEndsISO: dates.trialEndISO,
      contentRetained: true,
      canReactivate: true,
      message: "You canceled before your trial ends, so your card will not be charged. Your draft is saved and you can reactivate anytime.",
    };
  }
  const end = dates.periodEndISO ?? dates.trialEndISO;
  return {
    chargeWillOccur: false,
    accessEndsISO: end,
    contentRetained: true,
    canReactivate: true,
    message: "Your membership will not renew. You keep access through the end of the period you already paid for.",
  };
}

// ── Failed payment (at conversion) ──────────────────────────────
export const PAST_DUE_POLICY = {
  graceDays: 7,
  maxRetries: 3,
  publishBlocked: true,
  actions: [
    "Do not publish the experience",
    "Mark the membership Past Due",
    "Notify the customer and allow a card update",
    "Retry per the approved billing policy (limited attempts — never charge without limits)",
    "Suspend paid features after the grace period",
    "Preserve draft content temporarily — never delete immediately",
  ],
} as const;

/** Whether a paid feature is available given status (past-due blocks publishing). */
export function paidFeatureAvailable(status: MembershipStatus): boolean {
  return status === "active";
}

// ── Consent record (immutable) ──────────────────────────────────
export interface ConsentRecord {
  consentTextVersion: string;
  refundPolicyVersion: string;
  consentText: string;      // snapshot of exactly what was shown
  acceptedAtISO: string;
  ipHash?: string;
  planId: string;
  trialDays: number;
  firstChargeISO: string;
  firstChargeCents: number;
  recurringCents: number;
  billingFrequency: string;
}

export function buildConsentRecord(i: DisclosureInput & { planId: string; acceptedAtISO: string; ipHash?: string }): ConsentRecord {
  return {
    consentTextVersion: CONSENT_TEXT_VERSION,
    refundPolicyVersion: REFUND_POLICY_VERSION,
    consentText: consentText(i),
    acceptedAtISO: i.acceptedAtISO,
    ipHash: i.ipHash,
    planId: i.planId,
    trialDays: i.days,
    firstChargeISO: i.firstBillingISO,
    firstChargeCents: i.monthlyCents,
    recurringCents: i.monthlyCents,
    billingFrequency: BILLING_FREQUENCY,
  };
}

// ── Abuse prevention (one introductory trial per customer) ──────
export interface TrialHistory {
  priorTrialsForAccount: number;
  priorTrialsForEmail: number;
  priorTrialsForSquareCustomer: number;
  priorTrialsForCardFingerprint: number;
}

/** One introductory trial per customer unless an admin approves an exception. */
export function eligibleForTrial(h: TrialHistory, adminException = false): boolean {
  if (adminException) return true;
  return (
    h.priorTrialsForAccount === 0 &&
    h.priorTrialsForEmail === 0 &&
    h.priorTrialsForSquareCustomer === 0 &&
    h.priorTrialsForCardFingerprint === 0
  );
}

// ── FAQ ─────────────────────────────────────────────────────────
export const TRIAL_FAQ: { q: string; a: string }[] = [
  { q: "Is the Magical Preview Pass free?", a: "The pass itself has no charge today, but it is not a free-forever plan. It’s a preview before your selected paid monthly membership begins. A valid card is required, and unless you cancel before the trial ends, your membership begins automatically." },
  { q: "Why is a card required?", a: "So your membership can begin seamlessly when the trial ends. Your card is securely stored with Square — Magical Moments never sees or stores your full card number." },
  { q: "When will I be charged?", a: "On your first billing date — the day your trial ends — unless you cancel before then. The exact date and amount are shown before you begin." },
  { q: "Which membership begins after the trial?", a: "The paid monthly membership you select at checkout. We always show its name and price before you confirm." },
  { q: "Can I cancel before the trial ends?", a: "Yes — anytime, online, in your account. Cancel before the billing date and you won’t be charged." },
  { q: "How do I cancel?", a: "Account → Membership & Billing → Cancel Trial. No calls or emails required." },
  { q: "Will I receive a reminder before I am charged?", a: "Yes — at signup, three days before, and one day before your trial ends, each with the exact amount, billing date, and a direct cancellation link." },
  { q: "What happens if I forget to cancel?", a: "Your membership begins and your card is charged for that monthly period. We don’t refund solely for forgetting to cancel, but you keep access through the period you paid for." },
  { q: "Can I receive a refund after the charge?", a: "See our Trial Conversion and Refund Policy. We don’t refund solely for a forgotten cancellation; this doesn’t limit any rights required by law." },
  { q: "What happens to my draft if I cancel?", a: "Your draft is saved. You can reactivate later and pick up where you left off." },
  { q: "Can I restart a trial?", a: "Each customer is eligible for one introductory trial. An admin may approve exceptions." },
  { q: "Can I change my selected membership before the trial ends?", a: "Yes — you can change your selected membership in your account before your first billing date." },
];
