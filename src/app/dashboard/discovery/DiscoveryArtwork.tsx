"use client";
// Real artwork for a Discovery card, with a graceful fallback to the plain
// ✦ placeholder not just when the provider never returned an image URL
// (the original case) but also when a real URL was returned and the
// browser fails to actually load it (a dead/expired/blocked image link) —
// confirmed real defect: a broken image showed its raw alt text laid over
// the card's headline instead of falling back, for a "Worth Knowing
// Today" news story whose real imageUrl 404'd. Client-only (needs
// onError), so this can't live in the Server Component page itself — same
// pattern as Sports' own TeamLogo fix (TeamDirectory.tsx).

import { useState } from "react";
import Image from "next/image";

export default function Artwork({ src, alt, sizes }: { src?: string; alt: string; sizes: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="disc-lux__placeholder" aria-hidden="true">✦</div>;
  return <Image src={src} alt={alt} fill sizes={sizes} quality={90} className="disc-lux__image" onError={() => setFailed(true)} />;
}
