"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
};

/** Provider artwork that fails closed into a quiet typographic treatment.
 * Remote catalog images can expire after the server render; handling the
 * browser error here ensures the product never exposes a broken image icon.
 *
 * Confirmed real defect this closes: on a server-rendered page, the browser
 * starts fetching a dead image URL the instant it parses the HTML — often
 * BEFORE React finishes hydrating and attaches this component's onError
 * listener. If the request already failed by then, that error event fires
 * into the void and onError never runs, permanently stuck showing the
 * browser's own native broken-image icon instead of our fallback. The
 * mount-time check below (ref + a fast decode() probe, with the classic
 * naturalWidth===0 check as a fallback for browsers/cases decode() can't
 * cover) catches exactly that missed race — same intent as onError, just
 * also covering the failure that already happened before we could listen
 * for it. */
export default function DiscoveryImage({ src, alt, className, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Provider artwork must be a real http(s) URL; a root-relative path
  // (e.g. "/discovery/leagues/nfl.png") is one of our own static assets,
  // not user- or provider-controlled, so it's equally safe to render —
  // excludes "//host/..." (protocol-relative, i.e. an external URL in
  // disguise) by requiring the second character not also be a slash.
  const usable = Boolean(src && (/^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src)));

  useEffect(() => {
    if (!usable) return;
    const el = imgRef.current;
    if (!el) return;
    if (el.complete && el.naturalWidth === 0) {
      setFailed(true);
      return;
    }
    // decode() resolves once the already-in-flight request settles, whether
    // that happens before or after this effect runs — catching a failure
    // that completes a moment after mount too, not just one already done.
    el.decode?.().catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!usable || failed) {
    return <span className={`${className ?? ""} discovery-image-fallback`} role="img" aria-label={alt}>{fallback ?? alt}</span>;
  }

  // Provider URLs are dynamic and are therefore intentionally rendered with
  // a native image rather than requiring an ever-growing Next host allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imgRef} src={src!} alt={alt} className={className} onError={() => setFailed(true)} />;
}
