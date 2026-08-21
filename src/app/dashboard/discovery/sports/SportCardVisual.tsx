"use client";

import { useState } from "react";
import SportGlyph, { type SportGlyphKey } from "./SportGlyph";

/** Explore-grid card art: the real provider-returned league logo when one
 *  resolves, the original sport glyph otherwise — including a broken/expired
 *  remote URL discovered only at render time. Never three-letter text. */
export default function SportCardVisual({ src, alt, glyph }: { src?: string; alt: string; glyph: SportGlyphKey }) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src && (/^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src)));

  if (!usable || failed) return <SportGlyph sport={glyph} />;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src!} alt={alt} className="spx-card__logo" onError={() => setFailed(true)} />;
}
