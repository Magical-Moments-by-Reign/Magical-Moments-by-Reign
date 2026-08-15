"use client";
// Near You — one-time browser geolocation attempt (CLIENT ONLY). Runs only
// when the page has neither a typed `location` nor already-resolved
// `lat`/`lng` in the URL. On a real location, redirects to the same page
// with `lat`/`lng` set so the server component re-fetches with real
// coordinates — no permission prompt loop, no repeat requests once a
// coordinate (or a manual search) is present in the URL. Denial or an
// unsupported browser leaves the existing manual city/ZIP form as the only
// fallback — never blocks it, never fakes a location.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NearYouGeoDetect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (searchParams.get("location") || searchParams.get("lat")) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    let cancelled = false;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", pos.coords.latitude.toFixed(4));
        params.set("lng", pos.coords.longitude.toFixed(4));
        router.replace(`/dashboard/discovery/near-you?${params.toString()}`);
      },
      () => { if (!cancelled) setLocating(false); },
      { timeout: 8000, maximumAge: 600000 },
    );
    return () => { cancelled = true; };
  }, [router, searchParams]);

  if (!locating) return null;
  return <p className="disc-empty">Finding what&rsquo;s happening near you…</p>;
}
