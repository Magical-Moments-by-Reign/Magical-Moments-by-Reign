"use client";

import { useState } from "react";
import {
  TERMS, quote, collectionFor, JOURNEY_PROTECTION, formatUSD, getTerm, type TermId,
} from "@/lib/pricing-engine";
import { OCCASIONS } from "@/lib/membership-builder";

// The official Membership Builder — powered by the canonical pricing engine.
// Occasions are multi-select; the term drives a live quote (with real
// multi-occasion savings); Monthly members can add Journey Protection; Lifetime
// members get a gentle "fill your collection" reminder. No invented prices —
// every amount comes from lib/pricing-engine.
type Selection = "free" | TermId;

const BUILD_TERMS: { id: Selection; label: string; sub: string; recurring?: boolean; suffix?: string }[] = [
  { id: "free", label: "Free Forever", sub: "Our gift to every family — begin at no cost." },
  { id: "monthly", label: "Monthly", sub: "Pay month to month. Upgrade anytime.", recurring: true, suffix: "/mo" },
  { id: "1yr", label: "Annual", sub: "One beautiful year." },
  { id: "5yr", label: "5 Years", sub: "Let the story keep growing." },
  { id: "10yr", label: "10 Years", sub: "A decade of milestones." },
  { id: "lifetime", label: "Lifetime", sub: "Kept for generations — the best long-term value." },
];

export default function MembershipBuilder() {
  const [occ, setOcc] = useState<string[]>(["wedding"]);
  const [term, setTerm] = useState<Selection>("lifetime");
  const [jp, setJp] = useState(false);
  const [jpInfo, setJpInfo] = useState(false);

  const count = occ.length;
  const priceCount = Math.max(1, count);
  const toggle = (id: string) =>
    setOcc((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isFree = term === "free";
  const q = isFree ? null : quote(count, term as TermId);
  const isMonthly = term === "monthly";
  const isLifetime = term === "lifetime";
  const collection = isLifetime ? collectionFor(count) : null;

  // Journey Protection only applies to Monthly.
  const jpActive = isMonthly && jp;
  const monthlyTotal = q ? q.total + (jpActive ? JOURNEY_PROTECTION.monthly : 0) : 0;

  // Lifetime "fill your collection" reminder (finite tiers only).
  const capReached = collection && Number.isFinite(collection.maxOccasions) && count >= collection.maxOccasions;
  const remaining = collection && Number.isFinite(collection.maxOccasions) ? collection.maxOccasions - count : 0;
  const showReminder = Boolean(isLifetime && collection && Number.isFinite(collection.maxOccasions) && count > 0 && remaining > 0 && remaining <= 3);

  const addRemaining = () => {
    if (!collection) return;
    const need = collection.maxOccasions - count;
    const pool = OCCASIONS.filter((o) => !occ.includes(o.id)).slice(0, Math.max(0, need));
    setOcc((prev) => [...prev, ...pool.map((o) => o.id)]);
  };

  // Honest CTA.
  const occParam = encodeURIComponent(occ.join(","));
  let cta = { label: "Continue to Checkout", href: `/checkout?term=${term}&occasions=${occParam}${jpActive ? "&protection=1" : ""}` };
  if (isFree) cta = { label: "Start Free", href: "/signup" };

  // Per-term price for the term list (uses the current count so it updates live).
  const termPrice = (id: Selection) => {
    if (id === "free") return { text: "Free", small: "forever" };
    const tq = quote(priceCount, id as TermId);
    const suffix = getTerm(id as TermId).suffix ?? "one-time";
    return { text: formatUSD(tq.total), small: suffix.replace("/", "per ") === "per mo" ? "per month" : "one-time" };
  };

  return (
    <div className="mb2-grid">
      <div>
        {/* Step 1 — occasions */}
        <div className="mb2-card">
          <div className="mb2-step">
            <span className="mb2-step__n">1</span>
            <div>
              <span className="mb2-step__t">Choose your occasions</span>
              <p className="mb2-step__s">Add or remove as many as you love — the price adjusts as you build.</p>
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
              <span className="mb2-step__t">Choose your membership</span>
              <p className="mb2-step__s">How would you like your moments preserved? You&apos;ll confirm the details at checkout.</p>
            </div>
          </div>
          <div className="mb2-terms">
            {BUILD_TERMS.map((t) => {
              const on = term === t.id;
              const p = termPrice(t.id);
              const sub = t.id === "lifetime" ? collectionFor(priceCount).blurb : t.sub;
              return (
                <button key={t.id} type="button" className={`mb2-term${on ? " on" : ""}`} onClick={() => setTerm(t.id)} aria-pressed={on}>
                  <span className="mb2-term__mark" aria-hidden="true" />
                  <span className="mb2-term__b">
                    <span className="mb2-term__n">{t.label}</span>
                    <span className="mb2-term__s">{sub}</span>
                  </span>
                  <span className="mb2-term__p">{p.text}<small>{p.small}</small></span>
                </button>
              );
            })}
          </div>

          {/* Journey Protection — Monthly only */}
          {isMonthly && (
            <div className="mb2-jp">
              <label className="mb2-jp__row">
                <input type="checkbox" checked={jp} onChange={(e) => setJp(e.target.checked)} />
                <span className="mb2-jp__b">
                  <span className="mb2-jp__n">Add Journey Protection
                    <button type="button" className="mb2-jp__info" onClick={(e) => { e.preventDefault(); setJpInfo((v) => !v); }} aria-expanded={jpInfo} aria-label="What is Journey Protection?">ⓘ What&apos;s this?</button>
                  </span>
                  <span className="mb2-jp__s">Pause your Monthly membership for up to 3 months when life happens.</span>
                </span>
                <span className="mb2-jp__p">{formatUSD(JOURNEY_PROTECTION.monthly)}<small>per month</small></span>
              </label>
              {jpInfo && (
                <div className="mb2-jp__panel">
                  <h4>What is Journey Protection?</h4>
                  <p>Peace of mind for Monthly Members. If life changes — hardship, illness, deployment, maternity leave, travel — you can pause your Monthly membership for up to 3 consecutive months, once every 12 months.</p>
                  <p><strong>While paused:</strong> no monthly payments are charged; your pages, photos, videos and memories stay exactly as you left them; your custom URL stays reserved; and you can resume anytime.</p>
                  <p><strong>Who it&apos;s for:</strong> Monthly Memberships only, because those are recurring. Free Forever, Annual, 5-Year, 10-Year, and Lifetime are prepaid and already include uninterrupted access for the full term — no pause needed.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live preview */}
      <aside className="mb2-preview">
        <div className="mb2-preview__h">Your Membership</div>
        <div className="mb2-preview__occ">
          {count === 0 ? (
            <span className="mb2-preview__empty">Choose an occasion to begin…</span>
          ) : (
            occ.map((id) => <span key={id} className="mb2-preview__pill">{OCCASIONS.find((o) => o.id === id)?.label}</span>)
          )}
        </div>
        <div className="mb2-preview__row">
          <span className="mb2-preview__k">Occasions</span>
          <span className="mb2-preview__v">{count}</span>
        </div>
        <div className="mb2-preview__row">
          <span className="mb2-preview__k">Membership</span>
          <span className="mb2-preview__v">{BUILD_TERMS.find((t) => t.id === term)?.label}</span>
        </div>
        {collection && (
          <div className="mb2-preview__row">
            <span className="mb2-preview__k">Collection</span>
            <span className="mb2-preview__v">{collection.name}</span>
          </div>
        )}
        {q && q.savings > 0 && (
          <div className="mb2-preview__row">
            <span className="mb2-preview__k">Bundle savings</span>
            <span className="mb2-preview__v" style={{ color: "#3f7d4f" }}>−{formatUSD(q.savings)}</span>
          </div>
        )}
        {jpActive && (
          <div className="mb2-preview__row">
            <span className="mb2-preview__k">Journey Protection</span>
            <span className="mb2-preview__v">{formatUSD(JOURNEY_PROTECTION.monthly)}/mo</span>
          </div>
        )}
        <div className="mb2-preview__total">
          <span className="mb2-preview__k">{isFree ? "Today" : isMonthly ? "Per month" : "Total"}</span>
          {isFree ? (
            <span className="mb2-preview__soon">Free</span>
          ) : (
            <b>{formatUSD(isMonthly ? monthlyTotal : (q?.total ?? 0))}{isMonthly ? <small style={{ fontSize: "0.9rem" }}>/mo</small> : null}</b>
          )}
        </div>
        <p className="mb2-preview__note">
          {isFree
            ? "Our gift to every family. Begin organizing and preserving today — upgrade whenever you wish."
            : isLifetime
              ? `${collection?.blurb} Kept forever. You never lose a dollar when you upgrade — prior payments are credited.`
              : `${q && q.savings > 0 ? "Each additional occasion is added at a lower rate. " : ""}You never lose a dollar when you upgrade — prior payments are credited toward the new plan. You choose your exact term at checkout.`}
        </p>
        {count === 0 && !isFree ? (
          <span className="mb2-cta" style={{ opacity: 0.5, pointerEvents: "none" }}>Choose an occasion</span>
        ) : (
          <a href={cta.href} className="mb2-cta">{cta.label} →</a>
        )}
      </aside>

      {/* Lifetime Smart Reminder / celebration — spans the grid */}
      {isLifetime && (showReminder || capReached) && (
        <div className={`mb2-remind${capReached ? " mb2-remind--celebrate" : ""}`}>
          {capReached ? (
            <>
              <span className="mb2-remind__spark" aria-hidden="true">✨</span>
              <div>
                <h3 className="mb2-remind__h">Congratulations — your Collection is complete.</h3>
                <p className="mb2-remind__p">Every occasion you selected is yours forever, and any unused occasions can be assigned whenever you&apos;re ready. Your unused occasions never expire.</p>
              </div>
            </>
          ) : (
            <>
              <span className="mb2-remind__spark" aria-hidden="true">✨</span>
              <div>
                <h3 className="mb2-remind__h">You&apos;re almost there.</h3>
                <p className="mb2-remind__p">You&apos;ve selected {count} Lifetime {count === 1 ? "occasion" : "occasions"}. Your {collection?.name} includes up to {collection?.maxOccasions} — add {remaining} more at no extra cost. Unused occasions never expire, so you don&apos;t have to choose them today.</p>
                <div className="mb2-remind__actions">
                  <button type="button" className="mb2-remind__yes" onClick={addRemaining}>Add {remaining} more</button>
                  <span className="mb2-remind__no">Keep my current selection</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
