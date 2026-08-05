// ── Journey Purchase Protection — modular decision engine (pure) ─
// Journey never simply completes a purchase. Before money changes hands it runs
// a set of INDEPENDENT protection checks and shows honest findings. Each check is
// its own module (id + optional settings toggle + run()) so integrations can be
// added, enabled, or disabled without redesigning the engine.
//
// Pure and I/O-free (identical on client + server, unit-testable). It NEVER
// invents data: anything that needs a live merchant feed is reported as
// "coming_soon", and everything is labelled Verified / Estimated / Coming Soon so
// the member always knows what Journey actually knows.

import type { MerchantProfile } from "./merchants";

export type Threshold = "always" | "50" | "100" | "250" | "500" | "never";
export type Confidence = "verified" | "estimated" | "coming_soon";

export interface OrderLine {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;   // cents
  image?: string;
  itemKey?: string;    // stable key for duplicate detection
  digital?: boolean;   // digital good (no shipping)
}

export interface PlanOption {
  id: string;
  label: string;
  interval: "monthly" | "quarterly" | "annual" | "one_time";
  price: number;               // cents for the interval
  normalizedMonthly: number;   // cents, for fair comparison
}

export interface Order {
  merchantId: string;
  currency: string;
  items: OrderLine[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  couponsApplied?: string[];
  paymentMethod?: string;      // e.g. "Visa •• 4242"
  financing?: string;          // e.g. "Affirm — 4 payments" (only if actually selected)
  deliveryAddress?: string;
  recipient?: string;
  giftMessage?: string;
  estimatedDelivery?: string;
  currentPlanId?: string;
  planOptions?: PlanOption[];
}

export interface PriorPurchase {
  merchantId: string;
  itemKey: string;
  label: string;
  purchasedAt: string;   // ISO
  kind?: string;
  active?: boolean;
}

export interface ProtectionSettings {
  threshold: Threshold;
  duplicateDetection: boolean;
  subscriptionDetection: boolean;
  budgetWarnings: boolean;
  financingSuggestions: boolean;
  cashbackSuggestions: boolean;
  familyApproval: boolean;   // requires setup (Coming Soon)
  biometric: boolean;        // requires setup (Coming Soon)
  notifications: boolean;
}

export const DEFAULT_SETTINGS: ProtectionSettings = {
  threshold: "always", duplicateDetection: true, subscriptionDetection: true, budgetWarnings: true,
  financingSuggestions: true, cashbackSuggestions: true, familyApproval: false, biometric: false, notifications: true,
};

export interface ProtectionContext {
  priorPurchases: PriorPurchase[];
  now: string;                    // ISO — passed in so the engine stays pure
  duplicateWindowDays?: number;   // default 30
  settings?: ProtectionSettings;
}

export type AdvisoryLevel = "info" | "suggest" | "warn";
export interface Advisory {
  id: string;
  level: AdvisoryLevel;
  confidence: Confidence;
  title: string;
  detail: string;
  options?: string[];
  comingSoon?: boolean;
}

export interface PromiseItem { label: string; state: "ok" | "warn" | "pending" }

export interface PurchaseReview {
  requiresConfirmation: boolean;
  forcedPause: boolean;
  reason: string;
  advisories: Advisory[];
  promise: PromiseItem[];
}

const HIGH_VALUE_CENTS = 50_000; // $500
const THRESHOLD_CENTS: Record<Threshold, number | null> = {
  always: 0, "50": 5_000, "100": 10_000, "250": 25_000, "500": 50_000, never: null,
};

/** Does this order cross the member's protection threshold (forces a pause)? */
export function requiresReview(totalCents: number, threshold: Threshold): boolean {
  const t = THRESHOLD_CENTS[threshold];
  if (t === null) return false;
  return totalCents >= t;
}

// ── individual, testable checks ─────────────────────────────────

export function detectUpgrade(order: Order): Advisory | null {
  const opts = order.planOptions;
  if (!opts || opts.length < 2 || !order.currentPlanId) return null;
  const current = opts.find((o) => o.id === order.currentPlanId);
  if (!current) return null;
  const cheaper = opts.filter((o) => o.id !== current.id && o.normalizedMonthly < current.normalizedMonthly)
    .sort((a, b) => a.normalizedMonthly - b.normalizedMonthly)[0];
  if (!cheaper) return null;
  const annualSaving = Math.max(0, (current.normalizedMonthly - cheaper.normalizedMonthly) * 12);
  return {
    id: "upgrade", level: "suggest", confidence: "verified",
    title: `The ${cheaper.label} plan saves you money`,
    detail: `Switching to ${cheaper.label} saves about ${money(annualSaving)} each year versus ${current.label}.`,
    options: ["Switch & Save", `Keep ${current.label}`, "Cancel"],
  };
}

export function detectDuplicate(order: Order, ctx: ProtectionContext): Advisory | null {
  const windowMs = (ctx.duplicateWindowDays ?? 30) * 86_400_000;
  const now = Date.parse(ctx.now);
  for (const line of order.items) {
    const key = line.itemKey || norm(line.name);
    const prior = ctx.priorPurchases.find((p) =>
      p.merchantId === order.merchantId && !p.active && (p.itemKey === key || norm(p.label) === key) &&
      Number.isFinite(Date.parse(p.purchasedAt)) && now - Date.parse(p.purchasedAt) <= windowMs);
    if (prior) {
      return {
        id: "duplicate", level: "warn", confidence: "verified",
        title: "You may already have this",
        detail: `You recently purchased ${prior.label} from this merchant on ${shortDate(prior.purchasedAt)}.`,
        options: ["Purchase Another", "Review Previous Purchase", "Cancel"],
      };
    }
  }
  return null;
}

export function detectSubscriptionConflict(order: Order, ctx: ProtectionContext): Advisory | null {
  const active = ctx.priorPurchases.find((p) => p.merchantId === order.merchantId && p.active);
  if (!active) return null;
  const buyingPlan = Boolean(order.currentPlanId || order.planOptions?.length);
  if (!buyingPlan) return null;
  return {
    id: "subscription", level: "warn", confidence: "verified",
    title: "You already have an active subscription here",
    detail: `You already have an active ${active.label} with this merchant. Buying another plan may create a second subscription.`,
    options: ["Review Existing Subscription", "Continue Anyway", "Cancel"],
  };
}

export function merchantWarnings(order: Order, merchant: MerchantProfile, ctx: ProtectionContext): Advisory[] {
  const out: Advisory[] = [];
  const buyingPlan = Boolean(order.currentPlanId || order.planOptions?.length);
  const hasActive = ctx.priorPurchases.some((p) => p.merchantId === order.merchantId && p.active);
  if (buyingPlan && hasActive && !merchant.capabilities.proratedBilling) {
    out.push({
      id: "no-proration", level: "warn", confidence: merchant.verified ? "verified" : "estimated",
      title: "This merchant does not credit previous purchases toward upgrades",
      detail: "Purchasing this plan today may result in two separate charges. Journey can't credit what you already paid unless the merchant supports prorated upgrades.",
      options: ["Continue", "Cancel"],
    });
  }
  return out;
}

function budgetAdvisories(order: Order, ctx: ProtectionContext): Advisory[] {
  const out: Advisory[] = [];
  const s = ctx.settings ?? DEFAULT_SETTINGS;
  if (requiresReview(order.total, s.threshold) && s.threshold !== "always") {
    out.push({ id: "threshold", level: "info", confidence: "verified", title: "Above your protection threshold",
      detail: `This ${money(order.total)} purchase is at or above your ${thresholdLabel(s.threshold)} threshold, so Journey paused for your review.` });
  }
  if (order.total >= HIGH_VALUE_CENTS) {
    out.push({ id: "high-value", level: "info", confidence: "verified", title: "High-value purchase",
      detail: `This is a large purchase (${money(order.total)}). Please double-check the merchant, amount, and payment method.` });
  }
  return out;
}

function merchantTrust(merchant: MerchantProfile): Advisory | null {
  if (merchant.verified) return null;
  return { id: "merchant-trust", level: "info", confidence: "estimated",
    title: "Merchant not yet verified", detail: "Journey hasn't verified this merchant's policies. Treat capability and policy details as estimated until confirmed." };
}

function financingAdvisory(order: Order, merchant: MerchantProfile): Advisory | null {
  if (!merchant.capabilities.financing || order.total < 10_000) return null;
  return { id: "financing", level: "info", confidence: "estimated",
    title: "Financing may be available", detail: "This merchant offers financing for purchases this size. Journey never guarantees approval or invents terms — you'll see real options at checkout." };
}

function paymentMethodAdvisory(): Advisory {
  return { id: "payment-method", level: "info", confidence: "estimated",
    title: "Payment method tip", detail: "Paying with a rewards card may earn cashback. Journey shows general guidance here; real cashback rates come from your card issuer." };
}

function returnPolicy(merchant: MerchantProfile): Advisory {
  if (merchant.returnPolicy && merchant.verified) {
    return { id: "return-policy", level: "info", confidence: "verified", title: "Return policy", detail: merchant.returnPolicy };
  }
  return { id: "return-policy", level: "info", confidence: "coming_soon", comingSoon: true,
    title: "Return policy", detail: "The merchant's return policy will appear here once verified through an approved integration." };
}

function classification(order: Order): Advisory {
  const digital = order.items.length > 0 && order.items.every((i) => i.digital) && order.shipping === 0 && !order.deliveryAddress;
  return digital
    ? { id: "classification", level: "info", confidence: "estimated", title: "Digital purchase", detail: "No shipping — delivery is typically instant." }
    : { id: "classification", level: "info", confidence: "estimated", title: "Physical purchase", detail: "This order ships; check the delivery address and estimated arrival." };
}

function couponsComingSoon(): Advisory {
  return { id: "coupons", level: "info", confidence: "coming_soon", comingSoon: true,
    title: "Coupons & price comparison", detail: "Journey will automatically search for coupons and better pricing once merchant integrations are connected." };
}

// ── modular check registry ──────────────────────────────────────
export interface ProtectionCheck {
  id: string;
  label: string;
  setting?: keyof ProtectionSettings; // runs only when this setting is on
  run: (order: Order, merchant: MerchantProfile, ctx: ProtectionContext) => Advisory[];
}

export const CHECKS: ProtectionCheck[] = [
  { id: "duplicate", label: "Duplicate purchase detection", setting: "duplicateDetection", run: (o, _m, c) => { const a = detectDuplicate(o, c); return a ? [a] : []; } },
  { id: "subscription", label: "Existing subscription detection", setting: "subscriptionDetection", run: (o, _m, c) => { const a = detectSubscriptionConflict(o, c); return a ? [a] : []; } },
  { id: "upgrade", label: "Upgrade opportunity detection", run: (o) => { const a = detectUpgrade(o); return a ? [a] : []; } },
  { id: "budget", label: "Budget & high-value alerts", setting: "budgetWarnings", run: (o, _m, c) => budgetAdvisories(o, c) },
  { id: "merchant", label: "Merchant capability warnings", run: (o, m, c) => merchantWarnings(o, m, c) },
  { id: "merchant-trust", label: "Merchant trust information", run: (_o, m) => { const a = merchantTrust(m); return a ? [a] : []; } },
  { id: "financing", label: "Financing recommendations", setting: "financingSuggestions", run: (o, m) => { const a = financingAdvisory(o, m); return a ? [a] : []; } },
  { id: "payment-method", label: "Payment method recommendations", setting: "cashbackSuggestions", run: () => [paymentMethodAdvisory()] },
  { id: "return-policy", label: "Return policy summary", run: (_o, m) => [returnPolicy(m)] },
  { id: "classification", label: "Digital vs physical classification", run: (o) => [classification(o)] },
  { id: "coupons", label: "Coupons & price comparison (Coming Soon)", run: () => [couponsComingSoon()] },
];

/** Run every ENABLED check for this order and return the aggregated advisories. */
export function runProtection(order: Order, merchant: MerchantProfile, ctx: ProtectionContext): Advisory[] {
  const s = ctx.settings ?? DEFAULT_SETTINGS;
  return CHECKS.filter((c) => !c.setting || s[c.setting]).flatMap((c) => c.run(order, merchant, ctx));
}

export function protectionPromise(order: Order, advisories: Advisory[]): PromiseItem[] {
  const has = (id: string) => advisories.some((a) => a.id === id);
  return [
    { label: "Correct merchant", state: order.merchantId ? "ok" : "warn" },
    { label: "Correct product", state: order.items.length ? "ok" : "warn" },
    { label: "Correct quantity", state: order.items.every((i) => i.quantity > 0) ? "ok" : "warn" },
    { label: "Duplicate purchase check", state: has("duplicate") ? "warn" : "ok" },
    { label: "Subscription conflict check", state: has("subscription") ? "warn" : "ok" },
    { label: "Upgrade opportunities", state: has("upgrade") ? "warn" : "ok" },
    { label: "Merchant policies reviewed", state: has("no-proration") ? "warn" : "ok" },
    { label: "Payment optimization", state: "pending" },
    { label: "Delivery information", state: order.deliveryAddress || order.estimatedDelivery ? "ok" : "pending" },
    { label: "Final customer approval", state: "pending" },
  ];
}

/** The full review Journey shows before any payment. */
export function reviewPurchase(order: Order, merchant: MerchantProfile, ctx: ProtectionContext): PurchaseReview {
  const advisories = runProtection(order, merchant, ctx);
  const s = ctx.settings ?? DEFAULT_SETTINGS;
  const forced = requiresReview(order.total, s.threshold);
  return {
    requiresConfirmation: true,
    forcedPause: forced,
    reason: forced
      ? `This ${money(order.total)} purchase is at or above your protection threshold, so Journey paused for your review.`
      : "Journey always shows this review before completing a purchase.",
    advisories,
    promise: protectionPromise(order, advisories),
  };
}

// ── helpers ──
export function money(cents: number, currency = "USD"): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100); }
  catch { return `$${(cents / 100).toFixed(2)}`; }
}
export function thresholdLabel(t: Threshold): string {
  return t === "always" ? "Always ask" : t === "never" ? "Never ask" : `$${t}+`;
}
function norm(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
