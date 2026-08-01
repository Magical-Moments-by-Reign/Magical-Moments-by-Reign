"use client";

import { useRef } from "react";
import Link from "next/link";
import type { InspirationItem } from "@/lib/inspiration";

/** A showcase card that plays its film on hover (and on tap for touch),
 *  falling back to the poster still otherwise. Keeps the page light —
 *  videos only play when the visitor engages with a card. */
export default function InspirationCard({ item }: { item: InspirationItem }) {
  const vRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    const v = vRef.current;
    if (!v) return;
    v.play().catch(() => {});
  };
  const stop = () => {
    const v = vRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <Link
      href={`/${item.slug}`}
      className="insp-card"
      onMouseEnter={play}
      onMouseLeave={stop}
      onTouchStart={play}
    >
      <div className="insp-card__media">
        {item.video ? (
          <video
            ref={vRef}
            muted
            loop
            playsInline
            preload="none"
            poster={item.poster}
          >
            <source src={item.video} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.poster} alt={item.title} loading="lazy" />
        )}
        {item.video && <span className="insp-card__play" aria-hidden="true">▶</span>}
        <span className="insp-card__scrim" aria-hidden="true" />
      </div>
      <div className="insp-card__body">
        <span className="insp-card__kind">{item.emoji} {item.kind}</span>
        <h3 className="insp-card__title">{item.title}</h3>
        <p className="insp-card__blurb">{item.blurb}</p>
        <span className="insp-card__cta">View experience →</span>
      </div>
    </Link>
  );
}
