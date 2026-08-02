import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import PlanQuiz from "@/components/pricing/PlanQuiz";
import AddPlanButton from "@/components/pricing/AddPlanButton";
import AddOnsShop from "@/components/pricing/AddOnsShop";
import EverythingIncluded from "@/components/pricing/EverythingIncluded";
import { PRICING_HEADLINE } from "@/lib/everything-included";
import {
  PLANS,
  COMPARISON_ROWS,
  CONCIERGE,
  getPlan,
  formatPrice,
  LIFETIME_LEGAL,
  type PlanId,
} from "@/lib/plans";
import "./pricing.css";
import "./everything-included.css";

export const metadata: Metadata = {
  title: "Choose Your Memory Preservation Plan",
  description:
    "One-time pricing for beautiful, lasting keepsakes — Silver Keepsake, Gold Legacy, Diamond Experience, and the Lifetime Legacy Collection from Magical Moments by Reign.",
};

function Cell({ value, featured }: { value: string; featured?: boolean }) {
  let inner: React.ReactNode = value;
  if (value === "✓") inner = <span className="pp-yes">✓</span>;
  else if (value === "—") inner = <span className="pp-no">—</span>;
  return <td className={featured ? "pp-cell--featured" : undefined}>{inner}</td>;
}

const FAQ = [
  { q: "What's included in every membership?", a: "Every paid membership includes the complete celebration experience — digital invitations, RSVP tracking, guest messaging, guestbooks, registries & gift links, photo & video galleries, timelines, and planning tools. These are never locked to a higher tier. Plans differ only by how long we preserve your Magical Moment, storage capacity, AI-generation limits, how many active Magical Moments you have, concierge services, and premium capacity — not by core features." },
  { q: "Do higher plans unlock features the lower plans don't have?", a: "No. The core celebration features are the same across every paid membership. Gold, Diamond, and Lifetime add more preservation length, storage, AI-generated videos, capacity, and premium support — not additional core features." },
  { q: "Is this a one-time payment or a subscription?", a: "Each plan is a one-time payment for its term — nothing is billed automatically. When a term nears its end, we remind you so you can renew, extend, or upgrade by choice. (Our Magical Preview Pass trial is the one flow that converts to a monthly membership, always with clear, up-front disclosure.)" },
  { q: "Can I upgrade later?", a: "Yes. You can upgrade to a longer plan anytime, and we'll credit what makes sense so you only pay the difference." },
  { q: "What's included with a custom domain?", a: "Diamond and Lifetime include one custom domain, subject to availability. Initial registration is included for the term; future renewals are disclosed before any charge. Your Magical Moments by Reign address always remains available while your plan is active." },
  { q: "What happens when my preservation term ends?", a: "We send reminders at 90, 30, and 7 days and on the expiration date. After the term, your page may be unpublished and your content enters a limited grace period — with a chance to download a full archive — before removal. It's never deleted the moment a term ends." },
  { q: "Do you offer business websites?", a: "Business websites are custom, lifetime projects handled separately from Magical Moments experiences, with their own domain and a custom quote. Reach out via the Contact page to discuss." },
];

export default function PricingPage() {
  return (
    <div className="pp">
      <SiteNav active="pricing" />

      <header className="pp-hero">
        <div className="container">
          <span className="pp-hero__eyebrow">Memory Preservation</span>
          <h1>Choose How Long Your <em>Memories</em> Live On</h1>
          <p className="pp-hero__lede">
            Your Magical Moment is more than a webpage. Choose the preservation
            plan that fits your story — one-time pricing, no surprises, upgrade anytime.
          </p>
          <span className="pp-hero__note">You may extend or upgrade your plan at any time.</span>
        </div>
      </header>

      {/* Everything Included — full value before price */}
      <EverythingIncluded />

      {/* Plan cards with logo watermark */}
      <section className="pp-plans">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pp-watermark" src="/brand/logo.png" alt="" aria-hidden="true" />
        <div className="container">
          <div className="pp-pricing-head">
            <h2>{PRICING_HEADLINE.title}</h2>
            <p>{PRICING_HEADLINE.body}</p>
          </div>
          <div className="pp-plans__grid">
            {PLANS.map((plan) => {
              const inherited = plan.inheritsFrom ? getPlan(plan.inheritsFrom) : undefined;
              const featured = plan.badge === "Most Popular";
              return (
                <article key={plan.id} className={`pp-card pp-card--${plan.theme}${featured ? " pp-card--featured" : ""}`}>
                  {plan.badge && (
                    <span className={`pp-badge${plan.badge === "Best Legacy Value" ? " pp-badge--legacy" : ""}`}>
                      {plan.badge}
                    </span>
                  )}
                  <span className="pp-card__tier">{plan.name.split(" ")[0]}</span>
                  <h3 className="pp-card__name">{plan.name}</h3>
                  <span className="pp-card__term">{plan.term}</span>

                  <div className="pp-card__price">
                    <b>{formatPrice(plan.price)}</b>
                  </div>
                  <p className="pp-pricekind">{plan.priceKind}</p>
                  <p className="pp-card__tagline">{plan.label}</p>

                  {plan.savingsNote && <p className="pp-savings">{plan.savingsNote}</p>}

                  <AddPlanButton planId={plan.id} label={plan.cta} className="btn-gold pp-card__cta" />

                  <div className="pp-bestfor">
                    <p className="pp-bestfor__label">Best for</p>
                    <ul className="pp-bestfor__list">
                      {plan.bestFor.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  </div>

                  {inherited
                    ? <p className="pp-card__inherits">Everything in {inherited.name}, plus:</p>
                    : <p className="pp-features__label">Includes</p>}
                  <ul className="pp-features">
                    {plan.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>

                  <div className="pp-card__address">
                    <strong>{plan.domain}</strong>
                    <code>{plan.addressExample}</code>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Custom Concierge — white-glove, quote-based */}
      <section className="pp-concierge-sec">
        <div className="container">
          <article className="pp-concierge">
            <div className="pp-concierge__body">
              <span className="pp-concierge__eyebrow">White-glove service</span>
              <h2>{CONCIERGE.name}</h2>
              <p className="pp-concierge__tagline">{CONCIERGE.tagline}</p>
              <div className="pp-concierge__price">
                <b>{formatPrice(CONCIERGE.price)}</b>
                <span>{CONCIERGE.priceKind}</span>
              </div>
              <Link href="/concierge" className="btn-gold pp-concierge__cta">Explore the White-Glove Experience</Link>
              <p className="pp-concierge__note">{CONCIERGE.applicationsNote}</p>
            </div>
            <ul className="pp-concierge__features">
              {CONCIERGE.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </article>
        </div>
      </section>

      {/* Plan recommendation quiz */}
      <section className="pp-section" style={{ background: "var(--cream-200)" }}>
        <div className="container">
          <div className="pp-section__head">
            <h2>Which Plan Fits <em>Your Story?</em></h2>
            <p>Answer three quick questions and we&apos;ll point you to the right fit.</p>
          </div>
          <PlanQuiz />
        </div>
      </section>

      {/* Lower area: comparison + domain + expiration on ombré */}
      <div className="pp-lower">
        <section className="pp-section pp-compare" id="compare">
          <div className="container">
            <div className="pp-section__head">
              <h2>Compare Every Plan</h2>
              <p>Everything included, side by side — so your choice feels clear.</p>
            </div>
            <div className="pp-compare__wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    {PLANS.map((p) => (
                      <th key={p.id} scope="col" className={p.badge === "Most Popular" ? "pp-th--featured" : undefined}>
                        {p.name.split(" ")[0]}
                        <span className="pp-th-term">{p.termShort}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {PLANS.map((p) => (
                        <Cell key={p.id} value={row.values[p.id as PlanId]} featured={p.badge === "Most Popular"} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pp-compare-cards">
              {PLANS.map((p) => (
                <div key={p.id} className={`pp-ccard${p.badge === "Most Popular" ? " pp-ccard--featured" : ""}`}>
                  <div className="pp-ccard__head"><b>{p.name}</b><span>{p.termShort}</span></div>
                  {COMPARISON_ROWS.map((row) => (
                    <div className="pp-ccard__row" key={row.label}>
                      <span>{row.label}</span><span>{row.values[p.id as PlanId]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="pp-compare__foot">* {LIFETIME_LEGAL}</p>
          </div>
        </section>

        <section className="pp-section pp-on-dark">
          <div className="container">
            <div className="pp-section__head">
              <h2>Your Story. <em>Your Own Address.</em></h2>
              <p>Silver and Gold experiences live at a Magical Moments by Reign page address. Diamond and Lifetime include a custom domain, subject to availability.</p>
            </div>
            <div className="pp-domain__grid">
              <div className="pp-domain__card"><small>Magical Moments URL</small><code>magicalmomentsbyreign.com/karlie-class-of-2027</code></div>
              <div className="pp-domain__card"><small>Custom Domain</small><code>karliesenioryear.com</code></div>
            </div>
            <ul className="pp-domain__points">
              <li>Magical Moments by Reign manages the technical connection for you.</li>
              <li>Domain availability is not guaranteed — you may need to choose another available name.</li>
              <li>Initial registration is included for the term; future renewal terms are disclosed before any charge.</li>
              <li>If a custom domain isn&apos;t renewed, your Magical Moments by Reign address remains available while your plan is active.</li>
            </ul>
          </div>
        </section>

        <section className="pp-section pp-on-dark">
          <div className="container">
            <div className="pp-section__head">
              <h2>What Happens When My Preservation Term Ends?</h2>
              <p>No surprises, ever. Plenty of notice and a way to keep every memory.</p>
            </div>
            <div className="pp-reminders">
              {["90 days", "30 days", "7 days", "Expiration day"].map((d) => (
                <div className="pp-reminders__pill" key={d}><b>{d}</b>reminder</div>
              ))}
            </div>
            <ul className="pp-expire__list">
              <li>You can renew, extend, or upgrade at any time.</li>
              <li>After the term ends, your page may be unpublished.</li>
              <li>Your content then enters a limited grace period before deletion — never immediately.</li>
              <li>During that window, download a full archive of your memories.</li>
            </ul>
            <p className="pp-callout">Exact grace-period rules are defined in the Terms of Service. We never permanently delete your content immediately at expiration.</p>
          </div>
        </section>
      </div>

      {/* FAQ */}
      <section className="pp-section" style={{ background: "var(--cream-100)" }}>
        <div className="container">
          <div className="pp-section__head"><h2>Frequently Asked <em>Questions</em></h2></div>
          <div className="pp-faq">
            {FAQ.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons shop */}
      <section className="pp-section" style={{ background: "var(--cream-200)" }} id="add-ons">
        <div className="container">
          <div className="pp-section__head">
            <h2>Enhance Your <em>Experience</em></h2>
            <p>Your plan already includes everything needed to create a beautiful Magical Moment. These optional upgrades allow you to add more storage, videos, keepsakes, domains, or expedited service.</p>
          </div>
          <AddOnsShop />
          <p className="pp-addons__note" style={{ color: "#7a7280", textAlign: "center", marginTop: "1.6rem" }}>
            USD · taxes may apply · add-ons may be limited by plan · domain availability is not guaranteed ·
            physical products require shipping · rush service is subject to availability.
          </p>
        </div>
      </section>

      <section className="pp-closing">
        <div className="container">
          <p className="pp-closing__script">Capture. Celebrate. Cherish Forever.</p>
          <p>Choose how your memories will be preserved — and let us make them unforgettable.</p>
          <div className="pp-closing__actions">
            <Link href="/create" className="btn-gold">Start your magic ✦</Link>
            <Link href="#compare" className="btn-outline-gold">Compare plans again</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
