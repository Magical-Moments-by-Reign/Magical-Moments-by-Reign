"use client";

// Share a restaurant via the native share sheet, falling back to copying the
// link. Client-only; no data leaves the page except what the member shares.
import { useState } from "react";

export default function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      /* user cancelled — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — nothing else to do */
    }
  }
  return (
    <button type="button" className={className} onClick={share}>
      {copied ? "Link copied ✓" : "Share"}
    </button>
  );
}
