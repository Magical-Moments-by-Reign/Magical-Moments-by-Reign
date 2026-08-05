// ── Purchase Protection settings (client) ───────────────────────
// The member's protection threshold — when Journey pauses to make them confirm.
// Stored per-device in localStorage (portable to the profile later).

import type { Threshold } from "./protection";

const KEY = "mmr:protect-threshold";

export const THRESHOLD_OPTIONS: { value: Threshold; label: string; hint: string }[] = [
  { value: "always", label: "Always ask", hint: "Confirm every purchase" },
  { value: "50", label: "$50+", hint: "Confirm at $50 or more" },
  { value: "100", label: "$100+", hint: "Confirm at $100 or more" },
  { value: "250", label: "$250+", hint: "Confirm at $250 or more" },
  { value: "500", label: "$500+", hint: "Confirm at $500 or more" },
  { value: "never", label: "Never ask", hint: "Journey still shows the review, but won't pause" },
];

export function loadThreshold(): Threshold {
  if (typeof window === "undefined") return "always";
  const v = window.localStorage.getItem(KEY) as Threshold | null;
  return THRESHOLD_OPTIONS.some((o) => o.value === v) ? (v as Threshold) : "always";
}

export function saveThreshold(t: Threshold): void {
  try { window.localStorage.setItem(KEY, t); } catch { /* ignore */ }
}
