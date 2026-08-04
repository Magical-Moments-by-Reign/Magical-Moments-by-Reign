// ── Life Estate registry ────────────────────────────────────────
// The single place estates are registered. Estates are data (EstateConfig), so
// launching a new one is adding a config here — not building a new app. Home is
// the first, fully-realized flagship; others join as they're authored.

import type { EstateConfig } from "./types";
import { HOME_ESTATE } from "./home";

const ESTATES: Record<string, EstateConfig> = {
  home: HOME_ESTATE,
};

/** All registered estates, in display order. */
export function allEstates(): EstateConfig[] {
  return Object.values(ESTATES);
}

/** Look up an estate by key, or null if not registered / not yet launched. */
export function getEstate(key: string): EstateConfig | null {
  return ESTATES[key] ?? null;
}

/** True when an estate key is registered and live. */
export function isEstate(key: string): boolean {
  return key in ESTATES;
}
