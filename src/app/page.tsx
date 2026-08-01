import Link from "next/link";
import type { CSSProperties } from "react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import OccasionIcon from "@/components/OccasionIcon";
import { EXPERIENCE_TYPES } from "@/lib/experience-types";
import { PLANS, formatPrice } from "@/lib/plans";
import HeroSlideshow, { type HeroSlide } from "@/components/HeroSlideshow";

const HERO_SLIDES: HeroSlide[] = [
  { id: "newhome", src: "/hero/hero.mp4", poster: "/hero/hero-poster.jpg", label: "New Home Journey" },
];

export default function LandingPage() {
  return (
    <>
      <SiteNav active="home" />

      {/* Hero — editorial, cinematic slideshow */}
      <header className="hero">
        <HeroSlideshow slides={HERO_SLIDES} />
        <div className="container hero-inner">
          <span className="eyebrow">Magical Moments by Reign</span>
          <h1 className="hero__title">
            <span>Every Moment</span>
            <span>Deserves to Be</span>
            <span className="accent">Unforgettable.</span>
          </h1>
          <p className="lede">
            One beautifully engineered platform that turns life&apos;s biggest
            moments into custom-designed, interactive keepsakes — each with its
            own address, its own story, and a look no other page will ever share.
          </p>
          <div className="hero-actions">
            <Link href="/create" className="btn-gold">Start your magic ✦</Link>
            <Link href="#stories" className="btn-ghost">Choose your story</Link>
          </div>
        </div>
      </header>

      {/* Choose Your Story */}
      <section id="stories">
        <div className="container">
          <div className="section-head--left">
            <span className="eyebrow">Choose your story</span>
            <h2>Every occasion, uniquely designed</h2>
            <p className="muted">
              Pick the moment you want to preserve. Ask Magical designs a
              one-of-a-kind experience around it — no two ever look alike.
            </p>
          </div>
          <div className="story-grid">
            {EXPERIENCE_TYPES.map((t) => (
              <Link
                key={t.id}
                href={`/create?type=${t.id}`}
                className="occ-card"
                style={{ "--c1": t.gradient[0], "--c2": t.gradient[1] } as CSSProperties}
              >
                <span className="occ-card__icon"><OccasionIcon name={t.icon} /></span>
                <span className="occ-card__go" aria-hidden="true">→</span>
                <span className="occ-card__body">
                  <span className="occ-card__title">{t.label}</span>
                  <span className="occ-card__desc">{t.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: "var(--ivory)" }}>
        <div className="container">
          <div className="section-head--left">
            <span className="eyebrow">The experience</span>
            <h2>Like hiring a luxury design agency</h2>
            <p className="muted">No templates. No blank-canvas anxiety. Just a guided journey from moment to masterpiece.</p>
          </div>
          <div className="grid">
            <article className="card"><div className="icon">✦</div><h3>Choose your story</h3><p>Start from an occasion — never a blank page.</p></article>
            <article className="card"><div className="icon">✧</div><h3>Ask Magical designs it</h3><p>Colors, fonts, layout, and story order — composed uniquely for you.</p></article>
            <article className="card"><div className="icon">❦</div><h3>Gets its own address</h3><p>Instantly published to its own link, like magicalmomentsbyreign.com/smithwedding.</p></article>
            <article className="card"><div className="icon">♥</div><h3>Grows over time</h3><p>Add photos, chapters, and guests. A moment becomes a living keepsake.</p></article>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing-preview">
        <div className="container">
          <div className="section-head--left">
            <span className="eyebrow">Memory preservation</span>
            <h2>Choose how long your memories live on</h2>
            <p className="muted">One-time pricing. No surprises. Upgrade anytime.</p>
          </div>
          <div className="priceprev">
            {PLANS.map((p) => (
              <Link key={p.id} href="/pricing" className={`priceprev__card${p.badge === "Most Popular" ? " priceprev__card--featured" : ""}`}>
                {p.badge && <span className="priceprev__ribbon">{p.badge}</span>}
                <span className="priceprev__tier">{p.name.split(" ")[0]}</span>
                <div className="priceprev__name">{p.name}</div>
                <div className="priceprev__price">{formatPrice(p.price)} <small>{p.priceKind}</small></div>
                <p className="priceprev__label">{p.label}</p>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: "1.6rem" }}>
            <Link href="/pricing" className="btn btn-dark">See full plans &amp; comparison</Link>
          </p>
        </div>
      </section>

      {/* Business website CTA */}
      <section style={{ background: "var(--ivory)" }}>
        <div className="container">
          <div className="bizcta">
            <div>
              <span className="eyebrow bizcta__eyebrow">Need a business website?</span>
              <h3>Custom business websites, crafted separately</h3>
              <p>
                Business websites are custom, lifetime digital projects created
                separately from Magical Moments experiences — with their own
                domain, custom quote, and a direct consultation.
              </p>
            </div>
            <Link href="/contact?reason=business" className="btn-gold">Contact us for a business website</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
