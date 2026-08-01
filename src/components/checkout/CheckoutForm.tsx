"use client";

// ── Pre-payment checkout summary ────────────────────────────────
// Fulfills the brief's CHECKOUT REQUIREMENT: before payment the
// customer sees plan, term, domain type, storage, AI allowance,
// renewal terms, total, optional add-ons, recurring/domain-renewal
// disclosures, and must acknowledge them.
//
// Real payment processing (Stripe) arrives in Phase 3; the button
// gates on the acknowledgment and hands off to that flow.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ADD_ONS, formatPrice, type Plan } from "@/lib/plans";

interface Props {
  plan: Plan;
  storage: { photo: string; video: string; ask: string; aiVideo: string };
}

export default function CheckoutForm({ plan, storage }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [ack, setAck] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addOnTotal = useMemo(
    () =>
      ADD_ONS.filter((a) => selected[a.id]).reduce((sum, a) => sum + a.price, 0),
    [selected],
  );
  const total = plan.price + addOnTotal;
  const hasCustomDomain = plan.addressType === "Custom domain included";

  return (
    <div className="co-grid">
      {/* Summary */}
      <section className="co-summary" aria-label="Order summary">
        <h2 className="co-h2">Your selection</h2>

        <div className="co-row">
          <span>Plan</span>
          <strong>{plan.name}</strong>
        </div>
        <div className="co-row">
          <span>Preservation term</span>
          <strong>{plan.term.replace("Preserved for ", "")}</strong>
        </div>
        <div className="co-row">
          <span>Included address</span>
          <strong>{plan.addressType}</strong>
        </div>
        <div className="co-row">
          <span>Photo storage</span>
          <strong>{storage.photo}</strong>
        </div>
        <div className="co-row">
          <span>Video storage</span>
          <strong>{storage.video}</strong>
        </div>
        <div className="co-row">
          <span>Ask Magical usage</span>
          <strong>{storage.ask}</strong>
        </div>
        <div className="co-row">
          <span>AI video enhancements</span>
          <strong>{storage.aiVideo}</strong>
        </div>

        <h3 className="co-h3">Optional add-ons</h3>
        <ul className="co-addons">
          {ADD_ONS.map((a) => (
            <li key={a.id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(selected[a.id])}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, [a.id]: e.target.checked }))
                  }
                />
                <span className="co-addon__name">{a.name}</span>
                <span className="co-addon__price">
                  +{formatPrice(a.price)}
                  {a.priceSuffix ? ` ${a.priceSuffix}` : ""}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Totals + terms + acknowledgment */}
      <aside className="co-terms">
        <div className="co-total">
          <div className="co-row">
            <span>{plan.name}</span>
            <strong>{formatPrice(plan.price)}</strong>
          </div>
          {addOnTotal > 0 && (
            <div className="co-row">
              <span>Add-ons</span>
              <strong>{formatPrice(addOnTotal)}</strong>
            </div>
          )}
          <div className="co-row co-row--total">
            <span>Total today</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <p className="co-total__suffix">{plan.priceSuffix}</p>
        </div>

        <div className="co-disclosures">
          <h3 className="co-h3">Before you continue</h3>
          <ul>
            <li>
              <b>Renewal:</b>{" "}
              {plan.id === "lifetime"
                ? "One-time payment for lifetime preservation, subject to the service terms and fair-use policy."
                : `Your ${plan.term.replace(
                    "Preserved for ",
                    "",
                  )} term does not auto-renew. We'll remind you before it ends so you can renew, extend, or upgrade.`}
            </li>
            <li>
              <b>Recurring charges:</b> None billed automatically. Any future
              renewal is a separate, clearly-disclosed charge you choose to make.
            </li>
            <li>
              <b>Domain terms:</b>{" "}
              {hasCustomDomain
                ? "Your custom domain registration is included for the initial term. Renewals after that period are disclosed before you're charged. Availability is subject to registration availability."
                : "This plan uses a Magical Moments by Reign page address. No separate domain registration is required."}
            </li>
            <li>
              <b>Cancellation:</b> You may cancel anytime. When a term ends, your
              content enters a limited grace period with a chance to download an
              archive before removal — never deleted immediately.
            </li>
          </ul>
        </div>

        <label className="co-ack">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            I understand the preservation term, renewal terms, domain terms, and
            features included with my selected plan.
          </span>
        </label>

        {submitted ? (
          <div className="co-next" role="status">
            <strong>You&apos;re all set to preserve this moment. ✦</strong>
            <p>
              Secure payment (Stripe) is arriving in Phase&nbsp;3. Your selection
              and acknowledgment have been captured — the payment step will slot
              in right here.
            </p>
            <Link href="/create" className="btn-gold">
              Continue to create your experience
            </Link>
          </div>
        ) : (
          <button
            type="button"
            className="btn-gold co-submit"
            disabled={!ack}
            onClick={() => setSubmitted(true)}
          >
            Continue to secure payment
          </button>
        )}
        {!ack && !submitted && (
          <p className="co-hint">
            Please confirm the acknowledgment above to continue.
          </p>
        )}
      </aside>
    </div>
  );
}
