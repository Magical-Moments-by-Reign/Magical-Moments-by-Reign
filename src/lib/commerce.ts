// ── Commerce core ───────────────────────────────────────────────
// The cart shape + SERVER-AUTHORITATIVE pricing. Totals are always
// recomputed here from approved prices (PLANS / ADD_ONS) — the browser
// total is never trusted. Currency is USD.

import { PLANS, ADD_ONS, getPlan, getAddOn, formatPrice, type PlanId } from "@/lib/plans";

export interface CartState {
  planId: PlanId | null;
  /** addonId -> quantity */
  addons: Record<string, number>;
}

export const EMPTY_CART: CartState = { planId: null, addons: {} };

export interface OrderLine {
  kind: "plan" | "addon";
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

/** Recompute totals from approved prices. Never trust client totals. */
export function computeTotals(cart: CartState): OrderTotals {
  const lines: OrderLine[] = [];
  let planAmount = 0;
  let addOnAmount = 0;
  let recurringAnnual = 0;
  let itemCount = 0;

  const plan = cart.planId ? getPlan(cart.planId) : undefined;
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

  const subtotal = planAmount + addOnAmount;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  return { lines, planAmount, addOnAmount, subtotal, taxRate: TAX_RATE, tax, total, recurringAnnual, currency: "USD", itemCount };
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

/** MMR-YYYYMMDD-#### order number. `seq` is a per-day-ish counter. */
export function orderNumber(date: Date, seq: number): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const n = String(seq % 10000).padStart(4, "0");
  return `MMR-${y}${m}${d}-${n}`;
}

export { formatPrice, PLANS, ADD_ONS };
