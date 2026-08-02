"use client";

// ── Every family starts here ────────────────────────────────────
// Required-account entry: every person selects a membership option
// before continuing. Free Forever completes checkout at $0.00 (create
// account + accept Terms/Privacy). Paid memberships reveal the builder;
// Lifetime memberships jump to the Collections. There is no guest access.

import { useState } from "react";
import Link from "next/link";
import { MEMBERSHIP_OPTIONS, FREE_FOREVER } from "@/lib/pricing-engine";

export default function MembershipStart() {
  const [choice, setChoice] = useState<string | null>(null);
  const [acceptTos, setAcceptTos] = useState(false);

  const selectedFree = choice === "free";

  function pick(id: string) {
    setChoice(id);
    if (id !== "free") {
      const target = document.getElementById(id.startsWith("legacy") || id === "reign" || id === "magical" ? "collections" : "step-occasions");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <section className="ms" aria-labelledby="ms-title">
      <h2 id="ms-title" className="mb-step__title"><span className="mb-step__num">✦</span> Every family starts here</h2>
      <p className="mb-step__hint">
        Choose how you&apos;ll begin. There are no guests — everyone creates a Magical Moments
        account, and <strong>Free Forever is our gift to every family</strong>. You can upgrade
        anytime with nothing lost.
      </p>

      <div className="ms-grid" role="radiogroup" aria-label="Membership options">
        {MEMBERSHIP_OPTIONS.map((m) => {
          const on = choice === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`ms-opt ms-opt--${m.tier}${on ? " ms-opt--on" : ""}`}
              onClick={() => pick(m.id)}
            >
              <span className="ms-opt__glyph" aria-hidden="true">{m.glyph}</span>
              <span className="ms-opt__name">{m.name}</span>
              <span className="ms-opt__price">{m.priceLabel}</span>
              <span className="ms-opt__note">{m.note}</span>
            </button>
          );
        })}
      </div>

      {selectedFree && (
        <div className="ms-checkout" role="region" aria-label="Free Forever checkout">
          <div className="ms-checkout__body">
            <h3 className="ms-checkout__title">{FREE_FOREVER.name}</h3>
            <p className="ms-checkout__lead">{FREE_FOREVER.promise}</p>
            <ul className="ms-checkout__feats">
              {FREE_FOREVER.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
          <div className="ms-checkout__pay">
            <div className="ms-checkout__row"><span>Membership</span><span>Free Forever</span></div>
            <div className="ms-checkout__row ms-checkout__row--total"><span>Today&apos;s Total</span><strong>{FREE_FOREVER.priceLabel}</strong></div>

            <label className="ms-checkout__tos">
              <input type="checkbox" checked={acceptTos} onChange={(e) => setAcceptTos(e.target.checked)} />
              <span>I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> (provided in full at account creation).</span>
            </label>

            {acceptTos ? (
              <Link href="/dashboard" className="btn btn-gold ms-checkout__cta">Create My Account</Link>
            ) : (
              <button type="button" className="btn btn-gold ms-checkout__cta" disabled aria-disabled="true">Create My Account</button>
            )}
            <p className="ms-checkout__fine">
              Creates your account, Family Vault &amp; dashboard at no cost. Secure per-family
              sign-in is being finalized — today this opens the shared family workspace.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
