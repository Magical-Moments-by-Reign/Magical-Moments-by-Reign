// ── Merchant Capability Profiles ────────────────────────────────
// Every merchant Journey transacts with has a capability profile. It drives the
// protective warnings (e.g. "no prorated upgrades → two charges") and the
// contact/return surfaces. The DEFAULT profile is deliberately conservative:
// when we don't KNOW a merchant supports something, we assume it doesn't and
// warn — protecting the member rather than making optimistic claims.

export interface MerchantCapabilities {
  subscriptionUpgrades: boolean;
  proratedBilling: boolean;
  exchanges: boolean;
  refunds: boolean;
  returns: boolean;
  coupons: boolean;
  splitPayments: boolean;
  liveChat: boolean;
  emailSupport: boolean;
  phoneSupport: boolean;
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
  /** false = these details are placeholders, not verified merchant facts. */
  verified?: boolean;
}

export const NO_CAPABILITIES: MerchantCapabilities = {
  subscriptionUpgrades: false, proratedBilling: false, exchanges: false, refunds: false,
  returns: false, coupons: false, splitPayments: false, liveChat: false, emailSupport: false, phoneSupport: false,
};

export const CAPABILITY_LABELS: { key: keyof MerchantCapabilities; label: string }[] = [
  { key: "subscriptionUpgrades", label: "Subscription upgrades" },
  { key: "proratedBilling", label: "Prorated billing" },
  { key: "exchanges", label: "Exchanges" },
  { key: "refunds", label: "Refunds" },
  { key: "returns", label: "Returns" },
  { key: "coupons", label: "Coupons" },
  { key: "splitPayments", label: "Split payments" },
  { key: "liveChat", label: "Live chat" },
  { key: "emailSupport", label: "Email support" },
  { key: "phoneSupport", label: "Phone support" },
];

// Known merchants. Only our own is marked verified; others get a conservative
// default until their real policies are confirmed (never invented).
const MERCHANTS: Record<string, MerchantProfile> = {
  "magical-moments": {
    id: "magical-moments",
    name: "Magical Moments by Reign",
    email: "info@magicalmomentsbyreign.com",
    website: "https://magicalmomentsbyreign.com",
    returnPolicy: "See your membership terms.",
    refundPolicy: "Handled by Concierge.",
    verified: true,
    capabilities: {
      subscriptionUpgrades: true, proratedBilling: true, exchanges: true, refunds: true,
      returns: true, coupons: true, splitPayments: false, liveChat: true, emailSupport: true, phoneSupport: false,
    },
  },
};

/** Look up a merchant, or return a conservative default that triggers Journey's
 *  protective warnings (so we never optimistically claim unknown capabilities). */
export function getMerchant(id: string, name?: string): MerchantProfile {
  return MERCHANTS[id] || { id, name: name || id, capabilities: { ...NO_CAPABILITIES }, verified: false };
}

export function listMerchants(): MerchantProfile[] { return Object.values(MERCHANTS); }
