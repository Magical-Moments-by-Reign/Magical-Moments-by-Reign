// ── Restaurant discovery — generic provider interface ───────────
//
// A provider-agnostic contract so any real restaurant-discovery source (Yelp
// today; others later) can slot in behind the same shape. The app only ever
// talks to this interface — it never learns which provider, and never sees an
// API key (keys live only inside the adapter, server-side).
//
// SCOPE: DISCOVERY ONLY — search, details, photos, categories, price, hours,
// ratings, location. Discovery is NOT booking: a real reservation still goes
// through the concierge, so nothing here fabricates availability, reservation
// times, or confirmation numbers.

export interface RestaurantSearchParams {
  /** City, address, or neighborhood. */
  location: string;
  /** Free-text keywords / cuisine, e.g. "italian", "steakhouse". */
  term?: string;
  /** Price levels to include, as 1–4 (maps to $–$$$$). */
  price?: number[];
  openNow?: boolean;
  /** Provider category aliases when known. */
  categories?: string[];
  sortBy?: "best_match" | "rating" | "review_count" | "distance";
  limit?: number;
  offset?: number;
}

/** A search-result summary — only fields a real provider actually returned. */
export interface RestaurantSummary {
  id: string;
  name: string;
  imageUrl?: string;
  /** Human category titles, e.g. ["Italian", "Wine Bars"]. */
  categories: string[];
  /** "$"–"$$$$" when the provider supplies it. */
  priceLevel?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  phone?: string;
  /** The provider's own page for this business (for attribution + details). */
  providerUrl?: string;
  distanceMeters?: number;
  isClosed?: boolean;
}

export interface RestaurantHours {
  day: string; // "Monday"
  start: string; // "1100"
  end: string; // "2200"
}

export interface RestaurantDetails extends RestaurantSummary {
  photos: string[];
  hours: RestaurantHours[];
  latitude?: number;
  longitude?: number;
  displayPhone?: string;
}

export interface RestaurantSearchResult {
  provider: string; // "Yelp"
  attribution: string; // "Powered by Yelp"
  businesses: RestaurantSummary[];
  total: number;
}

/** The contract every restaurant-discovery provider implements. */
export interface RestaurantProvider {
  /** Display name, e.g. "Yelp". */
  readonly name: string;
  /** Attribution string shown wherever this provider's data appears. */
  readonly attribution: string;
  /** True only when this provider is fully configured (has credentials). */
  isConfigured(): boolean;
  search(params: RestaurantSearchParams): Promise<RestaurantSearchResult | null>;
  details(id: string): Promise<RestaurantDetails | null>;
}
