import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { CONCIERGE, formatPrice } from "@/lib/plans";
import "./concierge.css";

export const metadata: Metadata = {
  title: "The White-Glove Concierge Experience",
  description:
    "Our most exclusive offering — a one-of-a-kind digital experience designed personally with the founder of Magical Moments by Reign. A $5,000 one-time investment, accepted on a limited basis.",
};

export default async function ConciergePage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="cg">
      <PublicNav active="get-started" signedIn={signedIn} />
      <main className="cg-main">
        {/* Hero */}
        <header className="cg-hero">
          <div className="cg-inner">
            <span className="cg-crown" aria-hidden="true">👑</span>
            <span className="cg-eyebrow">White-Glove Service</span>
            <h1 className="cg-title">The White-Glove Concierge Experience</h1>
            <p className="cg-tagline">{CONCIERGE.tagline}</p>
            <div className="cg-price">
              <b>{formatPrice(CONCIERGE.price)}</b>
              <span>{CONCIERGE.priceKind}</span>
            </div>
            <Link href="/contact?reason=concierge#contact-form" className="btn-gold cg-cta">{CONCIERGE.cta}</Link>
            <p className="cg-appnote">{CONCIERGE.applicationsNote}</p>
          </div>
        </header>

        <div className="cg-inner cg-body">
          {/* Intro */}
          <section className="cg-intro">
            {CONCIERGE.intro.map((p) => <p key={p}>{p}</p>)}
          </section>

          <div className="cg-divider" aria-hidden="true">✦</div>

          {/* Your experience includes */}
          <section className="cg-includes" aria-labelledby="cg-includes-h">
            <h2 id="cg-includes-h" className="cg-h2">Your Experience Includes</h2>
            <div className="cg-cards">
              {CONCIERGE.includes.map((inc) => (
                <article key={inc.title} className="cg-card">
                  <h3 className="cg-card__title"><span className="cg-check" aria-hidden="true">✓</span> {inc.title}</h3>
                  <p className="cg-card__body">{inc.body}</p>
                  {"items" in inc && inc.items ? (
                    <ul className="cg-card__list">
                      {inc.items.map((it) => <li key={it}>{it}</li>)}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          {/* Two weeks of support */}
          <section className="cg-support">
            <h2 className="cg-h2">{CONCIERGE.support.title}</h2>
            <p>{CONCIERGE.support.body}</p>
          </section>

          {/* Then it becomes your story */}
          <section className="cg-ongoing">
            <h2 className="cg-h2">Then It Becomes Your Story</h2>
            <p className="cg-ongoing__intro">{CONCIERGE.ongoingIntro}</p>
            <ul className="cg-ongoing__list">
              {CONCIERGE.ongoing.map((o) => <li key={o}>{o}</li>)}
            </ul>
            <p className="cg-ongoing__note">{CONCIERGE.ongoingNote}</p>
          </section>

          {/* Lasting legacy */}
          <section className="cg-legacy">
            <h2 className="cg-h2">A Lasting Legacy</h2>
            {CONCIERGE.legacy.map((p) => <p key={p}>{p}</p>)}
          </section>

          {/* Closing CTA */}
          <section className="cg-close">
            <Link href="/contact?reason=concierge#contact-form" className="btn-gold cg-cta">{CONCIERGE.cta}</Link>
            <p className="cg-appnote">{CONCIERGE.applicationsNote}</p>
          </section>
        </div>
      </main>
      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
