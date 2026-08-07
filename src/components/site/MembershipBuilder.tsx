"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  quote, collectionFor, JOURNEY_PROTECTION, formatUSD,
  estateLimitFor, canReserveEstates, PRICING_CONFIG, type TermId,
} from "@/lib/pricing-engine";
import { EXPERIENCES, getExperience } from "@/lib/membership-builder";
import { FREE_FOREVER_INCLUDES, UPGRADE_COPY } from "@/lib/membership-access";
import { useCart } from "@/components/cart/CartProvider";

// The official Membership Builder — three steps, driven by the canonical pricing
// engine. The MEMBERSHIP controls access: Free Forever cannot select Occasions
// (a click opens the upgrade panel); paid terms select freely; Lifetime reserves
// up to its limit. Every amount comes from lib/pricing-engine — nothing invented.
type Selection = "free" | TermId;

// Small elegant line-icons for the term rows.
const I = {
  heart: <path d="M12 20s-6.6-4.3-6.6-9.2A3.5 3.5 0 0 1 12 8.1a3.5 3.5 0 0 1 6.6 2.7c0 4.9-6.6 9.2-6.6 9.2z" />,
  cal: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3.2v3.6M16 3.2v3.6" /></>,
  diamond: <><path d="M6 4h12l3.2 5L12 20.5 2.8 9z" /><path d="M2.8 9h18.4M9 4l3 16.5L15 4" /></>,
  crown: <path d="M4 8l3.6 3L12 5l4.4 6L20 8l-1.4 10.5H5.4z" />,
};

const TERM_ROWS: { id: Selection; label: string; sub: string; icon: React.ReactNode; cta: string }[] = [
  { id: "free", label: "Free Forever", sub: "Our gift to every family.", icon: I.heart, cta: "$0.00" },
  { id: "monthly", label: "Monthly", sub: "Pay month to month.", icon: I.heart, cta: "Build your price" },
  { id: "1yr", label: "Annual", sub: "Pay once a year.", icon: I.cal, cta: "Build your price" },
  { id: "5yr", label: "5 Years", sub: "One term for five years.", icon: I.diamond, cta: "Build your price" },
  { id: "10yr", label: "10 Years", sub: "One term for ten years.", icon: I.crown, cta: "Build your price" },
  { id: "lifetime", label: "Lifetime", sub: "Best long-term value.", icon: I.crown, cta: "View collections" },
];

const TERM_PLAN: Record<Selection, string> = {
  free: "Free Forever", monthly: "Monthly Plan", "1yr": "Annual Plan",
  "5yr": "5-Year Plan", "10yr": "10-Year Plan", lifetime: "Lifetime",
};

export default function MembershipBuilder() {
  const [term, setTerm] = useState<Selection>("free");
  const [occ, setOcc] = useState<string[]>([]);
  const [jp, setJp] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // The occasion the visitor tapped while on Free — carried through the upgrade
  // modal so picking a membership there selects it immediately.
  const [pendingOcc, setPendingOcc] = useState<string | null>(null);
  const [downgraded, setDowngraded] = useState(false);

  const router = useRouter();
  const { setMembership } = useCart();

  const isFree = term === "free";
  const isMonthly = term === "monthly";
  const isLifetime = term === "lifetime";
  const canSelect = canReserveEstates(term);
  const limit = estateLimitFor(term);
  const hasLimit = Number.isFinite(limit);
  const count = occ.length;
  const atCap = hasLimit && count >= limit;

  const changeTerm = (next: Selection) => {
    if (next === "free") {
      const had = occ.length > 0;
      setOcc([]); setJp(false); setDowngraded(had); setTerm("free");
      return;
    }
    setDowngraded(false);
    const cap = estateLimitFor(next);
    if (Number.isFinite(cap) && occ.length > cap) setOcc(occ.slice(0, cap));
    setTerm(next);
  };

  const toggle = (id: string) => {
    if (!canSelect) { setPendingOcc(id); setShowUpgrade(true); return; }
    setOcc((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (hasLimit && prev.length >= limit) return prev;
      return [...prev, id];
    });
  };

  // Pick a membership from the upgrade modal: set the term, keep the occasion
  // the visitor was trying to select, and close the modal.
  const pickMembership = (next: TermId) => {
    changeTerm(next);
    if (pendingOcc) setOcc((prev) => (prev.includes(pendingOcc) ? prev : [...prev, pendingOcc]));
    setPendingOcc(null);
    setShowUpgrade(false);
  };

  const q = isFree ? null : quote(count, term as TermId);
  const collection = isLifetime ? collectionFor(count) : null;
  const jpActive = isMonthly && jp;
  const subtotal = q ? q.total : 0;
  const monthlyTotal = subtotal + (jpActive ? JOURNEY_PROTECTION.monthly : 0);

  // Price-summary line items (paid, non-lifetime).
  const first = !isFree && !isLifetime ? PRICING_CONFIG.firstOccasion[term as Exclude<TermId, "lifetime">] : 0;
  const addlEach = !isFree && !isLifetime ? PRICING_CONFIG.additionalOccasion[term as Exclude<TermId, "lifetime">] : 0;
  const addlCount = Math.max(0, count - 1);
  const suffix = isMonthly ? "/mo" : "";

  const firstOcc = count > 0 ? getExperience(occ[0]) : null;
  const VISIBLE = 12;
  const tiles = showAll ? EXPERIENCES : EXPERIENCES.slice(0, VISIBLE);

  const occParam = encodeURIComponent(occ.join(","));
  const checkoutHref = isFree ? "/signup" : `/checkout?term=${term}&occasions=${occParam}${jpActive ? "&protection=1" : ""}`;

  // Write the membership into the cart (the single source of truth Checkout
  // reads), THEN navigate. The URL keeps params for shareability, but the cart
  // is what Checkout and the Order API consume.
  const continueToCheckout = () => {
    if (isFree || occ.length === 0) return; // isFree already means term === "free"
    setMembership({ term: term as TermId, occasions: occ, protection: jpActive, addedAt: new Date().toISOString() });
    router.push("/checkout");
  };

  return (
    <div className="mbx">
      {/* Step 1 — Choose your occasion */}
      <section className="mbx-card" id="step1">
        <div className="mbx-head">
          <span className="mbx-num">1</span>
          <div>
            <h2 className="mbx-head__t">Choose your occasion</h2>
            <p className="mbx-head__s">What chapter of life are you creating?</p>
          </div>
        </div>

        {downgraded && (
          <div className="mbx-downgrade" role="status">
            You switched to <strong>Free Forever</strong>, so your Occasions were removed — Free Forever is a basic introduction and doesn&apos;t include Life Estates. Choose a paid membership below to select them.
          </div>
        )}

        <div className={`mbx-occ${isFree ? " mbx-occ--locked" : ""}`}>
          {tiles.map((e) => {
            const on = !isFree && occ.includes(e.id);
            const disabled = !on && !isFree && atCap;
            return (
              <button
                key={e.id}
                type="button"
                className={`mbx-tile${on ? " on" : ""}${disabled ? " disabled" : ""}`}
                onClick={() => toggle(e.id)}
                aria-pressed={on}
                style={e.photo ? { backgroundImage: `url(${e.photo})` } : undefined}
              >
                {on && <span className="mbx-tile__check" aria-hidden="true">✓</span>}
                <span className="mbx-tile__label">{e.label}</span>
              </button>
            );
          })}
        </div>

        {isFree ? (
          <div className="mbx-locknote">
            <p className="mbx-locknote__t">{UPGRADE_COPY.title}</p>
            <p className="mbx-locknote__s">Free Forever lets you explore, learn, and save your profile. Choose a membership below to begin creating.</p>
          </div>
        ) : EXPERIENCES.length > VISIBLE ? (
          <button type="button" className="mbx-viewall" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer occasions" : "View all occasions"} <span aria-hidden="true">›</span>
          </button>
        ) : null}
      </section>

      <div className="mbx-row">
        {/* Step 2 — Choose your membership term */}
        <section className="mbx-card" id="step2">
          <div className="mbx-head">
            <span className="mbx-num">2</span>
            <div>
              <h2 className="mbx-head__t">Choose your membership term</h2>
              <p className="mbx-head__s">How long would you like to preserve your moments?</p>
            </div>
          </div>

          <div className="mbx-terms">
            {TERM_ROWS.map((t) => {
              const on = term === t.id;
              let right: React.ReactNode;
              if (t.id === "free") right = <span className="mbx-term__price">$0.00</span>;
              else if (on) right = <span className="mbx-term__price">{formatUSD(t.id === "lifetime" ? collectionFor(Math.max(1, count)).price : quote(Math.max(1, count), t.id as TermId).total)}{t.id === "monthly" ? "/mo" : ""}</span>;
              else right = <span className="mbx-term__cta">{t.cta} <span aria-hidden="true">›</span></span>;
              return (
                <button key={t.id} type="button" className={`mbx-term${on ? " on" : ""}`} onClick={() => changeTerm(t.id)} aria-pressed={on}>
                  <span className="mbx-term__ic" aria-hidden="true"><svg viewBox="0 0 24 24">{t.icon}</svg></span>
                  <span className="mbx-term__b">
                    <span className="mbx-term__n">{t.label}</span>
                    <span className="mbx-term__s">{t.sub}</span>
                  </span>
                  {right}
                  <span className={`mbx-term__check${on ? " on" : ""}`} aria-hidden="true">{on ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 3 — Your membership preview */}
        <section className="mbx-card mbx-preview" id="step3">
          <div className="mbx-head">
            <span className="mbx-num">3</span>
            <div>
              <h2 className="mbx-head__t">Your membership preview</h2>
              <p className="mbx-head__s">Here&apos;s what your membership looks like.</p>
            </div>
          </div>

          {isFree ? (
            <>
              <ul className="mbx-incl">
                {FREE_FOREVER_INCLUDES.map((i) => <li key={i}>{i}</li>)}
              </ul>
              <div className="mbx-total">
                <span>Today</span><b>Free</b>
              </div>
              <a href={checkoutHref} className="mbx-continue">Start Free <span aria-hidden="true">→</span></a>
              <p className="mbx-preview__note">Our gift to every family. Upgrade whenever you&apos;re ready to create.</p>
            </>
          ) : (
            <>
              <div className="mbx-selrow">
                <span className="mbx-selrow__thumb" style={firstOcc?.photo ? { backgroundImage: `url(${firstOcc.photo})` } : undefined} aria-hidden="true" />
                <div className="mbx-selrow__b">
                  <div className="mbx-selrow__line">
                    <span>{firstOcc ? firstOcc.label : "Choose an occasion"}</span>
                    <a href="#step1" className="mbx-change">Change</a>
                  </div>
                  <div className="mbx-selrow__line">
                    <span>{TERM_PLAN[term]}</span>
                    <a href="#step2" className="mbx-change">Change</a>
                  </div>
                </div>
              </div>

              <div className="mbx-summary">
                <span className="mbx-summary__h">Price Summary</span>
                {isLifetime ? (
                  <div className="mbx-sl"><span>{collection?.name}</span><span>{formatUSD(collection?.price ?? 0)}</span></div>
                ) : (
                  <>
                    <div className="mbx-sl"><span>{firstOcc ? firstOcc.label : "First Occasion"} ({TERM_ROWS.find((t) => t.id === term)?.label})</span><span>{count > 0 ? formatUSD(first) + suffix : "—"}</span></div>
                    {addlCount > 0 && <div className="mbx-sl"><span>Additional Occasions ({addlCount})</span><span>{formatUSD(addlCount * addlEach)}{suffix}</span></div>}
                  </>
                )}
                {jpActive && <div className="mbx-sl"><span>Journey Protection</span><span>{formatUSD(JOURNEY_PROTECTION.monthly)}/mo</span></div>}
                <div className="mbx-sl mbx-sl--rule"><span>Subtotal</span><span>{formatUSD(isMonthly ? monthlyTotal : subtotal)}{suffix}</span></div>
                <div className="mbx-sl mbx-sl--muted"><span>Tax</span><span>Calculated at checkout</span></div>
              </div>

              <div className="mbx-total">
                <span>Today&apos;s Total</span><b>{formatUSD(isMonthly ? monthlyTotal : subtotal)}{suffix}</b>
              </div>
              {count === 0 ? (
                <span className="mbx-continue mbx-continue--off">Choose an occasion</span>
              ) : (
                <a href={checkoutHref} className="mbx-continue" onClick={(e) => { e.preventDefault(); continueToCheckout(); }}>Continue to Inclusions <span aria-hidden="true">→</span></a>
              )}
              <p className="mbx-preview__note">You never lose a dollar when you upgrade — prior payments are credited. Taxes are calculated at checkout.</p>
            </>
          )}
        </section>
      </div>

      {/* Protect your membership */}
      <section className="mbx-protect">
        <div className="mbx-protect__l">
          <span className="mbx-protect__ic" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 22.3 5 18.4 5 14V6z" /><path d="M9.5 12l1.8 1.8L15 10.2" /></svg>
          </span>
          <div>
            <h3 className="mbx-protect__t">Protect your membership</h3>
            <p className="mbx-protect__s">Pause your paid membership for 1, 2, or 3 months. You&apos;ll keep your account, memories, and everything you&apos;ve built — your time is just paused.</p>
          </div>
        </div>
        <div className="mbx-protect__r">
          <button type="button" className={`mbx-protect__btn${jpActive ? " on" : ""}`} onClick={() => setJp((v) => !v)} disabled={!isMonthly}>
            {jpActive ? "Journey Protection added ✓" : "Add Journey Protection"}
          </button>
          <span className="mbx-protect__price">{formatUSD(JOURNEY_PROTECTION.monthly)}/mo or {formatUSD(JOURNEY_PROTECTION.annual)}/yr</span>
          {!isMonthly && <span className="mbx-protect__hint">Available with Monthly memberships.</span>}
        </div>
      </section>

      {/* Trust row */}
      <div className="mbx-trust">
        {[
          { t: "Secure & Private", d: "Bank-level protection for your memories.", ic: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></> },
          { t: "Never Lose a Moment", d: "Your account is always safe with us.", ic: <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.6A3.5 3.5 0 0 1 18 18z" /> },
          { t: "Upgrade Anytime", d: "More time, more occasions, more magic.", ic: <path d="M12 20s-6.6-4.3-6.6-9.2A3.5 3.5 0 0 1 12 8.1a3.5 3.5 0 0 1 6.6 2.7c0 4.9-6.6 9.2-6.6 9.2z" /> },
          { t: "Made for Families", d: "Built to bring your family together beautifully.", ic: <><circle cx="8" cy="9" r="2.4" /><circle cx="16" cy="9" r="2.4" /><path d="M3.5 19a4.5 4.5 0 0 1 9 0M11.5 19a4.5 4.5 0 0 1 9 0" /></> },
        ].map((x) => (
          <div className="mbx-trust__item" key={x.t}>
            <span className="mbx-trust__ic" aria-hidden="true"><svg viewBox="0 0 24 24">{x.ic}</svg></span>
            <span className="mbx-trust__t">{x.t}</span>
            <span className="mbx-trust__d">{x.d}</span>
          </div>
        ))}
      </div>

      <p className="mbx-tag">✦ Your life. Your moments. Your magical space. ✦</p>

      {/* Free Forever upgrade panel */}
      {showUpgrade && (
        <div className="mb2-upsell" role="dialog" aria-modal="true" aria-labelledby="mbx-up-t" onClick={() => setShowUpgrade(false)}>
          <div className="mb2-upsell__card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="mb2-upsell__x" onClick={() => setShowUpgrade(false)} aria-label="Close">×</button>
            <span className="mb2-upsell__spark" aria-hidden="true">✨</span>
            <span className="mb2-upsell__eyebrow">{UPGRADE_COPY.eyebrow}</span>
            <h3 className="mb2-upsell__t" id="mbx-up-t">{UPGRADE_COPY.title}</h3>
            <p className="mb2-upsell__p">{UPGRADE_COPY.body}</p>
            {/* Each plan is selectable right here — tap one to begin. */}
            <div className="mb2-upsell__plans">
              <button type="button" className="mb2-upsell__plan" onClick={() => pickMembership("monthly")}><span className="mb2-upsell__pk">Monthly</span><span className="mb2-upsell__pv">from {formatUSD(quote(1, "monthly").total)}<small>/mo</small></span></button>
              <button type="button" className="mb2-upsell__plan" onClick={() => pickMembership("1yr")}><span className="mb2-upsell__pk">Annual</span><span className="mb2-upsell__pv">from {formatUSD(quote(1, "1yr").total)}</span></button>
              <button type="button" className="mb2-upsell__plan mb2-upsell__plan--feature" onClick={() => pickMembership("lifetime")}><span className="mb2-upsell__pk">Lifetime</span><span className="mb2-upsell__pv">from {formatUSD(collectionFor(1).price)}</span></button>
            </div>
            <div className="mb2-upsell__actions">
              <button type="button" className="mb2-upsell__pick" onClick={() => { setShowUpgrade(false); document.getElementById("step2")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>See all membership options</button>
              <button type="button" className="mb2-upsell__later" onClick={() => { setPendingOcc(null); setShowUpgrade(false); }}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
