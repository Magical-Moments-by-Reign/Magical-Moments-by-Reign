"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
};

/** Provider artwork that fails closed into a quiet typographic treatment.
 * Remote catalog images can expire after the server render; handling the
 * browser error here ensures the product never exposes a broken image icon. */
export default function DiscoveryImage({ src, alt, className, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src && /^https?:\/\//i.test(src));

  if (!usable || failed) {
    return <span className={`${className ?? ""} discovery-image-fallback`} role="img" aria-label={alt}>{fallback ?? alt}</span>;
  }

  // Provider URLs are dynamic and are therefore intentionally rendered with
  // a native image rather than requiring an ever-growing Next host allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src!} alt={alt} className={className} onError={() => setFailed(true)} />;
}
