// ── Commerce core ───────────────────────────────────────────────
// The cart shape + SERVER-AUTHORITATIVE pricing. Totals are always
// recomputed here from approved prices — the browser total is NEVER
// trusted. Currency is USD.
//
// ONE commerce model. A cart holds at most one primary purchase:
//   • a MEMBERSHIP  (term + occasions + protection), priced by the
//     pricing-engine — the single pricing authority; or
//   • a legacy preservation PLAN (plans.ts), for the /pricing flow.
// Plus optional add-ons. The Membership Builder, Cart, Checkout, and
// Order API all reference the SAME `CartMembership` object below, so a
// customer never selects a membership and then arrives at Checkout with
// an empty cart.
//
// Extensible by design: future purchase kinds (flights, hotels,
// restaurants, cruises, rental cars, experiences, vendor services) will
// attach to this same cart and move through the same Purchase Review →
// payment path — see PurchaseKind.

import { PLANS, ADD_ONS, getPlan, getAddOn, formatPrice, type PlanId } from "@/lib/plans";
import {
  quote, collectionFor, getTerm, JOURNEY_PROTECTION, formatUSD,
  type TermId, type Quote, type LifetimeCollection,
} from "@/lib/pricing-engine";

/** Purchase kinds the cart will support. Only "membership" (+ legacy
 *  "plan") are priced today; the rest are reserved so the same cart and
 *  Purchase Review flow can carry them once their providers are live. */
export type PurchaseKind =
  | "membership" | "plan"
  | "flight" | "hotel" | "restaurant" | "cruise" | "rental_car"
  | "experience" | "vendor_service";

/** The unified membership object — the single source of truth shared by
 *  the Builder, Cart, Checkout, Order API, and Purchase Review. Stores
 *  the INPUTS; price/collection are always DERIVED from the pricing
 *  engine (see membershipView / computeTotals) so they can never drift. */
export interface CartMembership {
  term: TermId;
  occasions: string[];   // journey/occasion ids selected in the Builder
  protection: boolean;   // Journey Protection add-on
  addedAt?: string;      // ISO timestamp (set by the Builder; optional)
}

export interface CartState {
  /** Membership selection (occasion-based, priced by pricing-engine). */
  membership?: CartMembership | null;
  /** Legacy preservation plan (plans.ts) — the /pricing flow. */
  planId: PlanId | null;
  /** addonId -> quantity */
  addons: Record<string, number>;
}

export const EMPTY_CART: CartState = { membership: null, planId: null, addons: {} };

export interface OrderLine {
  kind: "membership" | "plan" | "addon";
  id: string;
  label: string;
  unitPrice: number;
  qty: number;
  amount: number;
  recurring: boolean;
  note?: string;
}

export interface OrderTotals {
  lines: OrderLine[];
  membershipAmount: number;
  planAmount: number;
  addOnAmount: number;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number; // due today
  recurringAnnual: number; // future annual renewal (e.g. extra domains)
  currency: "USD";
  itemCount: number;
}

// Taxes are not configured by default. Set to a decimal (e.g. 0.07) when
// a real tax provider/rate is configured. "Taxes may apply" is disclosed.
export const TAX_RATE = 0;

/** A display view of a membership — label, occasion count, and price —
 *  all DERIVED from the pricing engine. Used by Checkout + Purchase Review. */
export interface MembershipView {
  term: TermId;
  termLabel: string;        // "Lifetime" | "Monthly" | ...
  label: string;            // "Lifetime Reign" | "Monthly Membership"
  occasionCount: number;
  collection: LifetimeCollection | null;
  quote: Quote;
  amount: number;           // price due today (first period for recurring)
  recurring: boolean;
  suffix?: string;          // "/mo" for monthly
}

export function membershipView(m: CartMembership): MembershipView {
  const count = m.occasions.length;
  const q = quote(count, m.term);
  const collection = m.term === "lifetime" ? collectionFor(Math.max(1, count)) : null;
  const term = getTerm(m.term);
  const label = collection ? collection.name : `${term.label} Membership`;
  return {
    term: m.term, termLabel: term.label, label, occasionCount: count,
    collection, quote: q, amount: q.total, recurring: q.recurring, suffix: q.suffix,
  };
}

/** Recompute totals from approved prices. Never trust client totals. */
export function computeTotals(cart: CartState): OrderTotals {
  const lines: OrderLine[] = [];
  let membershipAmount = 0;
  let planAmount = 0;
  let addOnAmount = 0;
  let recurringAnnual = 0;
  let itemCount = 0;

  // ── Membership (occasion-based; the pricing engine is the authority) ──
  if (cart.membership && cart.membership.occasions.length > 0) {
    const v = membershipView(cart.membership);
    membershipAmount = v.amount;
    itemCount += 1;
    lines.push({
      kind: "membership", id: v.term, label: `${v.label} — ${v.occasionCount} Occasion${v.occasionCount === 1 ? "" : "s"}`,
      unitPrice: v.amount, qty: 1, amount: v.amount, recurring: v.recurring,
      note: v.recurring ? `${formatUSD(v.amount)}${v.suffix ?? "/mo"}` : "one-time",
    });
    // Journey Protection (optional add-on, billed monthly).
    if (cart.membership.protection) {
      const p = JOURNEY_PROTECTION.monthly;
      addOnAmount += p;
      itemCount += 1;
      lines.push({ kind: "addon", id: "journey-protection", label: "Journey Protection", unitPrice: p, qty: 1, amount: p, recurring: true, note: `${formatUSD(p)}/mo` });
    }
  }

  // ── Legacy preservation plan (plans.ts) — only when no membership ──
  const plan = !cart.membership && cart.planId ? getPlan(cart.planId) : undefined;
  if (plan) {
    planAmount = plan.price;
    itemCount += 1;
    lines.push({ kind: "plan", id: plan.id, label: plan.name, unitPrice: plan.price, qty: 1, amount: plan.price, recurring: false, note: plan.priceKind });
  }

  for (const [id, rawQty] of Object.entries(cart.addons)) {
    const addon = getAddOn(id);
    if (!addon) continue;
    const qty = Math.max(1, Math.min(rawQty, addon.maxQty));
    const amount = addon.price * qty;
    addOnAmount += amount;
    itemCount += qty;
    if (addon.recurring) recurringAnnual += amount;
    lines.push({ kind: "addon", id, label: addon.name, unitPrice: addon.price, qty, amount, recurring: addon.recurring });
  }

  const subtotal = membershipAmount + planAmount + addOnAmount;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  return { lines, membershipAmount, planAmount, addOnAmount, subtotal, taxRate: TAX_RATE, tax, total, recurringAnnual, currency: "USD", itemCount };
}

/** Amount in cents for Square (smallest currency unit). */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Does this cart include a physical product (needs shipping)? */
export function needsShipping(cart: CartState): boolean {
  return Object.keys(cart.addons).some((id) => getAddOn(id)?.requiresShipping);
}

/** Acknowledgments required by items in the cart. */
export function requiredAcks(cart: CartState): string[] {
  const acks: string[] = [];
  for (const id of Object.keys(cart.addons)) {
    const a = getAddOn(id);
    if (a?.requiresAck) acks.push(a.requiresAck);
  }
  return acks;
}

/** Is there anything to check out with? (membership OR plan). */
export function hasPurchase(cart: CartState): boolean {
  return Boolean((cart.membership && cart.membership.occasions.length > 0) || (cart.planId && getPlan(cart.planId)));
}

/** MMR-YYYYMMDD-#### order number. `seq` is a per-day-ish counter. */
export function orderNumber(date: Date, seq: number): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const n = String(seq % 10000).padStart(4, "0");
  return `MMR-${y}${m}${d}-${n}`;
}

export { formatPrice, PLANS, ADD_ONS };
