import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import OccasionIcon from "@/components/OccasionIcon";
import PreviewFaq from "@/components/journeys/PreviewFaq";
import { EXPERIENCE_TYPES, getExperienceType } from "@/lib/experience-types";
import { STORY_PHOTOS } from "@/lib/story-photos";
import { galleryFor } from "@/lib/gallery-media";
import { previewFor } from "@/lib/journey-preview";
import { TERMS, quote, formatUSD, LIFETIME_COLLECTIONS, FREE_FOREVER } from "@/lib/pricing-engine";
import "../journeys.css";

export function generateStaticParams() {
  return EXPERIENCE_TYPES.map((t) => ({ type: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const t = getExperienceType(type);
  if (!t) return { title: "Journey" };
  return {
    title: `${t.label} — Journey Experience`,
    description: `Explore everything included in the ${t.label} before you decide — a guided tour with Magical AI, a sample website, planning timeline, and pricing.`,
  };
}

export default async function JourneyPreviewPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const t = getExperienceType(type);
  const p = previewFor(type);
  if (!t || !p) notFound();

  const heroPhoto = STORY_PHOTOS[type];
  const gallery = p.sampleSlug ? galleryFor(p.sampleSlug)?.slice(0, 8) : undefined;
  const style = { "--c1": t.gradient[0], "--c2": t.gradient[1] } as CSSProperties;

  return (
    <div className="jx" style={style}>
      <SiteNav active="experiences" />

      {/* Hero */}
      <header className={`jx-hero${heroPhoto ? " jx-hero--photo" : ""}`}>
        {heroPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="jx-hero__bg" src={heroPhoto} alt="" aria-hidden="true" />
        )}
        <div className="jx-hero__scrim" />
        <div className="container jx-hero__inner">
          <span className="jx-hero__icon"><OccasionIcon name={t.icon} size={40} /></span>
          <span className="eyebrow jx-hero__eyebrow">Journey Experience</span>
          <h1>{t.label}</h1>
          <p className="jx-hero__tagline">{t.tagline}</p>
        </div>
      </header>

      <main className="container jx-main">
        {/* AI welcome */}
        <section className="jx-ai" aria-label="Magical AI welcome">
          <span className="jx-ai__avatar" aria-hidden="true">✦</span>
          <div>
            <span className="jx-ai__name">Magical AI</span>
            <p className="jx-ai__msg">{p.aiWelcome}</p>
          </div>
        </section>

        {/* Overview */}
        <section className="jx-block">
          <h2 className="jx-h2">Journey overview</h2>
          <p className="jx-lead">{p.overview}</p>
        </section>

        {/* What's included */}
        <section className="jx-block">
          <h2 className="jx-h2">What&apos;s included</h2>
          <ul className="jx-included">
            {p.included.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
          </ul>
        </section>

        {/* Planning timeline */}
        <section className="jx-block">
          <h2 className="jx-h2">Planning timeline</h2>
          <ol className="jx-timeline">
            {p.timeline.map((it, i) => (
              <li key={i} className="jx-tl">
                <span className="jx-tl__when">{it.when}</span>
                <span className="jx-tl__what">{it.what}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Gallery + sample website */}
        {gallery && gallery.length > 0 && (
          <section className="jx-block">
            <h2 className="jx-h2">A peek at the gallery</h2>
            <div className="jx-gallery">
              {gallery.map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={g.url} alt={g.caption ?? ""} loading="lazy" />
              ))}
            </div>
            {p.sampleSlug && (
              <Link href={`/${p.sampleSlug}`} className="btn btn-outline-gold jx-sample">Explore a full sample website ↗</Link>
            )}
          </section>
        )}

        {/* Marketplace preview */}
        <section className="jx-block">
          <h2 className="jx-h2">Journey Marketplace</h2>
          <p className="jx-muted">Trusted professionals and partners for your {t.label.toLowerCase()}, all in one place.</p>
          <div className="jx-market">
            {p.marketplace.map((m) => <span key={m} className="jx-chip">{m}</span>)}
          </div>
          <p className="jx-fine">Marketplace partners &amp; member savings are being onboarded — categories shown are what this Journey will connect you with.</p>
        </section>

        {/* Pricing */}
        <section className="jx-block jx-pricing">
          <h2 className="jx-h2">Pricing</h2>
          <p className="jx-muted">This Journey is one Occasion. Your term applies to it, and you can add more Occasions anytime.</p>
          <div className="jx-prices">
            {TERMS.filter((tm) => tm.id !== "lifetime").map((tm) => (
              <div key={tm.id} className="jx-price">
                <span className="jx-price__term">{tm.label}</span>
                <span className="jx-price__amt">{formatUSD(quote(1, tm.id).total)}{tm.suffix ?? ""}</span>
              </div>
            ))}
            <div className="jx-price jx-price--life">
              <span className="jx-price__term">Lifetime</span>
              <span className="jx-price__amt">{formatUSD(LIFETIME_COLLECTIONS[0].price)}</span>
              <span className="jx-price__note">from Lifetime Legacy</span>
            </div>
          </div>
          <p className="jx-fine">Preview pricing — final amounts are being finalized (Lifetime Collections are set). Every membership includes <strong>{FREE_FOREVER.name}</strong>, and you only ever pay the difference when you upgrade.</p>
        </section>

        {/* FAQ */}
        <section className="jx-block">
          <h2 className="jx-h2">Frequently asked questions</h2>
          <PreviewFaq items={p.faq} />
        </section>

        {/* Ready to begin — three ways in */}
        <section className="jx-cta">
          <h2 className="jx-cta__title">Ready to begin your Journey?</h2>
          <p className="jx-cta__sub">Choose the experience that fits you best — no pressure, ever.</p>
          <div className="jx-choices">
            <div className="jx-choice">
              <h3>Free Forever</h3>
              <p>Start free and explore at your own pace. Upgrade anytime with nothing lost.</p>
              <Link href="/membership" className="btn btn-outline-gold">Continue with Free Forever</Link>
            </div>
            <div className="jx-choice jx-choice--feature">
              <span className="jx-choice__flag">Most loved</span>
              <h3>Magical Journey Preview</h3>
              <p>Experience the full premium Journey for <strong>5 days</strong>. No charge until it ends — cancel anytime.</p>
              <Link href={`/journeys/${type}/preview`} className="btn btn-gold">Start a Magical Journey Preview ✦</Link>
            </div>
            <div className="jx-choice">
              <h3>Purchase now</h3>
              <p>Ready to commit? Begin your Journey and add it to your cart right away.</p>
              <Link href={`/create?type=${type}`} className="btn btn-outline-gold">Purchase immediately</Link>
            </div>
          </div>
          <div className="jx-cta__foot">
            <Link href="/journeys" className="jx-cta__link">Compare another Journey</Link>
            <Link href="/journeys" className="jx-cta__link">Return to Occasions</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
