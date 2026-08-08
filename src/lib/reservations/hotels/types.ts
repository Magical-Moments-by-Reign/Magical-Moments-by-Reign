// ── Hotel discovery — generic provider interface ────────────────
//
// Mirrors the RestaurantProvider architecture: a provider-agnostic contract so
// any hotel source (Expedia Rapid today; Booking.com, Hotels.com, Google
// Hotels later) slots in behind the same shape. The app only ever talks to
// this interface — it never learns which provider and never sees credentials.
//
// HONESTY: `sample` marks results that are NOT live availability (mock data
// used before credentials arrive). The UI must show sample data as examples,
// never as bookable inventory. When live, `sample` is false and an empty
// result means exactly that — "no hotels found", never fabricated inventory.

export interface Money {
  amount: number;
  currency: string;
}

export interface HotelSearchParams {
  /** Human-readable destination the member typed (display only). */
  location: string;
  /** Resolved provider destination code (internal). When present, providers
   *  use it directly instead of trying to parse the free-text location. */
  destinationCode?: string;
  /** The resolved destination's display name, e.g. "Miami, Florida". */
  destinationName?: string;
  checkIn?: string; // ISO date
  checkOut?: string; // ISO date
  guests?: number;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Star ratings to include, e.g. [4,5]. */
  starRatings?: number[];
  amenities?: string[];
  sortBy?: HotelSort;
  /** The requesting member's id — used only to build the Expedia
   *  Partner-Transaction-ID header (never sent to the client). */
  userId?: string;
}

export type HotelSort = "recommended" | "price_low" | "price_high" | "rating" | "stars";

export interface HotelSummary {
  /** Canonical provider slug, e.g. "expedia". Travels with the result. */
  provider: string;
  /** Provider-native property id. */
  id: string;
  name: string;
  address?: string;
  city?: string;
  thumbnail?: string;
  /** Star rating (property class), 1–5. */
  starRating?: number;
  /** Guest review score on a 10-point scale. */
  guestRating?: number;
  reviewCount?: number;
  /** Nightly rate, when the provider returned availability. */
  pricePerNight?: Money;
  /** Total stay price, when available. */
  totalPrice?: Money;
  amenities: string[];
  latitude?: number;
  longitude?: number;
}

export interface HotelRoomOption {
  name: string;
  price?: Money;
  refundable?: boolean;
}

export interface HotelDetails extends HotelSummary {
  images: string[];
  description?: string;
  amenitiesFull: string[];
  checkInTime?: string;
  checkOutTime?: string;
  rooms: HotelRoomOption[];
}

export interface HotelSearchResult {
  provider: string; // display name, e.g. "Expedia"
  attribution: string; // e.g. "Hotels provided by Expedia"
  /** TRUE when these are sample/mock results, not live availability. */
  sample: boolean;
  hotels: HotelSummary[];
  total: number;
}

/** The contract every hotel discovery/booking provider implements. */
export interface HotelProvider {
  readonly slug: string; // "expedia"
  readonly name: string; // "Expedia"
  readonly attribution: string; // "Hotels provided by Expedia"
  /** True only when LIVE credentials are configured. */
  isConfigured(): boolean;
  /** Search. Returns sample data (sample:true) until credentials arrive. */
  search(params: HotelSearchParams): Promise<HotelSearchResult | null>;
  details(id: string, params?: HotelSearchParams): Promise<HotelDetails | null>;
}
