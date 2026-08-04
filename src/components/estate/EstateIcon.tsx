// ── EstateIcon — champagne-gold custom line icons ───────────────
// The refined line-icon set used across Estate lobbies (no emojis in the
// luxury surfaces). Each icon is a hand-tuned SVG drawn in a single champagne
// stroke; the color comes from CSS (.dico { stroke: var(--est-champagne-deep) }),
// so these render consistently on ivory. Keys match Destination.icon.

import type { ReactElement } from "react";

const PATHS: Record<string, ReactElement> = {
  // Buy — a key, the start of a first home.
  buy: (
    <>
      <circle cx="9.5" cy="10" r="4" />
      <path d="M12.5 13 L21 21.5" />
      <path d="M18.5 19 L20.5 17" />
      <path d="M16.5 17 L18.5 15" />
    </>
  ),
  // Build — a rising roofline with framing.
  build: (
    <>
      <path d="M4 21 L14 7 L24 21" />
      <path d="M9 21 V14 M14 21 V11 M19 21 V14" />
    </>
  ),
  // Find — a magnifier discovering a home.
  find: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M17.2 17.2 L23 23" />
      <path d="M9.2 12.8 L12 10.2 L14.8 12.8 M10.3 12 V15 H13.7 V12" />
    </>
  ),
  // Sell — a home with a sign.
  sell: (
    <>
      <path d="M6 13 L13 7 L20 13 M8 12 V21 H18 V12" />
      <path d="M21 7 H25 V10 H21 M21 7 V13" />
    </>
  ),
  // Vacation — sun over gentle waves.
  vacation: (
    <>
      <circle cx="14" cy="9.5" r="3.4" />
      <path d="M14 3.2 V4.7 M7.6 9.5 H9.1 M18.9 9.5 H20.4 M9.5 5 L10.5 6 M18.5 5 L17.5 6" />
      <path d="M4 21 q3 -2.4 6 0 t6 0 t6 0" />
    </>
  ),
  // Renovate — a paint roller.
  renovate: (
    <>
      <rect x="6" y="7" width="11" height="5" rx="1" />
      <path d="M17 9.5 H20 V12.5 H15 M15 12.5 V15.5 H13 V22" />
    </>
  ),
  // Invest — an upward trend to a peak.
  invest: (
    <>
      <path d="M4 22 H24" />
      <path d="M5.5 19 L11 13.5 L15 16.5 L23 7.5" />
      <path d="M23 7.5 V12 M23 7.5 H18.5" />
    </>
  ),
  // Moving — a moving truck.
  moving: (
    <>
      <path d="M3 9 H15 V18 H3 Z" />
      <path d="M15 12 H19 L22 15 V18 H15" />
      <circle cx="7" cy="19" r="1.7" />
      <circle cx="18" cy="19" r="1.7" />
    </>
  ),
  // Maintain — a gear/sun, ongoing care.
  maintain: (
    <>
      <circle cx="14" cy="14" r="3.6" />
      <path d="M14 6.4 V4.4 M14 23.6 V21.6 M6.4 14 H4.4 M23.6 14 H21.6 M8.6 8.6 L7.2 7.2 M20.8 20.8 L19.4 19.4 M8.6 19.4 L7.2 20.8 M20.8 7.2 L19.4 8.6" />
    </>
  ),
};

export default function EstateIcon({ name, size = 40 }: { name: string; size?: number }) {
  const glyph = PATHS[name];
  if (!glyph) return null;
  return (
    <svg className="dico" viewBox="0 0 28 28" width={size} height={size} aria-hidden="true">
      {glyph}
    </svg>
  );
}
