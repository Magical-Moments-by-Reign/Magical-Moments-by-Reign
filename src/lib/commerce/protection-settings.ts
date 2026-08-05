// ── Purchase Protection settings (client) ───────────────────────
// The member's protection configuration. Stored per-device in localStorage
// (portable to the profile later). Each toggle maps to an independent engine
// check, so protection can be tuned without code changes.

import { DEFAULT_SETTINGS, type ProtectionSettings, type Threshold } from "./protection";

const KEY = "mmr:protect-settings";

export const THRESHOLD_OPTIONS: { value: Threshold; label: string; hint: string }[] = [
  { value: "always", label: "Always ask", hint: "Confirm every purchase" },
  { value: "50", label: "$50+", hint: "Confirm at $50 or more" },
  { value: "100", label: "$100+", hint: "Confirm at $100 or more" },
  { value: "250", label: "$250+", hint: "Confirm at $250 or more" },
  { value: "500", label: "$500+", hint: "Confirm at $500 or more" },
  { value: "never", label: "Never ask", hint: "Journey still shows the review, but won't pause" },
];

// Toggles shown in settings. `soon` = requires setup not built yet.
export const TOGGLE_OPTIONS: { key: keyof ProtectionSettings; label: string; hint: string; soon?: boolean }[] = [
  { key: "duplicateDetection", label: "Duplicate purchase detection", hint: "Warn if you recently bought this" },
  { key: "subscriptionDetection", label: "Existing subscription detection", hint: "Warn about active subscriptions" },
  { key: "budgetWarnings", label: "Budget & high-value warnings", hint: "Flag large purchases" },
  { key: "financingSuggestions", label: "Financing suggestions", hint: "Mention financing when a merchant offers it" },
  { key: "cashbackSuggestions", label: "Cashback / payment tips", hint: "General rewards-card guidance" },
  { key: "notifications", label: "Purchase notifications", hint: "Notify me about purchase activity" },
  { key: "familyApproval", label: "Family approval required", hint: "A family member must approve", soon: true },
  { key: "biometric", label: "Biometric confirmation", hint: "Face/fingerprint to approve", soon: true },
];

export function loadSettings(): ProtectionSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...raw, threshold: validThreshold(raw.threshold) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s: ProtectionSettings): ProtectionSettings {
  const next = { ...DEFAULT_SETTINGS, ...s, threshold: validThreshold(s.threshold) };
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

function validThreshold(t: unknown): Threshold {
  return THRESHOLD_OPTIONS.some((o) => o.value === t) ? (t as Threshold) : "always";
}
