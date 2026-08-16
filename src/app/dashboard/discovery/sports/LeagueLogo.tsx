"use client";

import { useState } from "react";

export function LeagueLogo({ src, label, fallback }: { src?: string; label: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="sports-dark__fallback" aria-hidden="true">{fallback}</span>;
  // API-Sports owns and serves this league artwork; no copied trademark asset
  // is bundled with Magical Moments.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="sports-dark__league-logo" src={src} alt={`${label} logo`} onError={() => setFailed(true)} />;
}
