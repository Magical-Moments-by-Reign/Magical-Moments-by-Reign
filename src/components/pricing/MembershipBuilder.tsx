"use client";

// ── Build Your Membership ───────────────────────────────────────
// The customer-facing realization of Pricing Engine v1.0. Two steps —
// pick Occasions, pick a Term — with a live cart that shows the running
// total, real savings, and smart (never pushy) recommendations. All
// calculation is delegated to src/lib/pricing-engine.ts.

import { useMemo, useState } from "react";
import OccasionIcon from "@/components/OccasionIcon";
import { OCCASIONS } from "@/lib/experience-types";
import {
  TERMS,
  getTerm,
  quote,
  recommendations,
  collectionFor,
  LIFETIME_COLLECTIONS,
  FREE_FOREVER,
  JOURNEY_PROTECTION,
  formatUSD,
  type TermId,
} from "@/lib/pricing-engine";

export default function MembershipBuilder() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [term, setTerm] = useState<TermId>("5yr");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const count = selected.size;
  const q = useMemo(() => quote(count, term), [count, term]);
  const recs = useMemo(() => recommendations(count, term), [count, term]);
  const comparableCollection = collectionFor(Math.max(1, count));

  const selectedTypes = OCCASIONS.filter((o) => selected.has(o.id));

  return (
    <div className="mb-build">
      {/* ── Left: the builder ── */}
      <div className="mb-build__main">
        {/* Step 1 */}
        <section className="mb-step" aria-labelledby="step-occasions">
          <h2 id="step-occasions" className="mb-step__title">
            <span className="mb-step__num">1</span> Choose your Occasions
          </h2>
          <p className="mb-step__hint">
            Pick as many as you like — one, a few, or every chapter of your family's story.
          </p>

          <div className="mb-grid" role="group" aria-label="Occasions">
            {OCCASIONS.map((o) => {
              const on = selected.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`mb-tile${on ? " mb-tile--on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggle(o.id)}
                  style={{ ["--tile-a" as string]: o.gradient[0], ["--tile-b" as string]: o.gradient[1] }}
                >
                  <span className="mb-tile__check" aria-hidden="true">{on ? "✓" : "+"}</span>
                  <OccasionIcon name={o.icon} size={30} className="mb-tile__icon" />
                  <span className="mb-tile__label">{o.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-step" aria-labelledby="step-term">
          <h2 id="step-term" className="mb-step__title">
            <span className="mb-step__num">2</span> Choose your Membership Term
          </h2>
          <p className="mb-step__hint">Your term applies to every Occasion you selected. Upgrade anytime — you never lose what you've invested.</p>

          <div className="mb-terms" role="radiogroup" aria-label="Membership term">
            {TERMS.map((t) => {
              const on = term === t.id;
              const preview = quote(Math.max(1, count), t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`mb-term${on ? " mb-term--on" : ""}${t.id === "lifetime" ? " mb-term--life" : ""}`}
                  onClick={() => setTerm(t.id)}
                >
                  <span className="mb-term__label">{t.label}</span>
                  <span className="mb-term__blurb">{t.blurb}</span>
                  {count > 0 && (
                    <span className="mb-term__price">
                      {formatUSD(preview.total)}
                      {t.id === "lifetime" && preview.collection ? (
                        <em> · {preview.collection.name}</em>
                      ) : null}
                    </span>
                  )}
                  {t.id === "lifetime" && <span className="mb-term__flag">Best long-term value</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Lifetime Collections reference */}
        <section className="mb-step" aria-labelledby="collections">
          <h2 id="collections" className="mb-step__title mb-step__title--sm">Lifetime Collections</h2>
          <div className="mb-collections">
            {LIFETIME_COLLECTIONS.map((c) => (
              <div key={c.id} className={`mb-coll${comparableCollection.id === c.id && term !== "lifetime" && count > 0 ? " mb-coll--match" : ""}`}>
                <div className="mb-coll__name">{c.name}</div>
                <div className="mb-coll__price">{formatUSD(c.price)}</div>
                <div className="mb-coll__blurb">{c.blurb}</div>
              </div>
            ))}
          </div>
          <p className="mb-note">Lifetime Memberships always remain the best long-term value — nothing is ever priced below the comparable Lifetime Collection.</p>
        </section>
      </div>

      {/* ── Right: the live cart ── */}
      <aside className="mb-cart" aria-label="Your membership">
        <div className="mb-cart__inner">
          <h3 className="mb-cart__title">Your Membership</h3>

          {count === 0 ? (
            <p className="mb-cart__empty">Select an Occasion to begin building your membership.</p>
          ) : (
            <>
              <ul className="mb-cart__list">
                {selectedTypes.map((o) => (
                  <li key={o.id} className="mb-cart__row">
                    <OccasionIcon name={o.icon} size={18} />
                    <span>{o.label}</span>
                    <button type="button" className="mb-cart__x" aria-label={`Remove ${o.label}`} onClick={() => toggle(o.id)}>×</button>
                  </li>
                ))}
              </ul>

              <div className="mb-cart__meta">
                <span>{count} {count === 1 ? "Occasion" : "Occasions"}</span>
                <span>{getTerm(term).label}</span>
              </div>

              <div className="mb-cart__total">
                <span>Total</span>
                <strong>{formatUSD(q.total)}</strong>
              </div>

              {q.savings > 0 && (
                <div className="mb-cart__savings">You're saving {formatUSD(q.savings)} with your bundle</div>
              )}

              {q.placeholderAmounts && (
                <p className="mb-cart__placeholder">Preview pricing — final amounts are being finalized. Lifetime Collection prices are set.</p>
              )}

              <a className="btn btn-gold mb-cart__cta" href="#collections">Continue</a>
            </>
          )}

          {/* Smart savings */}
          {recs.length > 0 && (
            <div className="mb-recs">
              {recs.map((r, i) => (
                <div key={i} className="mb-rec">
                  <div className="mb-rec__head">{r.headline}</div>
                  <div className="mb-rec__detail">{r.detail}</div>
                  {r.kind === "compare-lifetime" && (
                    <button type="button" className="mb-rec__cta" onClick={() => setTerm("lifetime")}>{r.cta}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Below: always-included + protection ── */}
      <div className="mb-build__extras">
        <div className="mb-extra">
          <h3 className="mb-extra__title">{FREE_FOREVER.name} — always included</h3>
          <p className="mb-extra__lead">{FREE_FOREVER.promise}</p>
          <ul className="mb-extra__list">
            {FREE_FOREVER.features.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
        <div className="mb-extra">
          <h3 className="mb-extra__title">{JOURNEY_PROTECTION.name} — optional</h3>
          <p className="mb-extra__lead">
            Pause a paid membership for 1, 2, or 3 months — your choice, no documentation needed.
            {" "}<strong>{formatUSD(JOURNEY_PROTECTION.monthly)}/mo</strong> or <strong>{formatUSD(JOURNEY_PROTECTION.annual)}/yr</strong>.
          </p>
          <p className="mb-extra__fine">{JOURNEY_PROTECTION.billingNote} You keep your account, memories, photos, videos, documents & website; premium features simply pause.</p>
        </div>
      </div>
    </div>
  );
}
