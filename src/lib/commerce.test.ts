import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, membershipView, hasPurchase, EMPTY_CART, type CartState } from "./commerce.ts";

function membershipCart(over: Partial<{ term: string; occasions: string[]; protection: boolean }> = {}): CartState {
  return {
    membership: {
      term: (over.term as never) ?? "lifetime",
      occasions: over.occasions ?? ["wedding", "baby", "travel", "graduation"],
      protection: over.protection ?? false,
    },
    planId: null,
    addons: {},
  };
}

test("membership is priced by the pricing engine (4 occasions → Legacy $2,499)", () => {
  const t = computeTotals(membershipCart({ term: "lifetime", occasions: ["a", "b", "c", "d"] }));
  assert.equal(t.membershipAmount, 2499);
  assert.equal(t.total, 2499);
  assert.equal(t.lines[0].kind, "membership");
  assert.match(t.lines[0].label, /Lifetime Legacy — 4 Occasions/);
});

test("membership scales through the tiers (8 → Reign $4,999, 12 → Magical $7,999)", () => {
  assert.equal(computeTotals(membershipCart({ term: "lifetime", occasions: Array(8).fill("x") })).total, 4999);
  assert.equal(computeTotals(membershipCart({ term: "lifetime", occasions: Array(12).fill("x") })).total, 7999);
});

test("membershipView derives label + collection from the engine", () => {
  const v = membershipView({ term: "lifetime", occasions: Array(8).fill("x"), protection: false });
  assert.equal(v.label, "Lifetime Reign");
  assert.equal(v.occasionCount, 8);
  assert.equal(v.amount, 4999);
  assert.equal(v.collection?.id, "reign");
});

test("monthly membership adds Journey Protection when selected", () => {
  const t = computeTotals(membershipCart({ term: "monthly", occasions: ["a", "b"], protection: true }));
  const protectionLine = t.lines.find((l) => l.id === "journey-protection");
  assert.ok(protectionLine, "protection line present");
  assert.ok(protectionLine!.recurring, "protection is recurring");
});

test("hasPurchase is true for a membership, false for an empty cart", () => {
  assert.equal(hasPurchase(membershipCart()), true);
  assert.equal(hasPurchase(EMPTY_CART), false);
  assert.equal(hasPurchase({ membership: { term: "lifetime" as never, occasions: [], protection: false }, planId: null, addons: {} }), false);
});

test("an empty cart yields a zero total and no needs-plan crash", () => {
  const t = computeTotals(EMPTY_CART);
  assert.equal(t.total, 0);
  assert.equal(t.lines.length, 0);
});

test("membership and plan are priced independently (membership takes precedence)", () => {
  // If somehow both were set, membership wins (they are mutually exclusive in the UI).
  const t = computeTotals({ membership: { term: "lifetime" as never, occasions: Array(4).fill("x"), protection: false }, planId: "silver" as never, addons: {} });
  assert.equal(t.membershipAmount, 2499);
  assert.equal(t.planAmount, 0, "plan is ignored when a membership is present");
});
