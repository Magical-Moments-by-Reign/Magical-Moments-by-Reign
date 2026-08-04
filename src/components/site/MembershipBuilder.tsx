"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { PLANS, formatPrice } from "@/lib/plans";

// The interactive membership builder. Occasion is personalization only — it
// never changes the price. The plan step and the entire price summary are
// driven by the REAL approved PLANS config (no invented prices). Tax is not
// fabricated: it's stated as calculated at checkout.

// Real, approved price for the white-glove Custom Concierge experience.
const CONCIERGE_PRICE = 5000;

const OCCASIONS: { id: string; label: string; icon: ReactElement }[] = [
  { id: "wedding", label: "Wedding", icon: <><circle cx="9" cy="14" r="4" /><circle cx="15" cy="14" r="4" /><path d="M9 8l1.5-3M15 8l-1.5-3" /></> },
  { id: "birthday", label: "Birthday", icon: <><path d="M4 21h16v-7H4z" /><path d="M4 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /><path d="M12 6v4" /></> },
  { id: "baby", label: "Baby Journey", icon: <><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-3" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></> },
  { id: "graduation", label: "Graduation", icon: <><path d="M3 9l9-4 9 4-9 4z" /><path d="M7 11v5c0 1 5 3 5 3s5-2 5-3v-5" /></> },
  { id: "anniversary", label: "Anniversary", icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" /> },
  { id: "vacation", label: "Vacation", icon: <path d="M10 14 3 12l1.5-2 5 .5L14 6l2 .5-2 6 5 2-1 2-4-1-2 4-1.5-.5z" /> },
  { id: "new-home", label: "New Home", icon: <path d="M4 12 L12 5 L20 12 M6 11 V20 H18 V11" /> },
  { id: "graduation2", label: "Celebration", icon: <><path d="M4 20l6-14 3 8 2-4 5 10z" /></> },
  { id: "retirement", label: "Retirement", icon: <><circle cx="12" cy="12" r="4" /><path d="M12 4v-1M12 21v-1M4 12H3M21 12h-1M6 6 5 5M18 18l1 1M6 18l-1 1M18 6l1-1" /></> },
  { id: "legacy", label: "Legacy", icon: <><path d="M12 21V11" /><path d="M12 11c-3-4-7-3-8.5-1M12 11c3-4 7-3 8.5-1" /></> },
];

export default function MembershipBuilder() {
  const [occasion, setOccasion] = useState<string>("wedding");
  const [planId, setPlanId] = useState<string>("diamond");
  const occ = OCCASIONS.find((o) => o.id === occasion);

  // The white-glove, done-for-you alternative. $5,000 is the real, approved
  // price (see Custom Concierge experience). It is a consultative service, so
  // it is requested via the concierge form rather than self-serve checkout.
  const isConcierge = planId === "concierge";
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const sel = isConcierge
    ? { name: "Custom Concierge Experience", termShort: "Done-for-you", price: CONCIERGE_PRICE }
    : { name: plan.name, termShort: plan.termShort, price: plan.price };

  return (
    <div className="bm">
      {/* Step 1 — occasion */}
      <div className="bm-step">
        <div className="bm-step__h">
          <span className="bm-step__n">1</span>
          <div>
            <span className="bm-step__t">Choose Your Occasion</span>
            <p className="bm-step__s">What chapter of life are you creating?</p>
          </div>
        </div>
        <div className="bm-occ">
          {OCCASIONS.map((o) => (
            <button key={o.id} type="button" className={`bm-oc${occasion === o.id ? " on" : ""}`} onClick={() => setOccasion(o.id)} aria-pressed={occasion === o.id}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{o.icon}</svg>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 + 3 — plan and preview */}
      <div className="bm-grid">
        <div className="bm-step" style={{ margin: 0 }}>
          <div className="bm-step__h">
            <span className="bm-step__n">2</span>
            <div>
              <span className="bm-step__t">Choose Your Membership</span>
              <p className="bm-step__s">How long would you like to preserve your moments?</p>
            </div>
          </div>
          <div className="bm-plans">
            {PLANS.map((p) => (
              <button key={p.id} type="button" className={`bm-plan${planId === p.id ? " on" : ""}`} onClick={() => setPlanId(p.id)} aria-pressed={planId === p.id}>
                <span className="bm-plan__mark" aria-hidden="true" />
                <span className="bm-plan__b">
                  <span className="bm-plan__n">{p.name}{p.badge && <span className="bm-plan__tag">{p.badge}</span>}</span>
                  <span className="bm-plan__d">{p.term}</span>
                </span>
                <span className="bm-plan__p">{formatPrice(p.price)}<small>{p.priceKind}</small></span>
              </button>
            ))}
          </div>

          {/* White-glove alternative — done for you */}
          <button type="button" className={`bm-concierge${isConcierge ? " on" : ""}`} onClick={() => setPlanId("concierge")} aria-pressed={isConcierge}>
            <span className="bm-concierge__mark" aria-hidden="true" />
            <span className="bm-concierge__b">
              <span className="bm-concierge__n">Custom Concierge Experience <span className="bm-concierge__tag">White-Glove</span></span>
              <span className="bm-concierge__d">Prefer we do it all for you? Our team designs, builds, and produces your entire experience — start to finish.</span>
            </span>
            <span className="bm-concierge__p">{formatPrice(CONCIERGE_PRICE)}<small>starting at</small></span>
          </button>
        </div>

        <aside className="bm-preview">
          <div className="bm-preview__h">Your Membership Preview</div>
          <div className="bm-preview__row">
            <span className="bm-preview__k">Occasion</span>
            <span className="bm-preview__v">{occ?.label ?? "—"}</span>
          </div>
          <div className="bm-preview__row">
            <span className="bm-preview__k">{isConcierge ? "Service" : "Membership"}</span>
            <span className="bm-preview__v">{sel.name}</span>
          </div>
          <div className="bm-preview__row">
            <span className="bm-preview__k">{isConcierge ? "Type" : "Term"}</span>
            <span className="bm-preview__v">{sel.termShort}</span>
          </div>
          <div className="bm-preview__row">
            <span className="bm-preview__k">Price</span>
            <span className="bm-preview__v">{formatPrice(sel.price)}{isConcierge ? " starting" : ""}</span>
          </div>
          <div className="bm-preview__total">
            <span className="bm-preview__k">{isConcierge ? "Starting at" : "Today’s total"}</span>
            <b>{formatPrice(sel.price)}</b>
          </div>
          {isConcierge ? (
            <>
              <p className="bm-preview__note">A white-glove, done-for-you service — our team designs, builds, and produces your entire experience. Final pricing is confirmed with you during a private consultation; nothing is charged until you approve.</p>
              <a href="/contact?reason=concierge#send" className="bm-preview__cta">Request Concierge Experience →</a>
            </>
          ) : (
            <>
              <p className="bm-preview__note">One-time payment for the {plan.termShort.toLowerCase()} term. Any applicable taxes are calculated at checkout. Upgrade anytime without losing a dollar.</p>
              <a href={`/checkout?plan=${plan.id}`} className="bm-preview__cta">Continue to Checkout →</a>
            </>
          )}
        </aside>
      </div>

      {/* Protect */}
      <div className="bm-protect">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
        <div>
          <b>Protect your membership</b>
          <p>Life happens. You&apos;ll always keep your account, memories, and everything you&apos;ve built — and you can upgrade or extend your term anytime.</p>
        </div>
      </div>
    </div>
  );
}
