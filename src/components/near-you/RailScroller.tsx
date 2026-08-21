"use client";
// Thin horizontal-scroll wrapper with prev/next arrow buttons — used by the
// "Popular Near You" category rails. Pure UI chrome; the cards inside are
// passed as children and always come from real Ticketmaster data.

import { useRef } from "react";

export default function RailScroller({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 640), behavior: "smooth" });
  }

  return (
    <div className="near-popular__rail-wrap">
      <div className="near-popular__rail" ref={trackRef}>
        {children}
      </div>
      <button type="button" className="near-popular__arrow near-popular__arrow--prev" aria-label="Scroll left" onClick={() => scroll(-1)}>‹</button>
      <button type="button" className="near-popular__arrow near-popular__arrow--next" aria-label="Scroll right" onClick={() => scroll(1)}>›</button>
    </div>
  );
}
