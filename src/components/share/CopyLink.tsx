"use client";

import { useState } from "react";

export default function CopyLink({ url, compact }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className={`copylink${compact ? " copylink--compact" : ""}`}>
      <input value={url} readOnly onFocus={(e) => e.target.select()} />
      <button type="button" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
    </div>
  );
}
