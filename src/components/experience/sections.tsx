// ── The master markup: reusable, themeable sections ─────────────
// Every customer experience is composed from these same building
// blocks. The design engine decides which appear, in what order, and
// with which layout variant — so one architecture yields unlimited
// unique pages.

import type { DesignSpec, ExperienceContent } from "@/types";
import { ctaLabelFor } from "@/lib/content";
import { heroMediaFor } from "@/lib/hero-media";
import { galleryFor } from "@/lib/gallery-media";

interface SectionProps {
  content: ExperienceContent;
  spec: DesignSpec;
  variant: string;
  experienceType?: string;
  slug?: string;
}

/** A memory quick-nav shown in the hero (e.g. for Celebration of Life).
 *  Only renders links whose target section actually exists. */
function heroNav(content: ExperienceContent): { href: string; label: string; icon: keyof typeof HERO_NAV_ICONS }[] {
  const items: { href: string; label: string; icon: keyof typeof HERO_NAV_ICONS }[] = [];
  if (content.story?.length) items.push({ href: "#story", label: "His Story", icon: "film" });
  if (content.gallery?.length) items.push({ href: "#gallery", label: "Photo Gallery", icon: "image" });
  if (content.timeline?.length) items.push({ href: "#timeline", label: "Favorite Memories", icon: "star" });
  items.push({ href: "#guestbook", label: "Family Messages", icon: "heart" });
  if (content.quote?.text) items.push({ href: "#quote", label: "In Loving Memory", icon: "candle" });
  return items;
}

const HERO_NAV_ICONS = {
  film: <path d="M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 9" /></>,
  star: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.2l5.9-.9z" />,
  heart: <path d="M12 20s-7-4.6-9.3-8.6C1.3 8.9 2.5 6 5.4 6c1.9 0 3 .9 3.9 2.2h1.4C11.6 6.9 12.7 6 14.6 6c2.9 0 4.1 2.9 2.7 5.4C19 15.4 12 20 12 20z" />,
  candle: <><path d="M12 4c1.2 1 1.2 2.4 0 3.4C10.8 6.4 10.8 5 12 4z" /><rect x="9.5" y="9" width="5" height="10" rx="1" /><path d="M8 21h8" /></>,
} as const;

export function Hero({ content, variant, experienceType, slug }: SectionProps) {
  const { hero } = content;
  // Per-occasion, immersive CTA (covers older experiences too).
  const ctaLabel = experienceType ? ctaLabelFor(experienceType) : hero.ctaLabel;
  // Scroll to the first content section after the hero.
  const target = "#mbr-explore";
  const media = slug ? heroMediaFor(slug, content) : {};
  const hasVideo = Boolean(media.video);
  const typeClass = experienceType ? ` mbr-hero--type-${experienceType}` : "";
  const nav = experienceType === "memorial" ? heroNav(content) : [];
  return (
    <header className={`mbr-hero mbr-hero--${variant}${hasVideo ? " mbr-hero--video" : ""}${typeClass}`} id="top">
      {hasVideo ? (
        <div className="mbr-hero__video" aria-hidden="true">
          <video autoPlay muted loop playsInline preload="auto" poster={media.poster}>
            <source src={media.video} type="video/mp4" />
          </video>
          <div className="mbr-hero__scrim" />
        </div>
      ) : (
        <div className="mbr-hero__bg" aria-hidden="true" />
      )}
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
      {nav.length > 0 && (
        <nav className="mbr-hero-nav" aria-label="Explore this tribute">
          {nav.map((n) => (
            <a className="mbr-hero-nav__item" href={n.href} key={n.href}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {HERO_NAV_ICONS[n.icon]}
              </svg>
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
      )}
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

export function Gallery({ content, variant, slug }: SectionProps) {
  // Prefer a curated gallery for this experience; fall back to content.
  const images = (slug ? galleryFor(slug) : undefined) ?? content.gallery;
  if (!images?.length) return null;
  return (
    <section className={`mbr-section mbr-gallery mbr-gallery--${variant}`} id="gallery">
      <div className="mbr-container">
        <h2 className="mbr-h2 mbr-center">Gallery</h2>
        <div className="mbr-gallery__grid">
          {images.map((g, i) => (
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
