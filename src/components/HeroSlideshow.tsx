"use client";

// ── Hero slideshow ──────────────────────────────────────────────
// Cinematic, occasion-themed background slideshow for the home hero.
// - Autoplays and loops with slow crossfades + subtle Ken Burns motion
// - Manual navigation via progress dots
// - Pauses while the visitor interacts (hover / focus / dot click)
// - Respects prefers-reduced-motion (shows a single still poster)
// - Only the active slide's video plays, to stay light
//
// Adding more slides later = drop a new {src, poster, label} into the
// `slides` array passed from the page. No other change needed.

import { useEffect, useMemo, useRef, useState } from "react";

export interface HeroSlide {
  id: string;
  src: string;
  poster: string;
  label: string;
}

const SLIDE_MS = 8000;

export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Advance timer.
  useEffect(() => {
    if (reduced || paused || slides.length < 2) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [active, paused, reduced, slides.length]);

  // Play only the active slide's video.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active && !reduced) {
        v.currentTime = 0;
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [active, reduced]);

  return (
    <div
      className="hs"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div key={s.id} className={`hs__slide${i === active ? " is-active" : ""}`} aria-hidden={i !== active}>
          {reduced ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hs__media" src={s.poster} alt="" />
          ) : (
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              className="hs__media hs__media--video"
              muted
              loop
              playsInline
              preload={i === 0 ? "auto" : "metadata"}
              poster={s.poster}
            >
              <source src={s.src} type="video/mp4" />
            </video>
          )}
        </div>
      ))}

      <div className="hero__overlay" />

      {/* Occasion label + progress dots */}
      {slides.length > 1 && (
        <div className="hs__controls">
          <span className="hs__label">{slides[active].label}</span>
          <div className="hs__dots" role="tablist" aria-label="Hero slides">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Show ${s.label}`}
                className={`hs__dot${i === active ? " is-active" : ""}`}
                onClick={() => { setActive(i); setPaused(true); }}
              >
                <span className="hs__dot-fill" style={{ animationPlayState: i === active && !paused && !reduced ? "running" : "paused" }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
