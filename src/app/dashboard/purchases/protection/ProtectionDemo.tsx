"use client";

// ── Protection demo + settings (client) ─────────────────────────
// Lets the member configure their protection settings (threshold + independent
// module toggles) and see the real Purchase Review screen driven by the live
// decision engine. The order here is a labelled DEMO (no charge) that reproduces
// a risky real-world case — buying a plan while an active subscription exists at
// a merchant that can't prorate — so Journey's protective warnings are visible.
// Toggling a module on/off changes the review live, proving each check is a
// genuinely independent module.

import { useEffect, useMemo, useState } from "react";
import PurchaseReview from "@/components/commerce/PurchaseReview";
import { reviewPurchase, type Order, type ProtectionContext, type ProtectionSettings } from "@/lib/commerce/protection";
import { getMerchant } from "@/lib/commerce/merchants";
import { loadSettings, saveSettings, THRESHOLD_OPTIONS, TOGGLE_OPTIONS } from "@/lib/commerce/protection-settings";
import type { Threshold } from "@/lib/commerce/protection";

const DEMO_ORDER: Order = {
  merchantId: "voice-vendor",
  currency: "USD",
  items: [{ name: "Creator Plan — Annual", description: "Premium voice subscription", quantity: 1, unitPrice: 22_000, itemKey: "creator-plan", digital: true }],
  subtotal: 22_000, tax: 0, shipping: 0, discount: 0, total: 22_000,
  currentPlanId: "monthly",
  planOptions: [
    { id: "monthly", label: "Monthly", interval: "monthly", price: 2_200, normalizedMonthly: 2_200 },
    { id: "annual", label: "Annual", interval: "annual", price: 22_000, normalizedMonthly: 1_833 },
  ],
  paymentMethod: "Visa •• 4242",
  estimatedDelivery: "Instant (digital)",
};

const DEMO_CTX = (settings: ProtectionSettings): ProtectionContext => ({
  settings,
  now: new Date().toISOString(),
  priorPurchases: [
    { merchantId: "voice-vendor", itemKey: "creator-plan", label: "Creator Plan (Monthly)", purchasedAt: new Date().toISOString(), kind: "subscription", active: true },
  ],
});

export default function ProtectionDemo() {
  const [settings, setSettings] = useState<ProtectionSettings>(() => loadSettings());
  const [outcome, setOutcome] = useState<string>("");

  useEffect(() => { setSettings(loadSettings()); }, []);

  function update(next: ProtectionSettings) { setSettings(saveSettings(next)); }
  function pickThreshold(t: Threshold) { update({ ...settings, threshold: t }); }
  function toggle(key: keyof ProtectionSettings) { update({ ...settings, [key]: !settings[key] }); }

  const merchant = getMerchant("voice-vendor", "Voice Subscription (example)");
  const review = useMemo(() => reviewPurchase(DEMO_ORDER, merchant, DEMO_CTX(settings)), [settings, merchant]);
  const current = THRESHOLD_OPTIONS.find((o) => o.value === settings.threshold);

  return (
    <div className="prot-demo">
      <div className="card">
        <h3>Your protection threshold</h3>
        <p className="note">Choose when Journey pauses to make you confirm. Journey always shows the review — this sets when it insists.</p>
        <div className="prot-thr">
          {THRESHOLD_OPTIONS.map((o) => (
            <button key={o.value} type="button" className={`prot-thr__b${settings.threshold === o.value ? " is-on" : ""}`} onClick={() => pickThreshold(o.value)} title={o.hint}>
              {o.label}
            </button>
          ))}
        </div>
        {current && <p className="note">Current: <b>{current.label}</b> — {current.hint}.</p>}

        <h3 style={{ marginTop: "1.2rem" }}>Protection modules</h3>
        <p className="note">Each protection is an independent module you can turn on or off. Changes apply to the review below instantly.</p>
        <div className="prot-toggles">
          {TOGGLE_OPTIONS.map((t) => {
            const on = Boolean(settings[t.key]);
            return (
              <button
                key={t.key}
                type="button"
                className={`prot-toggle${on ? " is-on" : ""}`}
                onClick={() => !t.soon && toggle(t.key)}
                disabled={t.soon}
                aria-pressed={on}
                title={t.soon ? "Coming soon — requires setup" : t.hint}
              >
                <span className="prot-toggle__sw" aria-hidden="true"><span className="prot-toggle__dot" /></span>
                <span className="prot-toggle__txt">
                  <span className="prot-toggle__label">{t.label}{t.soon && <span className="prot-toggle__soon">Coming soon</span>}</span>
                  <span className="prot-toggle__hint">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <PurchaseReview
          order={DEMO_ORDER}
          review={review}
          merchant={merchant}
          demo
          onConfirm={() => setOutcome("✅ In a real purchase, payment would be processed only now — after your explicit approval. (Preview: no charge made.)")}
          onEdit={() => setOutcome("✎ Edit Purchase would return you to adjust quantity, plan, address, or gift message.")}
          onCancel={() => setOutcome("✋ Purchase cancelled. Nothing was charged.")}
        />
        {outcome && <p className="prot-outcome">{outcome}</p>}
      </div>
    </div>
  );
}
