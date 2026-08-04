"use client";

import { useState } from "react";
import {
  quote, collectionFor, JOURNEY_PROTECTION, formatUSD, getTerm,
  estateLimitFor, canReserveEstates, type TermId,
} from "@/lib/pricing-engine";
import { EXPERIENCES, getExperience } from "@/lib/membership-builder";
import { FREE_FOREVER_INCLUDES, UPGRADE_COPY } from "@/lib/membership-access";

// The official Membership Builder — the MEMBERSHIP is chosen first and controls
// what may be selected (entitlement lives in the pricing engine, never the UI):
//   • Free Forever      → cannot select Life Estates (selector is replaced by an
//                         upgrade invitation).
//   • Monthly/Annual/…  → select as many Life Experiences as desired.
//   • Lifetime          → reserve up to the Lifetime limit (a live counter).
// Changing down to Free Forever clears any selections and explains why. Each
// chosen chapter can be personalized with its milestones (not priced). Every
// amount comes from lib/pricing-engine.
type Selection = "free" | TermId;

const BUILD_TERMS: { id: Selection; label: string; sub: string }[] = [
  { id: "free", label: "Free Forever", sub: "A basic introduction — explore, learn, and save your profile." },
  { id: "monthly", label: "Monthly", sub: "Pay month to month. Upgrade anytime." },
  { id: "1yr", label: "Annual", sub: "One beautiful year." },
  { id: "5yr", label: "5 Years", sub: "Let the story keep growing." },
  { id: "10yr", label: "10 Years", sub: "A decade of milestones." },
  { id: "lifetime", label: "Lifetime", sub: "Kept for generations — the best long-term value." },
];

const FUTURE_IDEAS = ["Grandchildren", "Retirement", "Family Reunion", "New Business", "New Pet", "Memorial Tribute", "Future Wedding", "Future Anniversary"];

export default function MembershipBuilder() {
  const [term, setTerm] = useState<Selection>("lifetime");
  const [occ, setOcc] = useState<string[]>(["wedding"]);
  const [mil, setMil] = useState<Record<string, string[]>>({});
  const [jp, setJp] = useState(false);
  const [jpInfo, setJpInfo] = useState(false);
  const [remindDismissed, setRemindDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [downgraded, setDowngraded] = useState(false);

  const isFree = term === "free";
  const isMonthly = term === "monthly";
  const isLifetime = term === "lifetime";
  const canSelect = canReserveEstates(term);      // false for Free Forever
  const limit = estateLimitFor(term);             // 0 (free), 10 (lifetime), Infinity (other paid)
  const hasLimit = Number.isFinite(limit);
  const count = occ.length;
  const priceCount = Math.max(1, count);
  const atCap = hasLimit && count >= limit;

  // Membership determines access. Changing membership re-applies entitlement:
  //   → Free Forever removes every selection and explains why.
  //   → A capped membership (Lifetime) trims anything beyond its limit.
  const changeTerm = (next: Selection) => {
    if (next === "free") {
      const had = occ.length > 0;
      setOcc([]); setMil({}); setJp(false);
      setDowngraded(had);
      setTerm(next);
      return;
    }
    setDowngraded(false);
    const cap = estateLimitFor(next);
    if (Number.isFinite(cap) && occ.length > cap) {
      const kept = occ.slice(0, cap);
      setOcc(kept);
      setMil((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => kept.includes(k))));
    }
    setTerm(next);
  };

  // Occasions are unlocked by Membership. Free cannot select — a click opens the
  // upgrade panel. A capped membership blocks selecting beyond its limit.
  const toggle = (id: string) => {
    if (!canSelect) { setShowUpgrade(true); return; }
    setOcc((prev) => {
      if (prev.includes(id)) {
        setMil((mprev) => { const n = { ...mprev }; delete n[id]; return n; });
        return prev.filter((x) => x !== id);
      }
      if (hasLimit && prev.length >= limit) return prev; // at cap — cannot add more
      return [...prev, id];
    });
  };

  const toggleMilestone = (expId: string, msId: string) => {
    setMil((prev) => {
      const cur = prev[expId] ?? [];
      const next = cur.includes(msId) ? cur.filter((x) => x !== msId) : [...cur, msId];
      return { ...prev, [expId]: next };
    });
  };

  const q = isFree ? null : quote(count, term as TermId);
  const collection = isLifetime ? collectionFor(count) : null;
  const jpActive = isMonthly && jp;
  const monthlyTotal = q ? q.total + (jpActive ? JOURNEY_PROTECTION.monthly : 0) : 0;

  // Lifetime "complete your collection" reminder — counts toward the Lifetime limit.
  const remaining = isLifetime && hasLimit ? limit - count : 0;
  const capReached = isLifetime && hasLimit && count >= limit;
  const showReminder = Boolean(isLifetime && count > 0 && remaining > 0 && remaining <= 3 && !remindDismissed);

  const addRemaining = () => {
    const need = limit - count;
    const pool = EXPERIENCES.filter((e) => !occ.includes(e.id)).slice(0, Math.max(0, need));
    setOcc((prev) => [...prev, ...pool.map((e) => e.id)]);
  };

  const occParam = encodeURIComponent(occ.join(","));
  let cta = { label: "Continue to Checkout", href: `/checkout?term=${term}&occasions=${occParam}${jpActive ? "&protection=1" : ""}` };
  if (isFree) cta = { label: "Start Free", href: "/signup" };

  const termPrice = (id: Selection) => {
    if (id === "free") return { text: "Free", small: "forever" };
    const tq = quote(priceCount, id as TermId);
    const suffix = getTerm(id as TermId).suffix ?? "one-time";
    return { text: formatUSD(tq.total), small: suffix === "/mo" ? "per month" : "one-time" };
  };

  return (
    <div className="mb2-grid">
      <div>
        {/* Step 1 — membership FIRST (it controls what can be selected) */}
        <div className="mb2-card">
          <div className="mb2-step">
            <span className="mb2-step__n">1</span>
            <div>
              <span className="mb2-step__t">Choose your membership</span>
              <p className="mb2-step__s">Your membership decides what you can create. You&apos;ll confirm the details at checkout.</p>
            </div>
          </div>
          <div className="mb2-terms">
            {BUILD_TERMS.map((t) => {
              const on = term === t.id;
              const p = termPrice(t.id);
              const sub = t.id === "lifetime" ? collectionFor(priceCount).blurb : t.sub;
              return (
                <button key={t.id} type="button" className={`mb2-term${on ? " on" : ""}`} onClick={() => changeTerm(t.id)} aria-pressed={on}>
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

        {/* Step 2 — Life Experiences, gated by the chosen membership */}
        <div className={`mb2-card${isFree ? " mb2-card--locked" : ""}`}>
          <div className="mb2-step">
            <span className="mb2-step__n">2</span>
            <div>
              <span className="mb2-step__t">{isFree ? "Life Experiences" : "Which chapter of life are we creating?"}</span>
              <p className="mb2-step__s">
                {isFree
                  ? "Life Experiences are unlocked with a Membership. Free Forever is a basic introduction to Magical Moments."
                  : "Choose the chapters that matter, then personalize the milestones within each one."}
              </p>
            </div>
          </div>

          {downgraded && (
            <div className="mb2-downgrade" role="status">
              You switched to <strong>Free Forever</strong>, so your selected Life Experiences were removed — Free Forever doesn&apos;t include Life Estates. Choose a Membership above to select them again.
            </div>
          )}

          {isFree ? (
            <div className="mb2-locknote">
              <span className="mb2-locknote__spark" aria-hidden="true">✨</span>
              <p className="mb2-locknote__t">Upgrade to begin creating your first Life Estate.</p>
              <p className="mb2-locknote__s">Free Forever lets you explore, learn, and save your profile. A Membership unlocks the Life Experiences.</p>
              <button type="button" className="mb2-locknote__btn" onClick={() => setShowUpgrade(true)}>View Memberships</button>
            </div>
          ) : (
            <>
              <div className="mb2-exps">
                {EXPERIENCES.map((e) => {
                  const on = occ.includes(e.id);
                  const disabled = !on && atCap;
                  const chosen = mil[e.id] ?? [];
                  const wide = e.id === "legacy" || e.id === "relationship" || e.id === "custom";
                  const light = e.id === "custom";
                  return (
                    <div key={e.id} className={`mb2-exp${on ? " on" : ""}${disabled ? " disabled" : ""}${wide ? " mb2-exp--wide" : ""}${light ? " mb2-exp--light" : ""}`}>
                      <button
                        type="button"
                        className="mb2-exp__card"
                        onClick={() => toggle(e.id)}
                        aria-pressed={on}
                        disabled={disabled}
                        style={e.photo ? { backgroundImage: `url(${e.photo})` } : undefined}
                      >
                        <span className="mb2-exp__ic" aria-hidden="true">{e.icon}</span>
                        <span className="mb2-exp__meta">
                          <span className="mb2-exp__n">{e.label}</span>
                          <span className="mb2-exp__s">{e.blurb}</span>
                        </span>
                        <span className="mb2-exp__tick" aria-hidden="true">{on ? "✓" : "+"}</span>
                      </button>
                      {on && e.milestones.length > 0 && (
                        <div className="mb2-exp__mil">
                          <span className="mb2-exp__milt">Personalize your milestones <small>optional</small></span>
                          <div className="mb2-exp__milrow">
                            {e.milestones.map((ms) => {
                              const msOn = chosen.includes(ms.id);
                              return (
                                <button key={ms.id} type="button" className={`mb2-ms${msOn ? " on" : ""}`} onClick={() => toggleMilestone(e.id, ms.id)} aria-pressed={msOn}>
                                  {ms.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mb2-occ__bar">
                <span className="mb2-occ__crown" aria-hidden="true">♛</span>
                <em className="mb2-occ__state">
                  {count === 0
                    ? "No Life Experiences chosen yet."
                    : isLifetime
                      ? `${count} of ${limit} Lifetime Life Estates reserved.`
                      : `${count} Life Experience${count === 1 ? "" : "s"} selected.`}
                </em>
                <span className="mb2-occ__sep" aria-hidden="true" />
                <span className="mb2-occ__hint">
                  {isLifetime ? (atCap ? "You've reached the Lifetime limit." : `Reserve up to ${limit}.`) : "You can add as many as you'd like."}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live preview */}
      <aside className="mb2-preview">
        <div className="mb2-preview__h">Your Membership</div>
        {isFree ? (
          <ul className="mb2-preview__incl">
            {FREE_FOREVER_INCLUDES.map((i) => <li key={i}>{i}</li>)}
          </ul>
        ) : (
          <div className="mb2-preview__occ">
            {count === 0 ? (
              <span className="mb2-preview__empty">Choose a chapter to begin…</span>
            ) : (
              occ.map((id) => <span key={id} className="mb2-preview__pill">{getExperience(id)?.label}</span>)
            )}
          </div>
        )}
        {!isFree && (
          <div className="mb2-preview__row">
            <span className="mb2-preview__k">{isLifetime ? "Lifetime Life Estates" : "Life Experiences"}</span>
            <span className="mb2-preview__v">{isLifetime ? `${count} of ${limit}` : count}</span>
          </div>
        )}
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
            ? "Our gift to every family. Explore, learn, and save your profile — upgrade whenever you're ready to create."
            : isLifetime
              ? `${collection?.blurb} Kept forever. You never lose a dollar when you upgrade — prior payments are credited.`
              : `${q && q.savings > 0 ? "Each additional occasion is added at a lower rate. " : ""}You never lose a dollar when you upgrade — prior payments are credited toward the new plan. You choose your exact term at checkout.`}
        </p>
        {count === 0 && !isFree ? (
          <span className="mb2-cta" style={{ opacity: 0.5, pointerEvents: "none" }}>Choose a chapter</span>
        ) : (
          <a href={cta.href} className="mb2-cta">{cta.label} →</a>
        )}
      </aside>

      {/* Lifetime reminder / celebration — spans the grid */}
      {isLifetime && (showReminder || capReached) && (
        <div className={`mb2-remind${capReached ? " mb2-remind--celebrate" : ""}`}>
          <span className="mb2-remind__spark" aria-hidden="true">✨</span>
          {capReached ? (
            <div>
              <h3 className="mb2-remind__h">Your Legacy Collection is complete.</h3>
              <p className="mb2-remind__p">All {limit} of your Lifetime Life Estates are reserved and yours forever. Any you haven&apos;t assigned yet are simply waiting — for a wedding not yet planned, a grandchild not yet born, a chapter not yet written. They never expire.</p>
            </div>
          ) : (
            <div>
              <h3 className="mb2-remind__h">Complete Your Legacy Collection</h3>
              <p className="mb2-remind__p">You&apos;ve reserved {count} of your {limit} Lifetime Life Estates. {remaining} {remaining === 1 ? "is" : "are"} still waiting for future chapters of your family&apos;s story. You don&apos;t have to decide today — reserve {remaining === 1 ? "it" : "them"} now and use {remaining === 1 ? "it" : "them"} whenever life creates another magical moment.</p>
              <div className="mb2-remind__ideas">
                {FUTURE_IDEAS.map((i) => <span key={i} className="mb2-remind__idea">{i}</span>)}
              </div>
              <div className="mb2-remind__actions">
                <button type="button" className="mb2-remind__yes" onClick={addRemaining}>Reserve My Remaining Estates</button>
                <button type="button" className="mb2-remind__no" onClick={() => setRemindDismissed(true)}>Maybe Later</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Free Forever upgrade panel */}
      {showUpgrade && (
        <div className="mb2-upsell" role="dialog" aria-modal="true" aria-labelledby="mb2-upsell-t" onClick={() => setShowUpgrade(false)}>
          <div className="mb2-upsell__card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="mb2-upsell__x" onClick={() => setShowUpgrade(false)} aria-label="Close">×</button>
            <span className="mb2-upsell__spark" aria-hidden="true">✨</span>
            <span className="mb2-upsell__eyebrow">{UPGRADE_COPY.eyebrow}</span>
            <h3 className="mb2-upsell__t" id="mb2-upsell-t">{UPGRADE_COPY.title}</h3>
            <p className="mb2-upsell__p">{UPGRADE_COPY.body}</p>
            <div className="mb2-upsell__plans">
              <div className="mb2-upsell__plan">
                <span className="mb2-upsell__pk">Monthly</span>
                <span className="mb2-upsell__pv">from {formatUSD(quote(1, "monthly").total)}<small>/mo</small></span>
              </div>
              <div className="mb2-upsell__plan">
                <span className="mb2-upsell__pk">Annual</span>
                <span className="mb2-upsell__pv">from {formatUSD(quote(1, "1yr").total)}</span>
              </div>
              <div className="mb2-upsell__plan mb2-upsell__plan--feature">
                <span className="mb2-upsell__pk">Lifetime</span>
                <span className="mb2-upsell__pv">from {formatUSD(collectionFor(1).price)}</span>
              </div>
            </div>
            <div className="mb2-upsell__actions">
              <button type="button" className="mb2-upsell__pick" onClick={() => { changeTerm("monthly"); setShowUpgrade(false); }}>Choose a Membership</button>
              <button type="button" className="mb2-upsell__later" onClick={() => setShowUpgrade(false)}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
