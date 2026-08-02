"use client";

// Registers the PWA service worker after load. Kept tiny and side-effect
// only; no UI. Safe no-op where service workers are unavailable.
import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
