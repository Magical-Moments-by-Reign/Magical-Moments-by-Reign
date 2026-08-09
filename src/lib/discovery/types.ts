// ── Magical Discovery — shared types ─────────────────────────────
// One vocabulary every provider adapter, the cache layer, and the UI share.
// Nothing here is provider-specific — see providers/*.ts for those shapes.

export type DiscoveryCategory = "today" | "watch" | "movies" | "music" | "near_you" | "sports" | "trending";

/** Every provider reports its own reachability honestly — never assumed. */
export type ProviderStatus = "connected" | "not_connected" | "error";

export interface ProviderStatusReport {
  category: DiscoveryCategory;
  providerSlug: string;
  providerName: string;
  status: ProviderStatus;
  /** Human-readable detail, e.g. an error message or "no API key set". */
  detail: string;
  lastCheckedAt: string; // ISO
  /** Last time this provider's cache actually had fresh data, if ever. */
  lastUpdatedAt?: string; // ISO
}

/** Generic wrapper every category service function returns to the UI. */
export interface DiscoveryResult<T> {
  items: T[];
  /** "live" = just fetched from the provider; "cache" = served from cache;
   *  "unavailable" = no provider configured or the provider errored — the UI
   *  must show the honest pending state, never fabricated items. */
  source: "live" | "cache" | "unavailable";
  providerName?: string;
  attribution?: string;
  fetchedAt?: string; // ISO
}
