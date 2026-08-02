import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import OccasionIcon from "@/components/OccasionIcon";
import PreviewFaq from "@/components/journeys/PreviewFaq";
import MagicalAIConcierge from "@/components/journeys/MagicalAIConcierge";
import BabyJourneyExperience from "@/components/journeys/BabyJourneyExperience";
import { conciergeFor } from "@/lib/journey-concierge";
import { EXPERIENCE_TYPES, getExperienceType } from "@/lib/experience-types";
import { STORY_PHOTOS } from "@/lib/story-photos";
import { galleryFor } from "@/lib/gallery-media";
import { previewFor, journeyDuration, relatedJourneys } from "@/lib/journey-preview";
import { PLANS, formatPrice } from "@/lib/plans";
import "../journeys.css";

const LOCKED_FEATURES = [
  "AI Journey Guide", "Create Invitations", "Upload Photos", "Create Registry",
  "Guest Messages", "Memory Timeline", "Planning Dashboard", "Highlight Videos",
];

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
  const concierge = conciergeFor(type);
  const gallery = p.sampleSlug ? galleryFor(p.sampleSlug)?.slice(0, 8) : undefined;
  const style = { "--c1": t.gradient[0], "--c2": t.gradient[1] } as CSSProperties;

  // The Baby Journey has a bespoke, full guided experience.
  if (type === "baby") {
    return (
      <div className="jx" style={style}>
        <SiteNav active="experiences" />
        <BabyJourneyExperience />
        <SiteFooter />
      </div>
    );
  }

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
          <span className="jx-preview-badge">✦ Preview Mode</span>
          <span className="jx-hero__icon"><OccasionIcon name={t.icon} size={40} /></span>
          <span className="eyebrow jx-hero__eyebrow">{journeyDuration(type)}</span>
          <h1>{t.label}</h1>
          <p className="jx-hero__tagline">{t.tagline}</p>
        </div>
      </header>

      <main className="container jx-main">
        {/* Magical AI concierge */}
        {concierge && <MagicalAIConcierge concierge={concierge} />}

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

        {/* Available when you unlock */}
        <section className="jx-block">
          <h2 className="jx-h2">Available when you unlock this Journey</h2>
          <p className="jx-muted">Everything below is part of your Journey — a peek now, yours to use the moment you unlock it.</p>
          <div className="jx-locked">
            {LOCKED_FEATURES.map((f) => (
              <div key={f} className="jx-lockedtile">
                <span className="jx-lockedtile__name">{f}</span>
                <span className="jx-lockedtile__hint">Available when you unlock this Journey</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="jx-block">
          <h2 className="jx-h2">Frequently asked questions</h2>
          <PreviewFaq items={p.faq} />
        </section>

        {/* Unlock panel */}
        <section className="jx-unlock" id="unlock">
          <h2 className="jx-unlock__title">Ready to Begin?</h2>
          <p className="jx-unlock__sub">Unlock the {t.label} today and start creating your own story.</p>
          <div className="jx-unlock__grid">
            {PLANS.map((pl) => (
              <div key={pl.id} className={`jx-unlockcard${pl.badge ? " jx-unlockcard--feature" : ""}`}>
                {pl.badge && <span className="jx-unlockcard__badge">{pl.badge}</span>}
                <span className="jx-unlockcard__term">{pl.termShort}</span>
                <span className="jx-unlockcard__amt">{formatPrice(pl.price)}</span>
                <Link href={`/create?type=${type}`} className="btn btn-gold jx-unlockcard__btn">Start {pl.termShort} Journey</Link>
              </div>
            ))}
          </div>
          <p className="jx-unlock__legacy">Already part of the <strong>Legacy Family</strong>? Your loyalty unlocks exclusive pricing — <Link href="/membership">see your discount</Link>.</p>
          <div className="jx-unlock__foot">
            <Link href="/membership" className="jx-cta__link">Or start with Free Forever</Link>
            <Link href={`/journeys/${type}/preview`} className="jx-cta__link">Try a 5-day Magical Journey Preview</Link>
          </div>
        </section>

        {/* Continue your story */}
        <section className="jx-block">
          <h2 className="jx-h2">Continue Your Story</h2>
          <div className="jx-related">
            {relatedJourneys(type).map((rid) => {
              const rt = getExperienceType(rid);
              if (!rt) return null;
              const photo = STORY_PHOTOS[rid];
              return (
                <Link key={rid} href={`/journeys/${rid}`} className="jx-relcard" style={{ ["--c1" as string]: rt.gradient[0], ["--c2" as string]: rt.gradient[1] }}>
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="jx-relcard__img" src={photo} alt="" aria-hidden="true" loading="lazy" />
                  )}
                  <span className="jx-relcard__scrim" />
                  <span className="jx-relcard__label">{rt.label} →</span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
