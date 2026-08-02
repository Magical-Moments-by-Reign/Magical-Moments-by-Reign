// ── Customer Identity, Duplicate Prevention & Balance Controls ───
// One person = one Magical Moments account. This is the PURE domain layer
// that powers customer-identity: it normalizes contact/identity data,
// scores probable duplicates, masks sensitive values, gates purchasing by
// account status, plans safe account merges, and holds the exact
// customer-facing copy.
//
// IMPORTANT — what this module is NOT:
//   • It is NOT auth, and it stores nothing. Persistence, email/SMS
//     verification, Square customer IDs, encryption at rest, rate limiting,
//     and the signup/admin UI live on the accounts + billing + storage
//     foundation and are documented as seams (see
//     STANDARD-account-identity.md). Nothing here is faked.
//   • It contains NO lending or credit-scoring logic. Purchase restrictions
//     here are about *unresolved platform balances only*. Any financing
//     approval/credit decision belongs to an approved financing provider
//     (see src/lib/magical-plus.ts — the provider-agnostic gateway).
//
// Everything below is a pure function of the data you pass in, so it is
// fully unit-testable today without any external service.

// ── Required account information ─────────────────────────────────
export interface AddressInput {
  line1: string;      // street address
  line2?: string;     // apartment / unit
  city: string;
  state: string;      // state / region
  postal: string;     // ZIP / postal code
  country: string;    // ISO country (default "US")
}

export interface AccountInput {
  firstName: string;  // legal first name
  lastName: string;   // legal last name
  email: string;
  phone: string;      // mobile
  address: AddressInput;
  dateOfBirth?: string; // ISO date — only required for payment-plan / identity checks
  password?: string;    // or an approved secure social sign-in
  acceptedTerms: boolean;
}

export const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "Legal first name" },
  { key: "lastName", label: "Legal last name" },
  { key: "email", label: "Email address" },
  { key: "phone", label: "Mobile phone number" },
  { key: "address.line1", label: "Street address" },
  { key: "address.city", label: "City" },
  { key: "address.state", label: "State" },
  { key: "address.postal", label: "ZIP / postal code" },
  { key: "address.country", label: "Country" },
  { key: "acceptedTerms", label: "Agreement to Terms of Service & Privacy Policy" },
];

/** Returns the list of required fields still missing (empty = complete). */
export function missingRequiredFields(input: Partial<AccountInput>): string[] {
  const missing: string[] = [];
  const has = (v: unknown) => typeof v === "string" ? v.trim().length > 0 : !!v;
  if (!has(input.firstName)) missing.push("Legal first name");
  if (!has(input.lastName)) missing.push("Legal last name");
  if (!has(input.email)) missing.push("Email address");
  if (!has(input.phone)) missing.push("Mobile phone number");
  const a = input.address;
  if (!a || !has(a.line1)) missing.push("Street address");
  if (!a || !has(a.city)) missing.push("City");
  if (!a || !has(a.state)) missing.push("State");
  if (!a || !has(a.postal)) missing.push("ZIP / postal code");
  if (!a || !has(a.country)) missing.push("Country");
  if (!input.acceptedTerms) missing.push("Agreement to Terms of Service & Privacy Policy");
  return missing;
}

// ── Verification gates ──────────────────────────────────────────
// Purchasing and payment-plan privileges do not turn on until BOTH the
// email and the phone are verified (the actual link/SMS delivery is a seam).
export interface VerificationState {
  emailVerified: boolean;
  phoneVerified: boolean;
}

/** Purchasing is enabled only after email AND phone are verified. */
export function purchasingEnabled(v: VerificationState): boolean {
  return v.emailVerified && v.phoneVerified;
}

// ── Normalization ───────────────────────────────────────────────
// Matching compares *normalized* values so trivial formatting differences
// don't create duplicates, and so alternate emails/phones can be caught.

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Lowercase + trim. The stored/display normal form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A canonical email used ONLY for probable-duplicate matching: for Gmail-style
 * providers, dots in the local part are ignored and "+tag" suffixes stripped,
 * so alt+tag@gmail.com collapses onto the same person. Never shown to anyone.
 */
export function canonicalEmail(email: string): string {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf("@");
  if (at < 1) return e;
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  local = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

/** Digits only; if it looks like a US number keep the trailing 10 digits. */
export function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** Lowercased, punctuation- and accent-stripped, whitespace-collapsed name. */
export function normalizeName(first: string, last: string): string {
  const clean = (s: string) =>
    stripDiacritics((s || "").toLowerCase()).replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  return `${clean(first)} ${clean(last)}`.trim();
}

const STREET_ABBR: Record<string, string> = {
  street: "st", st: "st", avenue: "ave", ave: "ave", av: "ave",
  boulevard: "blvd", blvd: "blvd", drive: "dr", dr: "dr",
  road: "rd", rd: "rd", lane: "ln", ln: "ln", court: "ct", ct: "ct",
  place: "pl", pl: "pl", terrace: "ter", ter: "ter",
  apartment: "apt", apt: "apt", unit: "unit", suite: "ste", ste: "ste",
  north: "n", south: "s", east: "e", west: "w",
};

/**
 * A stable key for an address so the same home written different ways
 * collapses. NOTE: a shared address is never sufficient on its own to
 * treat two people as the same customer (see matchSignals).
 */
export function addressKey(a: AddressInput): string {
  const norm = (s?: string) =>
    stripDiacritics((s || "").toLowerCase())
      .replace(/[.,#]/g, " ")
      .split(/\s+/)
      .map((w) => STREET_ABBR[w] ?? w)
      .filter(Boolean)
      .join(" ")
      .trim();
  const postal = (a.postal || "").replace(/\s/g, "").slice(0, 5);
  const country = (a.country || "us").trim().toLowerCase();
  return [norm(a.line1), norm(a.line2), norm(a.city), norm(a.state), postal, country]
    .filter(Boolean)
    .join("|");
}

// ── Masking (never reveal full contact info before identity is verified) ──
export function maskEmail(email: string): string {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf("@");
  if (at < 1) return "•••••";
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  const head = local.slice(0, 1);
  const dot = domain.lastIndexOf(".");
  const tld = dot >= 0 ? domain.slice(dot) : "";
  return `${head}••••@${domain.slice(0, 1)}••••${tld}`;
}

export function maskPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length < 4) return "•••-•••-••••";
  return `•••-•••-${d.slice(-4)}`;
}

// ── Identity snapshot & duplicate detection ─────────────────────
// A snapshot is the set of identifiers we compare. `previousEmails` /
// `previousPhones` and `billingAddresses` catch customers who switch
// contact details to dodge a balance.
export interface IdentitySnapshot {
  accountId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: AddressInput;
  dateOfBirth?: string;
  previousEmails?: string[];
  previousPhones?: string[];
  billingAddresses?: AddressInput[];
  squareCustomerId?: string;
}

export interface MatchSignal {
  id: string;
  label: string;
  weight: number; // contribution to the match score
}

// Weights: a single verified strong identifier is decisive; softer signals
// must combine. Tuned so that a *shared address alone* never crosses review.
const W = {
  email: 1.0,
  phone: 1.0,
  square: 1.0,
  prevEmail: 0.9,
  prevPhone: 0.9,
  nameDob: 0.8,
  namePhone: 0.6,
  nameEmail: 0.6,
  nameAddress: 0.5,
  address: 0.0, // deliberately zero on its own
} as const;

export const REVIEW_THRESHOLD = 0.5; // ≥ → surface as a possible existing account
export const STRONG_THRESHOLD = 1.0; // ≥ → very likely the same person

/**
 * All the reasons two identities may be the same person. Address-on-its-own
 * contributes 0 — multiple legitimate people share a home.
 */
export function matchSignals(a: IdentitySnapshot, b: IdentitySnapshot): MatchSignal[] {
  const signals: MatchSignal[] = [];

  const aEmails = new Set([a.email, ...(a.previousEmails ?? [])].map(canonicalEmail).filter(Boolean));
  const bEmails = new Set([b.email, ...(b.previousEmails ?? [])].map(canonicalEmail).filter(Boolean));
  const aPhones = new Set([a.phone, ...(a.previousPhones ?? [])].map(normalizePhone).filter((p) => p.length >= 7));
  const bPhones = new Set([b.phone, ...(b.previousPhones ?? [])].map(normalizePhone).filter((p) => p.length >= 7));

  const emailPrimary = canonicalEmail(a.email) === canonicalEmail(b.email) && !!a.email;
  const phonePrimary = normalizePhone(a.phone) === normalizePhone(b.phone) && normalizePhone(a.phone).length >= 7;
  const emailAny = [...aEmails].some((e) => bEmails.has(e));
  const phoneAny = [...aPhones].some((p) => bPhones.has(p));

  if (emailPrimary) signals.push({ id: "email", label: "Verified email matches", weight: W.email });
  else if (emailAny) signals.push({ id: "prevEmail", label: "A previous email matches", weight: W.prevEmail });

  if (phonePrimary) signals.push({ id: "phone", label: "Verified phone matches", weight: W.phone });
  else if (phoneAny) signals.push({ id: "prevPhone", label: "A previous phone matches", weight: W.prevPhone });

  if (a.squareCustomerId && a.squareCustomerId === b.squareCustomerId)
    signals.push({ id: "square", label: "Square customer identifier matches", weight: W.square });

  const nameSame = normalizeName(a.firstName, a.lastName) === normalizeName(b.firstName, b.lastName) &&
    normalizeName(a.firstName, a.lastName).length > 1;

  const addrKeys = (s: IdentitySnapshot) => {
    const keys = new Set<string>();
    if (s.address) keys.add(addressKey(s.address));
    for (const ba of s.billingAddresses ?? []) keys.add(addressKey(ba));
    return keys;
  };
  const aAddr = addrKeys(a);
  const bAddr = addrKeys(b);
  const addressSame = [...aAddr].some((k) => k && bAddr.has(k));

  const dobSame = !!a.dateOfBirth && a.dateOfBirth === b.dateOfBirth;

  if (nameSame && dobSame) signals.push({ id: "nameDob", label: "Legal name and date of birth match", weight: W.nameDob });
  if (nameSame && (phoneAny || phonePrimary)) signals.push({ id: "namePhone", label: "Name matches a shared phone", weight: W.namePhone });
  if (nameSame && (emailAny || emailPrimary)) signals.push({ id: "nameEmail", label: "Name matches a shared email", weight: W.nameEmail });
  if (nameSame && addressSame) signals.push({ id: "nameAddress", label: "Legal name and residential address match", weight: W.nameAddress });

  return signals;
}

export type MatchTier = "none" | "review" | "strong";

export interface MatchResult {
  candidate: IdentitySnapshot;
  score: number;
  tier: MatchTier;
  signals: MatchSignal[];
  reasons: string[]; // human-readable, safe to show an admin (never another customer)
}

/** Score one identity against another (uses the single strongest of email/prev-email etc.). */
export function scoreMatch(a: IdentitySnapshot, b: IdentitySnapshot): MatchResult {
  const signals = matchSignals(a, b);
  const score = Math.round(signals.reduce((s, x) => s + x.weight, 0) * 100) / 100;
  const tier: MatchTier = score >= STRONG_THRESHOLD ? "strong" : score >= REVIEW_THRESHOLD ? "review" : "none";
  return { candidate: b, score, tier, signals, reasons: signals.map((s) => s.label) };
}

/**
 * Compare a signup against existing records and return probable matches,
 * best first. Anything at or above REVIEW_THRESHOLD is returned so the
 * "possible existing account" flow can run instead of creating a duplicate.
 */
export function findProbableMatches(candidate: IdentitySnapshot, existing: IdentitySnapshot[]): MatchResult[] {
  return existing
    .map((e) => scoreMatch(candidate, e))
    .filter((r) => r.tier !== "none")
    .sort((a, b) => b.score - a.score);
}

// ── Account status & purchase gating ────────────────────────────
export type AccountStatus =
  | "ACTIVE"
  | "PAYMENT_DUE"
  | "PAST_DUE"
  | "PAYMENT_PLAN_ACTIVE"
  | "PAYMENT_METHOD_FAILED"
  | "UNDER_REVIEW"
  | "CHARGEBACK_REVIEW"
  | "PURCHASE_RESTRICTED"
  | "FINANCING_RESTRICTED"
  | "CLOSED";

export const ACCOUNT_STATUSES: { id: AccountStatus; label: string; tone: "ok" | "attention" | "restricted" | "closed" }[] = [
  { id: "ACTIVE", label: "Active", tone: "ok" },
  { id: "PAYMENT_DUE", label: "Payment due", tone: "attention" },
  { id: "PAST_DUE", label: "Past due", tone: "attention" },
  { id: "PAYMENT_PLAN_ACTIVE", label: "Payment plan active", tone: "ok" },
  { id: "PAYMENT_METHOD_FAILED", label: "Payment method failed", tone: "attention" },
  { id: "UNDER_REVIEW", label: "Under review", tone: "attention" },
  { id: "CHARGEBACK_REVIEW", label: "Chargeback review", tone: "restricted" },
  { id: "PURCHASE_RESTRICTED", label: "Purchase restricted", tone: "restricted" },
  { id: "FINANCING_RESTRICTED", label: "Financing restricted", tone: "restricted" },
  { id: "CLOSED", label: "Closed", tone: "closed" },
];

// Things a customer might try to do. "Always allowed" actions stay available
// even with an unresolved balance — we never make the account disappear.
export type AccountAction =
  | "login"
  | "view_library"       // Magical Moments Library (their memories)
  | "view_purchases"
  | "view_tracker"       // Magical Tracker updates
  | "payment_portal"
  | "make_payment"
  | "contact_support"
  | "update_contact"     // after re-verification
  | "paid_in_full_purchase"
  | "financed_purchase"
  | "pay_later_application"
  | "new_installment_plan"
  | "transfer_unpaid_purchase"
  | "apply_gift_credit";

const ALWAYS_ALLOWED: AccountAction[] = [
  "login", "view_library", "view_purchases", "view_tracker",
  "payment_portal", "make_payment", "contact_support", "update_contact",
];

// Actions that must be blocked whenever a balance is unresolved.
const BALANCE_BLOCKED: AccountAction[] = [
  "financed_purchase", "pay_later_application", "new_installment_plan",
  "transfer_unpaid_purchase", "apply_gift_credit",
];

const UNRESOLVED_STATUSES: AccountStatus[] = [
  "PAST_DUE", "PAYMENT_METHOD_FAILED", "CHARGEBACK_REVIEW",
  "PURCHASE_RESTRICTED", "FINANCING_RESTRICTED",
];

export interface AccountGateConfig {
  /** Business rule: may a past-due customer still buy paid-in-full items? */
  allowPaidInFullWhilePastDue?: boolean;
}

/** True when this status represents an unresolved balance / restriction. */
export function isUnresolved(status: AccountStatus): boolean {
  return UNRESOLVED_STATUSES.includes(status);
}

/**
 * The single gate for "can this account do X right now?". Memories and
 * resolution paths are always open; new debt-creating actions are blocked
 * while a balance is unresolved. Never a lending decision — only platform
 * balance state.
 */
export function canPerform(status: AccountStatus, action: AccountAction, config: AccountGateConfig = {}): boolean {
  if (ALWAYS_ALLOWED.includes(action)) return status !== "CLOSED" ? true : action !== "update_contact";

  if (status === "CLOSED") return false;
  if (status === "ACTIVE" || status === "PAYMENT_DUE" || status === "PAYMENT_PLAN_ACTIVE") {
    // A plan being active blocks opening *another* plan / financed purchase.
    if (status === "PAYMENT_PLAN_ACTIVE" &&
      (action === "financed_purchase" || action === "new_installment_plan" || action === "pay_later_application")) {
      return false;
    }
    return true;
  }

  // Unresolved / review states.
  if (BALANCE_BLOCKED.includes(action)) return false;
  if (action === "paid_in_full_purchase") {
    if (status === "PAST_DUE" || status === "PAYMENT_METHOD_FAILED") return !!config.allowPaidInFullWhilePastDue;
    return false; // restricted/chargeback/review states block all new purchases
  }
  return false;
}

/** Convenience: all actions currently allowed for a status. */
export function allowedActions(status: AccountStatus, config: AccountGateConfig = {}): AccountAction[] {
  const all: AccountAction[] = [
    ...ALWAYS_ALLOWED, "paid_in_full_purchase", "financed_purchase",
    "pay_later_application", "new_installment_plan", "transfer_unpaid_purchase", "apply_gift_credit",
  ];
  return all.filter((a) => canPerform(status, a, config));
}

// ── Account merge planning (support-approved only) ──────────────
export interface MergePlan {
  primaryId: string;
  duplicateId: string;
  moves: string[];        // what content transfers to the primary
  preserved: string[];    // what is preserved and never erased
  blocked: string[];      // guardrails that must hold
  reusePrevented: true;   // the closed duplicate can never be reused
}

/**
 * Produce an auditable merge plan. This never erases balances, disputes, or
 * history, never merges unrelated people, and marks the duplicate closed so
 * it can't be reused. Actual execution requires support authorization +
 * identity verification (a seam) — this only describes the safe plan.
 */
export function planMerge(primaryId: string, duplicateId: string): MergePlan {
  return {
    primaryId,
    duplicateId,
    moves: [
      "Purchases & orders", "Gifts & gift credits", "Experiences / Journeys",
      "Magical Moments Library content", "Magical Tracker history", "Verified contact identifiers",
    ],
    preserved: [
      "All balances (never erased)", "Disputes & chargebacks", "Full payment history",
      "Complete audit log of the merge",
    ],
    blocked: [
      "Never merge unrelated people", "Requires identity verification",
      "Support staff approval required", "Redirect future logins to the primary account",
    ],
    reusePrevented: true,
  };
}

// ── Customer-facing copy (respectful; never accusatory) ─────────
export const MESSAGES = {
  possibleExisting:
    "It looks like you may already have a Magical Moments account. Let's help you regain access.",
  reconnect:
    "We found an existing Magical Moments account connected to your information. Please sign in or verify your identity so we can reconnect you with your purchases and account details.",
  balanceAttention:
    "Your account needs attention before additional payment plans can be opened. You can review your balance, update your payment method, or contact support below.",
  recoveryOptions: [
    "Send a login link to your verified email",
    "Send a verification code to your verified phone",
    "Reset your password",
    "Update an old email after identity verification",
    "Update an old phone after identity verification",
    "Contact support for account recovery",
  ],
} as const;

// The preferred flow — recovery is always easier than duplication.
export const PREFERRED_FLOW = [
  "Recognize customer",
  "Recover existing account",
  "Reconnect all purchases",
  "Display unresolved balance",
  "Provide a clear resolution path",
  "Restore eligible purchasing access",
] as const;

// ── Exact-match detection ───────────────────────────────────────
/**
 * True when two identities share a *decisive* identifier — verified email,
 * verified phone, or Square customer id. Exact matches always route to
 * recovery, never a new account.
 */
export function exactMatch(a: IdentitySnapshot, b: IdentitySnapshot): boolean {
  if (a.email && canonicalEmail(a.email) === canonicalEmail(b.email)) return true;
  const pa = normalizePhone(a.phone);
  if (pa.length >= 7 && pa === normalizePhone(b.phone)) return true;
  if (a.squareCustomerId && a.squareCustomerId === b.squareCustomerId) return true;
  return false;
}

// ── Existing-account recovery decision ──────────────────────────
// Given the probable matches for a signup, decide whether to block a new
// account and route to recovery. NEVER exposes private info — only masked
// email/phone of the best match are surfaced.
export interface RecoveryMatch {
  accountId?: string;
  tier: MatchTier;
  score: number;
  reasons: string[];
  maskedEmail: string;
  maskedPhone: string;
}

export interface RecoveryDecision {
  /** "recover" = block new account, route to recovery; "create" = safe to proceed. */
  action: "recover" | "create";
  message: string;
  options: string[];      // recovery options (only when action === "recover")
  match: RecoveryMatch | null;
}

/**
 * Decide the signup outcome from ranked matches (best first). Any review/strong
 * match prefers recovery over creating a duplicate.
 */
export function recoveryDecision(matches: MatchResult[]): RecoveryDecision {
  const best = matches[0];
  if (!best || best.tier === "none") {
    return { action: "create", message: "", options: [], match: null };
  }
  return {
    action: "recover",
    message: MESSAGES.possibleExisting,
    options: [...MESSAGES.recoveryOptions],
    match: {
      accountId: best.candidate.accountId,
      tier: best.tier,
      score: best.score,
      reasons: best.reasons,
      maskedEmail: maskEmail(best.candidate.email),
      maskedPhone: maskPhone(best.candidate.phone),
    },
  };
}

// ── Admin-review decision objects ───────────────────────────────
export type AdminAction =
  | "confirm_same"
  | "confirm_different"
  | "send_recovery"
  | "merge"
  | "restrict"
  | "remove_restriction"
  | "add_note"
  | "escalate";

export const ADMIN_ACTIONS: { id: AdminAction; label: string }[] = [
  { id: "confirm_same", label: "Confirm same customer" },
  { id: "confirm_different", label: "Confirm different people" },
  { id: "send_recovery", label: "Send account-recovery message" },
  { id: "merge", label: "Merge accounts" },
  { id: "restrict", label: "Restrict new purchases" },
  { id: "remove_restriction", label: "Remove an incorrect restriction" },
  { id: "add_note", label: "Add internal note" },
  { id: "escalate", label: "Escalate for payment / fraud review" },
];

export interface AdminReviewDecision {
  action: AdminAction;
  /** Requires re-verifying the customer's identity before applying. */
  requiresVerification: boolean;
  /** Requires an authorized support/admin role. */
  requiresAuthorization: boolean;
  /** The DuplicateReview status this action resolves to (null = no change). */
  resolvesReviewTo: "same_customer" | "different_people" | "merged" | "dismissed" | null;
  /** Plain description of the effect. */
  effect: string;
  /** Every admin action is logged (identity, time, reason, prev/new status). */
  auditRequired: true;
}

/** Describe the effect + guardrails of an admin review action (pure; applying it is a seam). */
export function adminDecision(action: AdminAction): AdminReviewDecision {
  const base = { action, auditRequired: true as const };
  switch (action) {
    case "confirm_same":
      return { ...base, requiresVerification: true, requiresAuthorization: true, resolvesReviewTo: "same_customer", effect: "Marks the accounts as the same customer; recommend a verified merge." };
    case "confirm_different":
      return { ...base, requiresVerification: false, requiresAuthorization: true, resolvesReviewTo: "different_people", effect: "Marks the accounts as different people; clears the duplicate flag." };
    case "send_recovery":
      return { ...base, requiresVerification: false, requiresAuthorization: true, resolvesReviewTo: null, effect: "Sends a masked account-recovery message to the existing account's verified channel." };
    case "merge":
      return { ...base, requiresVerification: true, requiresAuthorization: true, resolvesReviewTo: "merged", effect: "Executes a verified merge into the primary; preserves balances/disputes/history; closes the duplicate for reuse." };
    case "restrict":
      return { ...base, requiresVerification: false, requiresAuthorization: true, resolvesReviewTo: null, effect: "Applies a purchase/financing restriction; logged with reason and prior status." };
    case "remove_restriction":
      return { ...base, requiresVerification: false, requiresAuthorization: true, resolvesReviewTo: null, effect: "Removes an incorrect restriction; logged with reason (correction process)." };
    case "add_note":
      return { ...base, requiresVerification: false, requiresAuthorization: true, resolvesReviewTo: null, effect: "Adds an internal note to the review record." };
    case "escalate":
      return { ...base, requiresVerification: false, requiresAuthorization: true, resolvesReviewTo: null, effect: "Escalates to payment/fraud review; no automated decision is made." };
  }
}
