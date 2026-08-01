"use client";

import { useRef } from "react";
import Link from "next/link";
import { INSPIRATION, type InspirationItem } from "@/lib/inspiration";

// The featured line-up, in the order they should appear.
const FEATURED_ORDER = ["italy2026", "babyolivia", "karlie2027", "rememberinggrandpajoe", "smithwedding"];
const FEATURED: InspirationItem[] = FEATURED_ORDER
  .map((slug) => INSPIRATION.find((i) => i.slug === slug))
  .filter((x): x is InspirationItem => Boolean(x));

function Card({ item }: { item: InspirationItem }) {
  const vRef = useRef<HTMLVideoElement>(null);
  const play = () => vRef.current?.play().catch(() => {});
  const stop = () => { const v = vRef.current; if (v) { v.pause(); v.currentTime = 0; } };

  return (
    <article className="feat-card" onMouseEnter={play} onMouseLeave={stop} onTouchStart={play}>
      <Link href={`/${item.slug}`} className="feat-card__media" aria-label={`View ${item.title}`}>
        {item.video ? (
          <video ref={vRef} muted loop playsInline preload="none" poster={item.poster}>
            <source src={item.video} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.poster} alt={item.title} loading="lazy" />
        )}
        <span className="feat-card__scrim" aria-hidden="true" />
        <span className="feat-card__kind">{item.emoji} {item.kind}</span>
      </Link>
      <div className="feat-card__body">
        <h3 className="feat-card__title">{item.title}</h3>
        <p className="feat-card__blurb">{item.blurb}</p>
        <Link href={`/${item.slug}`} className="feat-card__btn">View Live Experience →</Link>
      </div>
    </article>
  );
}

export default function FeaturedExperiences() {
  return (
    <section id="featured" className="feat">
      <div className="container">
        <div className="section-head--left">
          <span className="eyebrow">Featured experiences</span>
          <h2>Step inside a Magical Moment</h2>
          <p className="muted">
            Real experiences, brought to life. Hover to watch each one move — then
            step inside to see how a single moment becomes a living keepsake.
          </p>
        </div>
        <div className="feat-grid">
          {FEATURED.map((item) => <Card key={item.slug} item={item} />)}
          <Link href="/inspiration" className="feat-more">
            <span className="feat-more__icon" aria-hidden="true">✦</span>
            <span className="feat-more__title">Explore the<br />Inspiration Gallery</span>
            <span className="feat-more__cta">Browse all →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
