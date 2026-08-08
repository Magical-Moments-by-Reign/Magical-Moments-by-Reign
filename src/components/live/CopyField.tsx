"use client";

import { useState } from "react";

// A read-only link field with a one-tap copy button. Used so the host can
// copy the secure Magical Moments join link without leaving the page.
export default function CopyField({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="lv-copy">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label="Secure join link" />
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* ignore */ }
        }}
      >
        {done ? "Copied ✓" : label}
      </button>
    </div>
  );
}
