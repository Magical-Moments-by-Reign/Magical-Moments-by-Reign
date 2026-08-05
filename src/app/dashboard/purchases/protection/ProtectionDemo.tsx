"use client";

// ── Protection demo + threshold settings (client) ───────────────
// Lets the member set their protection threshold and see the real Purchase
// Review screen driven by the live decision engine. The order here is a labelled
// DEMO (no charge) that reproduces a risky real-world case — buying a plan while
// an active subscription exists at a merchant that can't prorate — so Journey's
// protective warnings are visible.

import { useEffect, useMemo, useState } from "react";
import PurchaseReview from "@/components/commerce/PurchaseReview";
import { reviewPurchase, type Order, type ProtectionContext } from "@/lib/commerce/protection";
import { getMerchant } from "@/lib/commerce/merchants";
import { loadThreshold, saveThreshold, THRESHOLD_OPTIONS } from "@/lib/commerce/protection-settings";
import type { Threshold } from "@/lib/commerce/protection";

const DEMO_ORDER: Order = {
  merchantId: "voice-vendor",
  currency: "USD",
  items: [{ name: "Creator Plan — Annual", description: "Premium voice subscription", quantity: 1, unitPrice: 22_000, itemKey: "creator-plan" }],
  subtotal: 22_000, tax: 0, shipping: 0, discount: 0, total: 22_000,
  currentPlanId: "monthly",
  planOptions: [
    { id: "monthly", label: "Monthly", interval: "monthly", price: 2_200, normalizedMonthly: 2_200 },
    { id: "annual", label: "Annual", interval: "annual", price: 22_000, normalizedMonthly: 1_833 },
  ],
  estimatedDelivery: "Instant (digital)",
};

const DEMO_CTX = (threshold: Threshold): ProtectionContext => ({
  threshold,
  now: new Date().toISOString(),
  priorPurchases: [
    { merchantId: "voice-vendor", itemKey: "creator-plan", label: "Creator Plan (Monthly)", purchasedAt: new Date().toISOString(), kind: "subscription", active: true },
  ],
});

export default function ProtectionDemo() {
  const [threshold, setThreshold] = useState<Threshold>("always");
  const [outcome, setOutcome] = useState<string>("");

  useEffect(() => { setThreshold(loadThreshold()); }, []);

  function pick(t: Threshold) { setThreshold(t); saveThreshold(t); }

  const merchant = getMerchant("voice-vendor", "Voice Subscription (example)");
  const review = useMemo(() => reviewPurchase(DEMO_ORDER, merchant, DEMO_CTX(threshold)), [threshold, merchant]);

  return (
    <div className="prot-demo">
      <div className="card">
        <h3>Your protection threshold</h3>
        <p className="note">Choose when Journey pauses to make you confirm. Journey always shows the review — this sets when it insists.</p>
        <div className="prot-thr">
          {THRESHOLD_OPTIONS.map((o) => (
            <button key={o.value} type="button" className={`prot-thr__b${threshold === o.value ? " is-on" : ""}`} onClick={() => pick(o.value)} title={o.hint}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="note">Current: <b>{THRESHOLD_OPTIONS.find((o) => o.value === threshold)?.label}</b> — {THRESHOLD_OPTIONS.find((o) => o.value === threshold)?.hint}.</p>
      </div>

      <div className="card">
        <PurchaseReview
          order={DEMO_ORDER}
          review={review}
          merchant={merchant}
          demo
          onConfirm={() => setOutcome("✅ In a real purchase, payment would be processed only now — after your explicit confirmation. (Preview: no charge made.)")}
          onEdit={() => setOutcome("✎ Edit Order would return you to adjust quantity, plan, address, or gift message.")}
          onCancel={() => setOutcome("✋ Purchase cancelled. Nothing was charged.")}
        />
        {outcome && <p className="prot-outcome">{outcome}</p>}
      </div>
    </div>
  );
}
