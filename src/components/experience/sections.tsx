// ── The master markup: reusable, themeable sections ─────────────
// Every customer experience is composed from these same building
// blocks. The design engine decides which appear, in what order, and
// with which layout variant — so one architecture yields unlimited
// unique pages.

import type { DesignSpec, ExperienceContent } from "@/types";
import { ctaLabelFor } from "@/lib/content";

interface SectionProps {
  content: ExperienceContent;
  spec: DesignSpec;
  variant: string;
  experienceType?: string;
}

export function Hero({ content, variant, experienceType }: SectionProps) {
  const { hero } = content;
  // Per-occasion, immersive CTA (covers older experiences too).
  const ctaLabel = experienceType ? ctaLabelFor(experienceType) : hero.ctaLabel;
  // Scroll to the first content section after the hero.
  const target = "#mbr-explore";
  return (
    <header className={`mbr-hero mbr-hero--${variant}`} id="top">
      <div className="mbr-hero__bg" aria-hidden="true" />
      <div className="mbr-container mbr-hero__inner">
        <span className="mbr-eyebrow">{hero.eyebrow}</span>
        <h1 className="mbr-hero__title">{hero.headline}</h1>
        {hero.subhead && <p className="mbr-hero__subhead">{hero.subhead}</p>}
        {ctaLabel && (
          <a className="mbr-btn mbr-btn--accent" href={target}>
            {ctaLabel}
          </a>
        )}
      </div>
      <a className="mbr-scroll" href={target} aria-label="Scroll to explore">
        <span>Scroll to explore</span>
        <span className="mbr-scroll__chev" aria-hidden="true">⌄</span>
      </a>
    </header>
  );
}

export function Story({ content, variant }: SectionProps) {
  if (!content.story?.length) return null;
  return (
    <section className={`mbr-section mbr-story mbr-story--${variant}`} id="story">
      <div className="mbr-container">
        <div className="mbr-story__grid">
          {content.story.map((c, i) => (
            <article className="mbr-story__chapter" key={i}>
              <span className="mbr-chapter-index">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mbr-h2">{c.heading}</h2>
              <p className="mbr-prose">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Gallery({ content, variant }: SectionProps) {
  if (!content.gallery?.length) return null;
  return (
    <section className={`mbr-section mbr-gallery mbr-gallery--${variant}`} id="gallery">
      <div className="mbr-container">
        <h2 className="mbr-h2 mbr-center">Gallery</h2>
        <div className="mbr-gallery__grid">
          {content.gallery.map((g, i) => (
            <figure className="mbr-gallery__item" key={i}>
              {/* Customer media; external hosts, so a plain img is used. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt={g.caption || "Memory"} loading="lazy" />
              {g.caption && <figcaption>{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Timeline({ content, variant }: SectionProps) {
  if (!content.timeline?.length) return null;
  return (
    <section className={`mbr-section mbr-timeline mbr-timeline--${variant}`} id="timeline">
      <div className="mbr-container">
        <h2 className="mbr-h2 mbr-center">The Journey</h2>
        <ol className="mbr-timeline__list">
          {content.timeline.map((e, i) => (
            <li className="mbr-timeline__entry" key={i}>
              <div className="mbr-timeline__dot" aria-hidden="true" />
              <div className="mbr-timeline__card">
                <span className="mbr-timeline__date">{e.date}</span>
                <h3 className="mbr-h3">{e.title}</h3>
                <p className="mbr-prose">{e.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Quote({ content, variant }: SectionProps) {
  if (!content.quote?.text) return null;
  return (
    <section className={`mbr-section mbr-quote mbr-quote--${variant}`}>
      <div className="mbr-container mbr-quote__inner">
        <blockquote className="mbr-quote__text">“{content.quote.text}”</blockquote>
        {content.quote.attribution && (
          <cite className="mbr-quote__cite">— {content.quote.attribution}</cite>
        )}
      </div>
    </section>
  );
}

export function Details({ content, variant }: SectionProps) {
  if (!content.details?.length) return null;
  return (
    <section className={`mbr-section mbr-details mbr-details--${variant}`}>
      <div className="mbr-container">
        <h2 className="mbr-h2 mbr-center">Details</h2>
        <div className="mbr-details__grid">
          {content.details.map((d, i) => (
            <div className="mbr-details__item" key={i}>
              <span className="mbr-details__label">{d.label}</span>
              <span className="mbr-details__value">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Guestbook({ variant }: SectionProps) {
  return (
    <section className={`mbr-section mbr-guestbook mbr-guestbook--${variant}`}>
      <div className="mbr-container mbr-center">
        <h2 className="mbr-h2">Leave a note</h2>
        <p className="mbr-prose mbr-guestbook__intro">
          Add your memory, your wishes, your love. Every message becomes part of
          this keepsake, forever.
        </p>
        <div className="mbr-guestbook__form" aria-hidden="true">
          <input placeholder="Your name" disabled />
          <textarea placeholder="Your message…" rows={3} disabled />
          <button className="mbr-btn mbr-btn--primary" disabled>
            Sign the guestbook
          </button>
        </div>
        <p className="mbr-note">Guestbook goes live with accounts in Phase 2.</p>
      </div>
    </section>
  );
}

export function Footer({ content }: SectionProps) {
  return (
    <footer className="mbr-footer">
      <div className="mbr-container mbr-center">
        <p className="mbr-footer__title">{content.hero.headline}</p>
        <p className="mbr-footer__by">
          Handcrafted with <span aria-hidden="true">♥</span> by{" "}
          <a href="/">Magical Moments by Reign</a>
        </p>
      </div>
    </footer>
  );
}

export const SECTION_COMPONENTS = {
  hero: Hero,
  story: Story,
  gallery: Gallery,
  timeline: Timeline,
  quote: Quote,
  details: Details,
  guestbook: Guestbook,
  footer: Footer,
} as const;
