// ── Vendor Marketplace — pure domain ────────────────────────────
// "Connect with families celebrating life's biggest moments."
//
// A trusted-business marketplace that expands over time. This module is the
// PURE, testable core: the category catalog, the vendor-profile shape, review
// categories + rating math, browse/filter logic, the required Vendor Notice,
// vendor statuses, and the (disabled) future monetization tiers.
//
// Guardrails: vendors are INDEPENDENT businesses. Magical Moments never
// employs, supervises, endorses, warrants, or guarantees them, and is not
// financially responsible for vendor performance — surfaced via the required
// Vendor Notice before any contact/quote. No payments run through this module.
// Live listings/search need approved vendor data + storage (logo/gallery) —
// documented seams; nothing is faked (an empty marketplace shows an empty
// state, not invented vendors).

export interface VendorCategory {
  id: string;    // slug
  label: string;
}

const cat = (label: string): VendorCategory => ({
  id: label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  label,
});

// The launch catalog — additional categories may be added over time (admin).
export const VENDOR_CATEGORIES: VendorCategory[] = [
  "Wedding Venues", "Photographers", "Videographers", "Florists", "Wedding Planners",
  "Travel Agents", "Bakeries", "Cake Designers", "Party Decorators", "Balloon Artists",
  "Caterers", "DJ Services", "Bands", "Makeup Artists", "Hair Stylists", "Bartenders",
  "Photobooths", "Invitation Designers", "Event Rentals", "Luxury Picnic Companies",
  "Baby Shower Decor", "Gender Reveal Specialists", "Maternity Photographers",
  "Newborn Photographers", "Funeral Homes", "Celebration of Life Services", "Grief Counselors",
  "Limousine Services", "Luxury Transportation", "Hotels", "Vacation Rentals",
  "Cleaning Services", "Home Decor", "Moving Companies", "Pet Boarding", "Veterinary Clinics",
  "Personal Chefs", "Custom Gift Shops", "Custom Apparel", "Printing Services",
  "Nonprofits", "Churches", "Officiants",
].map(cat);

export function vendorCategory(id: string): VendorCategory | undefined {
  return VENDOR_CATEGORIES.find((c) => c.id === id);
}

// ── Vendor profile ──────────────────────────────────────────────
export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

export interface VendorProfile {
  id: string;
  businessName: string;
  logoUrl?: string;
  description: string;
  ownerName?: string;
  categoryId: string;
  city: string;
  state: string;
  serviceArea?: string;
  phone?: string;
  email?: string;
  website?: string;
  socials?: { platform: string; url: string }[];
  hours?: string;
  gallery?: string[];
  videos?: string[];
  services?: string[];
  pricing?: string;        // optional
  languages?: string[];
  yearsInBusiness?: number;
  licensed?: boolean;      // optional
  insured?: boolean;       // optional
  status: VendorStatus;
  featured: boolean;
  hidden: boolean;
  ratingAvg?: number;
  reviewCount?: number;
}

/** Only approved, non-hidden vendors are ever shown to customers. */
export function isPublicVendor(v: Pick<VendorProfile, "status" | "hidden">): boolean {
  return v.status === "approved" && !v.hidden;
}

// ── Reviews ─────────────────────────────────────────────────────
export const REVIEW_CATEGORIES = [
  { id: "communication", label: "Communication" },
  { id: "professionalism", label: "Professionalism" },
  { id: "quality", label: "Quality" },
  { id: "value", label: "Value" },
  { id: "punctuality", label: "Punctuality" },
  { id: "overall", label: "Overall Experience" },
] as const;

export type ReviewCategoryId = (typeof REVIEW_CATEGORIES)[number]["id"];

export interface VendorReviewInput {
  ratings: Partial<Record<ReviewCategoryId, number>>; // 1–5 per category
  overallRating: number;   // 1–5
  written?: string;
  photos?: string[];
  recommend: boolean;
}

const clampStar = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Average overall rating across reviews (0 when none). */
export function averageRating(reviews: { overallRating: number }[]): number {
  if (!reviews.length) return 0;
  return round1(reviews.reduce((s, r) => s + clampStar(r.overallRating), 0) / reviews.length);
}

/** Percent of reviewers who would recommend (0 when none). */
export function recommendRate(reviews: { recommend: boolean }[]): number {
  if (!reviews.length) return 0;
  return Math.round((reviews.filter((r) => r.recommend).length / reviews.length) * 100);
}

// ── Browse / filter ─────────────────────────────────────────────
export interface VendorFilter {
  category?: string;   // category id
  city?: string;
  state?: string;
  minRating?: number;  // 1–5
  query?: string;      // free text over name/description/services
}

/** Filter to the vendors a customer should see. Non-public vendors are excluded. */
export function filterVendors(vendors: VendorProfile[], f: VendorFilter): VendorProfile[] {
  const q = (f.query ?? "").trim().toLowerCase();
  const city = (f.city ?? "").trim().toLowerCase();
  const state = (f.state ?? "").trim().toLowerCase();
  return vendors
    .filter(isPublicVendor)
    .filter((v) => (f.category ? v.categoryId === f.category : true))
    .filter((v) => (city ? v.city.toLowerCase() === city : true))
    .filter((v) => (state ? v.state.toLowerCase() === state : true))
    .filter((v) => (f.minRating ? (v.ratingAvg ?? 0) >= f.minRating : true))
    .filter((v) => {
      if (!q) return true;
      const hay = [v.businessName, v.description, ...(v.services ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    })
    // Featured first, then by rating.
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
}

// ── Required Vendor Notice (before contact / quote) ─────────────
export const VENDOR_NOTICE = {
  title: "Vendor Notice",
  text:
    "Magical Moments by Reign provides this marketplace solely to connect customers with independent vendors. " +
    "Each vendor operates independently and is solely responsible for their services, pricing, contracts, products, scheduling, communication, and customer experience. " +
    "Magical Moments by Reign does not employ, supervise, endorse, warrant, or guarantee the work of any vendor listed on this platform. " +
    "Customers are encouraged to conduct their own research before hiring a vendor. " +
    "Customer reviews help us maintain the quality of our marketplace and may influence future vendor participation, but Magical Moments by Reign is not financially responsible for vendor performance, cancellations, damages, disputes, or any agreements made directly between customers and vendors. " +
    "By continuing, you acknowledge and accept these terms.",
  checkbox: "I understand and wish to continue.",
  cta: "Continue",
} as const;

/** A customer may proceed to contact/quote only after accepting the notice. */
export function canContactVendor(noticeAccepted: boolean): boolean {
  return noticeAccepted === true;
}

// ── Become a Vendor (landing copy) ──────────────────────────────
export const BECOME_A_VENDOR = {
  section: "Become a Vendor",
  tagline: "Connect with families celebrating life's biggest moments.",
  headline: "Grow Your Business with Magical Moments by Reign",
  body:
    "Thousands of families visit Magical Moments while planning weddings, birthdays, graduations, baby showers, memorials, vacations, and other special occasions. " +
    "Become a trusted vendor and showcase your services to customers looking for businesses like yours.",
  cta: "Become a Vendor Today",
} as const;

// ── Future monetization (built to add later; disabled today) ────
export interface VendorTier {
  id: string;
  label: string;
  enabled: boolean;
}
export const VENDOR_TIERS: VendorTier[] = [
  { id: "free", label: "Free Listing", enabled: false },
  { id: "premium", label: "Premium Listing", enabled: false },
  { id: "featured", label: "Featured Vendor", enabled: false },
  { id: "sponsored", label: "Sponsored Vendor", enabled: false },
  { id: "verified", label: "Verified Vendor", enabled: false },
];

export function activeVendorTiers(): VendorTier[] {
  return VENDOR_TIERS.filter((t) => t.enabled);
}
