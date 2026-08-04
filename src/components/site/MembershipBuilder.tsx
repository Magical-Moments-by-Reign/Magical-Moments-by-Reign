"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/plans";
import { OCCASIONS, TERMS, WHITE_GLOVE, priceFor, type TermId } from "@/lib/membership-builder";

// The official Membership Builder. Occasions are multi-select; the term drives
// the price; everything updates live. All prices come from the real pricing
// engine (lib/membership-builder) — nothing is invented, and Monthly degrades
// to an honest "ask your concierge" until its price is set.
type Selection = TermId | "white-glove";

export default function MembershipBuilder() {
  const [occ, setOcc] = useState<string[]>(["wedding"]);
  const [term, setTerm] = useState<Selection>("lifetime");

  const count = occ.length;
  const isWG = term === "white-glove";
  const toggle = (id: string) =>
    setOcc((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const result = isWG
    ? { price: WHITE_GLOVE.price, unit: "starting at", note: "Our team designs, builds, and produces your entire experience. Final scope and pricing are confirmed in a private consultation — nothing is charged until you approve.", tierLabel: "Done for you · Lifetime with 5 occasions" }
    : priceFor(term as TermId, count);

  const termLabel = isWG ? WHITE_GLOVE.label : TERMS.find((t) => t.id === term)?.label ?? "";
  const canCheckout = count > 0 && !isWG && term !== "monthly" && result.price !== null;

  // Honest, real destinations.
  const occParam = occ.join(",");
  let cta = { label: "Continue to Checkout", href: `/checkout?term=${term}&occasions=${encodeURIComponent(occParam)}` };
  if (isWG) cta = { label: "Request White Glove", href: "/contact?reason=concierge#send" };
  else if (term === "monthly") cta = { label: "Talk to Your Concierge", href: "/contact?reason=consultation#send" };
  else if (term === "free") cta = { label: "Start Free", href: "/signup" };

  return (
    <div className="mb2-grid">
      <div>
        {/* Step 1 — occasions (multi-select) */}
        <div className="mb2-card">
          <div className="mb2-step">
            <span className="mb2-step__n">1</span>
            <div>
              <span className="mb2-step__t">Choose your occasions</span>
              <p className="mb2-step__s">Select every chapter you&apos;d like to create. Choose as many as you love.</p>
            </div>
          </div>
          <div className="mb2-occ">
            {OCCASIONS.map((o) => {
              const on = occ.includes(o.id);
              return (
                <button key={o.id} type="button" className={`mb2-chip${on ? " on" : ""}`} onClick={() => toggle(o.id)} aria-pressed={on}>
                  <span className="mb2-chip__tick" aria-hidden="true">✓</span>{o.label}
                </button>
              );
            })}
          </div>
          <p className="mb2-occ__count">{count === 0 ? "No occasions chosen yet." : `${count} occasion${count === 1 ? "" : "s"} selected.`}</p>
        </div>

        {/* Step 2 — term */}
        <div className="mb2-card">
          <div className="mb2-step">
            <span className="mb2-step__n">2</span>
            <div>
              <span className="mb2-step__t">Choose your term</span>
              <p className="mb2-step__s">How long would you like your moments preserved?</p>
            </div>
          </div>
          <div className="mb2-terms">
            {TERMS.map((t) => {
              const r = priceFor(t.id, count);
              const on = term === t.id;
              return (
                <button key={t.id} type="button" className={`mb2-term${on ? " on" : ""}`} onClick={() => setTerm(t.id)} aria-pressed={on}>
                  <span className="mb2-term__mark" aria-hidden="true" />
                  <span className="mb2-term__b">
                    <span className="mb2-term__n">{t.label}</span>
                    <span className="mb2-term__s">{t.id === "lifetime" && r.tierLabel ? r.tierLabel : t.sub}</span>
                  </span>
                  {r.price === null ? (
                    <span className="mb2-term__soon">Ask your<br />concierge</span>
                  ) : r.price === 0 ? (
                    <span className="mb2-term__p">Free<small>forever</small></span>
                  ) : (
                    <span className="mb2-term__p">{formatPrice(r.price)}<small>{r.unit}</small></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* White Glove — done for you */}
          <button type="button" className={`mb2-wg${isWG ? " on" : ""}`} onClick={() => setTerm("white-glove")} aria-pressed={isWG}>
            <span className="mb2-wg__mark" aria-hidden="true" />
            <span className="mb2-wg__b">
              <span className="mb2-wg__n">{WHITE_GLOVE.label} <span className="mb2-wg__tag">White Glove</span></span>
              <span className="mb2-wg__s">{WHITE_GLOVE.sub} — a Lifetime with 5 occasions, created for you.</span>
            </span>
            <span className="mb2-wg__p">{formatPrice(WHITE_GLOVE.price)}<small>starting at</small></span>
          </button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="mb2-preview">
        <div className="mb2-preview__h">Your Membership</div>
        <div className="mb2-preview__occ">
          {count === 0 ? (
            <span className="mb2-preview__empty">Choose an occasion to begin…</span>
          ) : (
            occ.map((id) => (
              <span key={id} className="mb2-preview__pill">{OCCASIONS.find((o) => o.id === id)?.label}</span>
            ))
          )}
        </div>
        <div className="mb2-preview__row">
          <span className="mb2-preview__k">Occasions</span>
          <span className="mb2-preview__v">{count}</span>
        </div>
        <div className="mb2-preview__row">
          <span className="mb2-preview__k">Membership</span>
          <span className="mb2-preview__v">{termLabel}</span>
        </div>
        {result.tierLabel && (
          <div className="mb2-preview__row">
            <span className="mb2-preview__k">Includes</span>
            <span className="mb2-preview__v">{result.tierLabel}</span>
          </div>
        )}
        <div className="mb2-preview__total">
          <span className="mb2-preview__k">{result.price === 0 ? "Today" : result.unit === "starting at" ? "Starting at" : "Total"}</span>
          {result.price === null ? (
            <span className="mb2-preview__soon">By consultation</span>
          ) : result.price === 0 ? (
            <span className="mb2-preview__soon">Free</span>
          ) : (
            <b>{formatPrice(result.price)}</b>
          )}
        </div>
        <p className="mb2-preview__note">{result.note}</p>
        {count === 0 && !isWG ? (
          <span className="mb2-cta" style={{ opacity: 0.5, pointerEvents: "none" }}>Choose an occasion</span>
        ) : (
          <a href={cta.href} className="mb2-cta">{canCheckout ? cta.label : cta.label} →</a>
        )}
      </aside>
    </div>
  );
}
