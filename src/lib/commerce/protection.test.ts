import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requiresReview, detectUpgrade, detectDuplicate, detectSubscriptionConflict, merchantWarnings,
  reviewPurchase, runProtection, money, DEFAULT_SETTINGS,
  type Order, type ProtectionContext,
} from "./protection.ts";
import { getMerchant } from "./merchants.ts";

const baseOrder = (over: Partial<Order> = {}): Order => ({
  merchantId: "acme", currency: "USD",
  items: [{ name: "Bouquet", quantity: 1, unitPrice: 4500, itemKey: "bouquet" }],
  subtotal: 4500, tax: 400, shipping: 600, discount: 0, total: 5500, ...over,
});

const ctx = (over: Partial<ProtectionContext> = {}): ProtectionContext => ({
  priorPurchases: [], now: "2026-08-05T00:00:00Z", ...over,
});

test("threshold gating: always / never / dollar thresholds", () => {
  assert.equal(requiresReview(100, "always"), true);
  assert.equal(requiresReview(1_000_000, "never"), false);
  assert.equal(requiresReview(9_900, "100"), false);   // $99 < $100
  assert.equal(requiresReview(10_000, "100"), true);    // $100 >= $100
  assert.equal(requiresReview(60_000, "500"), true);
});

test("upgrade detection: annual beats monthly and reports yearly savings", () => {
  const order = baseOrder({
    currentPlanId: "m",
    planOptions: [
      { id: "m", label: "Monthly", interval: "monthly", price: 1500, normalizedMonthly: 1500 },
      { id: "a", label: "Annual", interval: "annual", price: 14400, normalizedMonthly: 1200 },
    ],
  });
  const up = detectUpgrade(order);
  assert.ok(up);
  assert.equal(up!.id, "upgrade");
  assert.match(up!.detail, /Annual/);
  assert.match(up!.detail, /\$36\.00/); // (1500-1200)*12 = 3600 cents = $36/yr
});

test("no upgrade advisory when current plan is already the cheapest", () => {
  const order = baseOrder({
    currentPlanId: "a",
    planOptions: [
      { id: "m", label: "Monthly", interval: "monthly", price: 1500, normalizedMonthly: 1500 },
      { id: "a", label: "Annual", interval: "annual", price: 14400, normalizedMonthly: 1200 },
    ],
  });
  assert.equal(detectUpgrade(order), null);
});

test("duplicate detection: recent same item from same merchant warns; old does not", () => {
  const recent = detectDuplicate(baseOrder(), ctx({
    priorPurchases: [{ merchantId: "acme", itemKey: "bouquet", label: "Bouquet", purchasedAt: "2026-07-20T00:00:00Z" }],
  }));
  assert.ok(recent && recent.id === "duplicate");

  const old = detectDuplicate(baseOrder(), ctx({
    priorPurchases: [{ merchantId: "acme", itemKey: "bouquet", label: "Bouquet", purchasedAt: "2026-01-01T00:00:00Z" }],
  }));
  assert.equal(old, null); // outside the 30-day window
});

test("active subscription is a subscription conflict (not a duplicate)", () => {
  const order = baseOrder({ currentPlanId: "m", planOptions: [{ id: "m", label: "Monthly", interval: "monthly", price: 1500, normalizedMonthly: 1500 }] });
  const active = ctx({ priorPurchases: [{ merchantId: "acme", itemKey: "x", label: "Bloom Club", purchasedAt: "2020-01-01T00:00:00Z", active: true }] });
  assert.equal(detectDuplicate(order, active), null); // duplicate check ignores active subs
  const sub = detectSubscriptionConflict(order, active);
  assert.ok(sub && sub.id === "subscription" && sub.confidence === "verified");
});

test("runProtection respects setting toggles (independent modules)", () => {
  const order = baseOrder();
  const on = runProtection(order, getMerchant("magical-moments"), ctx({ settings: DEFAULT_SETTINGS }));
  assert.ok(on.some((a) => a.id === "coupons")); // always-on module
  // Disable duplicate detection → that module never contributes.
  const off = runProtection(baseOrder(), getMerchant("acme"), ctx({
    settings: { ...DEFAULT_SETTINGS, duplicateDetection: false },
    priorPurchases: [{ merchantId: "acme", itemKey: "bouquet", label: "Bouquet", purchasedAt: "2026-07-30T00:00:00Z" }],
  }));
  assert.equal(off.some((a) => a.id === "duplicate"), false);
});

test("every advisory is labelled with a confidence", () => {
  const advs = runProtection(baseOrder(), getMerchant("acme"), ctx());
  assert.ok(advs.length > 0);
  for (const a of advs) assert.ok(["verified", "estimated", "coming_soon"].includes(a.confidence), `${a.id} missing confidence`);
});

test("merchant without proration warns about two charges on an upgrade", () => {
  const order = baseOrder({ currentPlanId: "m", planOptions: [{ id: "m", label: "Monthly", interval: "monthly", price: 1500, normalizedMonthly: 1500 }] });
  const merchant = getMerchant("acme"); // conservative default → no proration
  const warns = merchantWarnings(order, merchant, ctx({ priorPurchases: [{ merchantId: "acme", itemKey: "x", label: "Plan", purchasedAt: "2026-08-01T00:00:00Z", active: true }] }));
  assert.ok(warns.some((w) => w.id === "no-proration" && w.level === "warn"));
});

test("reviewPurchase always requires confirmation and includes the promise checklist", () => {
  const r = reviewPurchase(baseOrder(), getMerchant("magical-moments"), ctx());
  assert.equal(r.requiresConfirmation, true);
  assert.ok(r.promise.length >= 10);
  assert.ok(r.advisories.some((a) => a.id === "coupons" && a.comingSoon)); // honest Coming Soon
});

test("money formats cents to USD", () => {
  assert.equal(money(5500), "$55.00");
  assert.equal(money(0), "$0.00");
});
