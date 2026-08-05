// ── Merchant Capability Profiles ────────────────────────────────
// Every merchant Journey transacts with has a capability profile. It drives the
// protective warnings and shows the member only the capabilities that merchant
// actually supports. The DEFAULT profile is deliberately conservative: when we
// don't KNOW a merchant supports something we assume it doesn't and warn —
// protecting the member rather than making optimistic (unverified) claims.

export interface MerchantCapabilities {
  returns: boolean;
  exchanges: boolean;
  tracking: boolean;
  coupons: boolean;
  financing: boolean;
  warranty: boolean;
  priceMatching: boolean;
  subscriptionManagement: boolean;
  giftCards: boolean;
  storeCredit: boolean;
  loyaltyProgram: boolean;
  /** Internal: does the merchant credit prior purchases on an upgrade? Drives the
   *  "two separate charges" warning. Not shown as a customer-facing capability. */
  proratedBilling?: boolean;
}

export interface MerchantProfile {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  hours?: string;
  returnPolicy?: string;
  refundPolicy?: string;
  warranty?: string;
  capabilities: MerchantCapabilities;
  /** false = these details are conservative placeholders, not verified facts. */
  verified?: boolean;
}

export const NO_CAPABILITIES: MerchantCapabilities = {
  returns: false, exchanges: false, tracking: false, coupons: false, financing: false,
  warranty: false, priceMatching: false, subscriptionManagement: false, giftCards: false,
  storeCredit: false, loyaltyProgram: false, proratedBilling: false,
};

// Customer-facing capability labels (the internal proratedBilling is excluded).
export const CAPABILITY_LABELS: { key: keyof MerchantCapabilities; label: string }[] = [
  { key: "returns", label: "Returns" },
  { key: "exchanges", label: "Exchanges" },
  { key: "tracking", label: "Tracking" },
  { key: "coupons", label: "Coupons" },
  { key: "financing", label: "Financing" },
  { key: "warranty", label: "Warranty" },
  { key: "priceMatching", label: "Price matching" },
  { key: "subscriptionManagement", label: "Subscription management" },
  { key: "giftCards", label: "Gift cards" },
  { key: "storeCredit", label: "Store credit" },
  { key: "loyaltyProgram", label: "Loyalty program" },
];

// Known, VERIFIED merchants. Others get the conservative default until their real
// policies are confirmed through an approved integration (never invented).
const MERCHANTS: Record<string, MerchantProfile> = {
  "magical-moments": {
    id: "magical-moments",
    name: "Magical Moments by Reign",
    email: "info@magicalmomentsbyreign.com",
    website: "https://magicalmomentsbyreign.com",
    returnPolicy: "Membership changes and refunds are handled by your Concierge.",
    refundPolicy: "Handled by Concierge.",
    verified: true,
    capabilities: {
      returns: true, exchanges: true, tracking: false, coupons: true, financing: false,
      warranty: false, priceMatching: false, subscriptionManagement: true, giftCards: true,
      storeCredit: true, loyaltyProgram: true, proratedBilling: true,
    },
  },
};

/** Look up a merchant, or return a conservative default that triggers Journey's
 *  protective warnings (so we never optimistically claim unknown capabilities). */
export function getMerchant(id: string, name?: string): MerchantProfile {
  return MERCHANTS[id] || { id, name: name || id, capabilities: { ...NO_CAPABILITIES }, verified: false };
}

export function listMerchants(): MerchantProfile[] { return Object.values(MERCHANTS); }
