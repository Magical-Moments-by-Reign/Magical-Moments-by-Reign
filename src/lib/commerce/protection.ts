// ── Journey Purchase Protection — decision engine (pure) ────────
// Journey never simply completes a purchase. Before money changes hands it
// reviews the order and raises honest advisories: duplicate purchases, cheaper
// plan options, whether the amount crosses the member's protection threshold,
// and merchant-capability risks (e.g. no prorated upgrades → two charges).
//
// This module is PURE and I/O-free so it is unit-testable and identical on the
// client and server. It NEVER invents data: coupons and price-comparison need a
// live feed that isn't connected yet, so they are reported as "not connected"
// rather than fabricated. All money is in integer cents.

import type { MerchantProfile } from "./merchants";

export type Threshold = "always" | "50" | "100" | "250" | "500" | "never";

export interface OrderLine {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;   // cents
  image?: string;
  /** Stable key used for duplicate detection (e.g. sku or normalized name). */
  itemKey?: string;
}

export interface PlanOption {
  id: string;
  label: string;
  interval: "monthly" | "quarterly" | "annual" | "one_time";
  price: number;               // cents for the interval
  /** Price normalized to a monthly figure, for fair comparison. */
  normalizedMonthly: number;   // cents
}

export interface Order {
  merchantId: string;
  currency: string;            // "USD"
  items: OrderLine[];
  subtotal: number;            // cents
  tax: number;                 // cents
  shipping: number;            // cents
  discount: number;            // cents (positive number to subtract)
  total: number;               // cents (grand total)
  couponsApplied?: string[];
  deliveryAddress?: string;
  recipient?: string;
  giftMessage?: string;
  estimatedDelivery?: string;  // human date
  /** For subscriptions: the plan being purchased + the alternatives. */
  currentPlanId?: string;
  planOptions?: PlanOption[];
}

export interface PriorPurchase {
  merchantId: string;
  itemKey: string;
  label: string;
  purchasedAt: string;         // ISO
  kind?: string;               // "subscription" | "gift" | ...
  active?: boolean;            // e.g. an active subscription
}

export interface ProtectionContext {
  priorPurchases: PriorPurchase[];
  threshold: Threshold;
  now: string;                 // ISO — passed in so the engine stays pure
  duplicateWindowDays?: number; // default 30
}

export type AdvisoryLevel = "info" | "suggest" | "warn";
export interface Advisory {
  id: string;
  level: AdvisoryLevel;
  title: string;
  detail: string;
  /** Optional choices Journey offers for this advisory. */
  options?: string[];
  /** Feature that would power this but isn't connected yet. */
  comingSoon?: boolean;
}

export interface PromiseItem { label: string; state: "ok" | "warn" | "pending" }

export interface PurchaseReview {
  requiresConfirmation: boolean;   // the member must explicitly confirm
  reason: string;                  // why review is required (threshold/always)
  advisories: Advisory[];
  promise: PromiseItem[];          // the Journey Protection Promise checklist
}

const THRESHOLD_CENTS: Record<Threshold, number | null> = {
  always: 0, "50": 5_000, "100": 10_000, "250": 25_000, "500": 50_000, never: null,
};

/** Does this order cross the member's protection threshold (needs confirm)? */
export function requiresReview(totalCents: number, threshold: Threshold): boolean {
  const t = THRESHOLD_CENTS[threshold];
  if (t === null) return false;   // "never" — still shows the review screen, but no forced pause
  return totalCents >= t;
}

/** Cheaper equivalent plan (e.g. Annual saves vs Monthly). */
export function detectUpgrade(order: Order): Advisory | null {
  const opts = order.planOptions;
  if (!opts || opts.length < 2 || !order.currentPlanId) return null;
  const current = opts.find((o) => o.id === order.currentPlanId);
  if (!current) return null;
  const cheaper = opts
    .filter((o) => o.id !== current.id && o.normalizedMonthly < current.normalizedMonthly)
    .sort((a, b) => a.normalizedMonthly - b.normalizedMonthly)[0];
  if (!cheaper) return null;
  const annualSaving = Math.max(0, (current.normalizedMonthly - cheaper.normalizedMonthly) * 12);
  return {
    id: "upgrade",
    level: "suggest",
    title: `The ${cheaper.label} plan saves you money`,
    detail: `Switching to ${cheaper.label} saves about ${money(annualSaving)} each year versus ${current.label}.`,
    options: [`Switch & Save`, `Keep ${current.label}`, "Cancel"],
  };
}

/** Recent purchase of the same item from the same merchant → duplicate warning. */
export function detectDuplicate(order: Order, ctx: ProtectionContext): Advisory | null {
  const windowMs = (ctx.duplicateWindowDays ?? 30) * 86_400_000;
  const now = Date.parse(ctx.now);
  for (const line of order.items) {
    const key = line.itemKey || norm(line.name);
    const prior = ctx.priorPurchases.find((p) =>
      p.merchantId === order.merchantId && (p.itemKey === key || norm(p.label) === key) &&
      (p.active || (Number.isFinite(Date.parse(p.purchasedAt)) && now - Date.parse(p.purchasedAt) <= windowMs)),
    );
    if (prior) {
      return {
        id: "duplicate",
        level: "warn",
        title: "You may already have this",
        detail: prior.active
          ? `You already have an active ${prior.label} from this merchant.`
          : `You recently purchased ${prior.label} from this merchant on ${shortDate(prior.purchasedAt)}.`,
        options: ["Purchase Another", "Review Previous Purchase", "Cancel"],
      };
    }
  }
  return null;
}

/** Warn when the merchant can't prorate/credit an upgrade → risk of two charges. */
export function merchantWarnings(order: Order, merchant: MerchantProfile, ctx: ProtectionContext): Advisory[] {
  const out: Advisory[] = [];
  const buyingPlan = Boolean(order.currentPlanId || (order.planOptions && order.planOptions.length));
  const hasActive = ctx.priorPurchases.some((p) => p.merchantId === order.merchantId && p.active);
  if (buyingPlan && hasActive && !merchant.capabilities.proratedBilling) {
    out.push({
      id: "no-proration",
      level: "warn",
      title: "This merchant does not credit previous purchases toward upgrades",
      detail: "Purchasing this plan today may result in two separate charges. Journey can't credit what you already paid unless the merchant supports prorated upgrades.",
      options: ["Continue", "Cancel"],
    });
  }
  if (buyingPlan && !merchant.capabilities.subscriptionUpgrades) {
    out.push({
      id: "no-upgrade-path",
      level: "info",
      title: "No in-place upgrade path",
      detail: "This merchant doesn't support changing an existing plan — you may need to cancel the old one separately.",
    });
  }
  return out;
}

/** Coupons + best-price checks need a live feed that isn't connected — honest. */
export function savingsAdvisories(): Advisory[] {
  return [
    { id: "coupons", level: "info", title: "Coupon & discount search", detail: "Journey will automatically search for coupons and better pricing before checkout.", comingSoon: true },
  ];
}

/** The Journey Protection Promise checklist for this order. */
export function protectionPromise(order: Order, advisories: Advisory[]): PromiseItem[] {
  const has = (id: string) => advisories.some((a) => a.id === id);
  return [
    { label: "Correct merchant", state: order.merchantId ? "ok" : "warn" },
    { label: "Correct product", state: order.items.length ? "ok" : "warn" },
    { label: "Correct quantity", state: order.items.every((i) => i.quantity > 0) ? "ok" : "warn" },
    { label: "Best available pricing", state: "pending" }, // coupon/price feed = Coming Soon
    { label: "Coupons applied", state: order.couponsApplied?.length ? "ok" : "pending" },
    { label: "Duplicate purchase check", state: has("duplicate") ? "warn" : "ok" },
    { label: "Upgrade opportunities", state: has("upgrade") ? "warn" : "ok" },
    { label: "Merchant policies reviewed", state: has("no-proration") ? "warn" : "ok" },
    { label: "Delivery information", state: order.deliveryAddress || order.estimatedDelivery ? "ok" : "pending" },
    { label: "Final customer approval", state: "pending" }, // becomes ok only on explicit Confirm
  ];
}

/** Full review Journey shows before any payment. */
export function reviewPurchase(order: Order, merchant: MerchantProfile, ctx: ProtectionContext): PurchaseReview {
  const advisories: Advisory[] = [];
  const dup = detectDuplicate(order, ctx); if (dup) advisories.push(dup);
  const up = detectUpgrade(order); if (up) advisories.push(up);
  advisories.push(...merchantWarnings(order, merchant, ctx));
  advisories.push(...savingsAdvisories());

  const forced = requiresReview(order.total, ctx.threshold);
  return {
    requiresConfirmation: true, // the review screen is ALWAYS shown; threshold controls the pause emphasis
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
function norm(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
