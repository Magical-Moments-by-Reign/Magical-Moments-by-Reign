import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import {
  PLANS,
  COMPARISON_ROWS,
  ADD_ONS,
  getPlan,
  formatPrice,
  type PlanId,
} from "@/lib/plans";
import "./pricing.css";

export const metadata: Metadata = {
  title: "Choose Your Memory Preservation Plan",
  description:
    "Your Magical Moment is more than a webpage. Choose how long your memories live on — Silver Keepsake, Gold Legacy, Diamond Experience, or the Lifetime Legacy Collection.",
};

function Cell({ value, featured }: { value: string; featured?: boolean }) {
  let inner: React.ReactNode = value;
  if (value === "✓") inner = <span className="pp-yes">✓</span>;
  else if (value === "—") inner = <span className="pp-no">—</span>;
  return <td className={featured ? "pp-cell--featured" : undefined}>{inner}</td>;
}

export default function PricingPage() {
  return (
    <div className="pp">
      <SiteNav active="pricing" />

      {/* ── Page header ── */}
      <header className="pp-hero">
        <div className="container">
          <span className="pp-hero__eyebrow">Memory Preservation</span>
          <h1>
            Choose How Long Your <em>Memories</em> Live On
          </h1>
          <p className="pp-hero__lede">
            Your Magical Moment is more than a webpage. Select the preservation
            plan that best fits your story, your celebration, and how long you
            want to keep it available.
          </p>
          <span className="pp-hero__note">
            You may extend or upgrade your plan at any time.
          </span>
        </div>
      </header>

      {/* ── Plan cards ── */}
      <section className="pp-plans">
        <div className="container">
          <div className="pp-plans__grid">
            {PLANS.map((plan) => {
              const inherited = plan.inheritsFrom
                ? getPlan(plan.inheritsFrom)
                : undefined;
              return (
                <article
                  key={plan.id}
                  className={`pp-card pp-card--${plan.id}${
                    plan.badge ? " pp-card--featured" : ""
                  }`}
                >
                  {plan.badge && <span className="pp-badge">{plan.badge}</span>}
                  <span className="pp-card__tier">{plan.name.split(" ")[0]}</span>
                  <h3 className="pp-card__name">{plan.name}</h3>
                  <span className="pp-card__term">{plan.term}</span>

                  <div className="pp-card__price">
                    <b>{formatPrice(plan.price)}</b>
                    <span>{plan.priceSuffix}</span>
                  </div>
                  <p className="pp-card__tagline">{plan.tagline}</p>

                  <Link
                    href={`/checkout?plan=${plan.id}`}
                    className="btn-gold pp-card__cta"
                  >
                    {plan.cta}
                  </Link>

                  <div className="pp-bestfor">
                    <p className="pp-bestfor__label">Best for</p>
                    <ul className="pp-bestfor__list">
                      {plan.bestFor.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  {inherited ? (
                    <p className="pp-card__inherits">
                      Everything in {inherited.name}, plus:
                    </p>
                  ) : (
                    <p className="pp-features__label">Includes</p>
                  )}
                  <ul className="pp-features">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>

                  <div className="pp-card__address">
                    <strong>{plan.addressType}</strong>
                    <code>{plan.exampleUrl}</code>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Lower area: ombré light gray → charcoal ── */}
      <div className="pp-lower">
        {/* Comparison */}
        <section className="pp-section pp-compare">
          <div className="container">
            <div className="pp-section__head">
              <h2>Compare Every Plan</h2>
              <p>Everything included, side by side — so your choice feels clear.</p>
            </div>

            {/* Desktop / tablet: table */}
            <div className="pp-compare__wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    {PLANS.map((p) => (
                      <th
                        key={p.id}
                        scope="col"
                        className={p.badge ? "pp-th--featured" : undefined}
                      >
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
                        <Cell
                          key={p.id}
                          value={row.values[p.id as PlanId]}
                          featured={Boolean(p.badge)}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: one plan per stacked card */}
            <div className="pp-compare-cards">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`pp-ccard${p.badge ? " pp-ccard--featured" : ""}`}
                >
                  <div className="pp-ccard__head">
                    <b>{p.name}</b>
                    <span>{p.termShort}</span>
                  </div>
                  {COMPARISON_ROWS.map((row) => (
                    <div className="pp-ccard__row" key={row.label}>
                      <span>{row.label}</span>
                      <span>{row.values[p.id as PlanId]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <p className="pp-compare__foot">
              * Lifetime Memory Preservation is provided for the lifetime of the
              Magical Moments by Reign service, subject to the service terms and
              fair-use policy.
            </p>
          </div>
        </section>

        {/* Custom domain */}
        <section className="pp-section pp-on-dark">
          <div className="container">
            <div className="pp-section__head">
              <h2>
                Your Story. <em>Your Own Address.</em>
              </h2>
              <p>
                Silver and Gold experiences live at a Magical Moments by Reign
                page address. Diamond and Lifetime plans include a custom domain,
                subject to availability.
              </p>
            </div>
            <div className="pp-domain__grid">
              <div className="pp-domain__card">
                <small>Magical Moments URL</small>
                <code>magicalmomentsbyreign.com/karlie-2027</code>
              </div>
              <div className="pp-domain__card">
                <small>Custom Domain</small>
                <code>karliesenioryear.com</code>
              </div>
            </div>
            <ul className="pp-domain__points">
              <li>Magical Moments manages the technical connection for you.</li>
              <li>
                You don&apos;t need to create a separate hosting account — it&apos;s
                handled end to end.
              </li>
              <li>
                Domain renewals after the included registration period are
                clearly disclosed before you&apos;re charged.
              </li>
              <li>
                Prefer to use a domain you already own? You can connect it, where
                supported.
              </li>
              <li>
                Custom domain availability is subject to registration
                availability. If your first choice is unavailable, we&apos;ll help
                you select another.
              </li>
            </ul>
          </div>
        </section>

        {/* Expiration & renewal */}
        <section className="pp-section pp-on-dark">
          <div className="container">
            <div className="pp-section__head">
              <h2>What Happens When My Preservation Term Ends?</h2>
              <p>No surprises, ever. We give you plenty of notice and a way to keep every memory.</p>
            </div>
            <div className="pp-reminders">
              {["90 days", "30 days", "7 days", "Expiration day"].map((d) => (
                <div className="pp-reminders__pill" key={d}>
                  <b>{d}</b>
                  reminder
                </div>
              ))}
            </div>
            <ul className="pp-expire__list">
              <li>You&apos;ll receive renewal reminders well before expiration.</li>
              <li>You can renew, extend, or upgrade at any time.</li>
              <li>After the term ends, your page may be unpublished.</li>
              <li>
                Your content then enters a limited grace period before deletion —
                never deleted the moment a term ends.
              </li>
              <li>
                During that window, you&apos;ll have the chance to download a full
                archive of your memories.
              </li>
            </ul>
            <p className="pp-callout">
              Exact grace-period rules are defined in the Terms of Service. We
              never permanently delete your content immediately at expiration.
            </p>
          </div>
        </section>
      </div>

      {/* Add-ons */}
      <section className="pp-addons">
        <div className="container">
          <div className="pp-section__head pp-on-dark">
            <h2>
              Make It <em>Even More</em> Magical
            </h2>
            <p>Optional add-ons you can include with any plan at checkout.</p>
          </div>
          <div className="pp-addons__grid">
            {ADD_ONS.map((a) => (
              <div className="pp-addon" key={a.id}>
                <div className="pp-addon__top">
                  <span className="pp-addon__name">{a.name}</span>
                  <span className="pp-addon__price">
                    {formatPrice(a.price)}
                    {a.priceSuffix ? ` ${a.priceSuffix}` : ""}
                  </span>
                </div>
                <p className="pp-addon__desc">{a.description}</p>
              </div>
            ))}
          </div>
          <p className="pp-addons__note">
            Add-ons are selected after you choose a plan, at checkout.
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="pp-closing">
        <div className="container">
          <p className="pp-closing__script">Every memory deserves a masterpiece.</p>
          <p>
            Choose how your memories will be preserved — and let us make them
            unforgettable.
          </p>
          <div className="pp-closing__actions">
            <Link href="/create" className="btn-gold">
              Start your magic ✦
            </Link>
            <Link href="#top" className="btn-outline-gold">
              Compare plans again
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
