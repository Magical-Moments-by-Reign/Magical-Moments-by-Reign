// ── Magical+ ecosystem ──────────────────────────────────────────
// The financial & membership layer for Magical Moments: Magical Wallet,
// Magical Credits, gift contributions, payment methods, Magical+
// membership, and a provider-agnostic Financing Gateway.
//
// IMPORTANT: Magical+ is NOT a bank or a lender. There is **no lending
// logic** here. This module is the flexible architecture the Founder asked
// for — pure, fully functional today (it computes balances/progress from
// data you pass in), and future-ready (financing providers register into
// a gateway without any redesign). Real persistence, earning, charging,
// and financing require the accounts + billing (Square) + provider
// foundations — until then nothing is faked (empty ledger = $0; no
// provider registered = no financing offer).

// ── Magical Credits ─────────────────────────────────────────────
export type CreditKind = "gift" | "promotional" | "reward" | "purchase";

export const CREDIT_KINDS: { id: CreditKind; label: string; earnedBy: string }[] = [
  { id: "gift", label: "Gift Credits", earnedBy: "Gifts & contributions from others" },
  { id: "promotional", label: "Promotional Credits", earnedBy: "Promotions & special events" },
  { id: "reward", label: "Reward Credits", earnedBy: "Referrals & loyalty" },
  { id: "purchase", label: "Purchase Credits", earnedBy: "Purchases" },
];

// ── Magical Wallet ──────────────────────────────────────────────
export type TxnType = CreditKind | "spend" | "adjustment";

export interface WalletTransaction {
  id: string;
  type: TxnType;
  /** USD; positive = added to wallet, negative = spent/removed */
  amount: number;
  note?: string;
  createdAt: string; // ISO
}

export interface Wallet {
  balance: number;
  byKind: Record<CreditKind, number>;
  transactions: WalletTransaction[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compute a wallet from its ledger. Balance never goes below zero. */
export function computeWallet(transactions: WalletTransaction[]): Wallet {
  const byKind: Record<CreditKind, number> = { gift: 0, promotional: 0, reward: 0, purchase: 0 };
  let balance = 0;
  for (const t of transactions) {
    balance += t.amount;
    if (t.amount > 0 && (t.type === "gift" || t.type === "promotional" || t.type === "reward" || t.type === "purchase")) {
      byKind[t.type] = round2(byKind[t.type] + t.amount);
    }
  }
  return { balance: round2(Math.max(0, balance)), byKind, transactions };
}

/** How much wallet credit may be applied to a purchase (never more than balance or price). */
export function applyableCredit(wallet: Wallet, price: number): number {
  return round2(Math.max(0, Math.min(wallet.balance, Math.max(0, price))));
}

// ── Gift contributions (group funding) ──────────────────────────
export interface Contribution { name: string; amount: number; at?: string; }
export interface GiftPool {
  experienceLabel: string;
  targetAmount: number;
  contributions: Contribution[];
}
export interface PoolProgress {
  raised: number;
  target: number;
  remaining: number;
  pct: number;      // 0–100
  unlocked: boolean; // true once raised >= target
}

export function poolProgress(pool: GiftPool): PoolProgress {
  const raised = round2(pool.contributions.reduce((s, c) => s + Math.max(0, c.amount), 0));
  const target = Math.max(0, pool.targetAmount);
  const remaining = round2(Math.max(0, target - raised));
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  return { raised, target, remaining, pct, unlocked: target > 0 && raised >= target };
}

// ── Payment methods (display catalog; processing = Square/seam) ──
export const PAYMENT_METHODS = [
  { id: "card", label: "Credit or debit card" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "google_pay", label: "Google Pay" },
  { id: "gift_credits", label: "Gift Credits" },
  { id: "wallet_credits", label: "Wallet Credits" },
] as const;

// ── Magical+ Financing Gateway (provider-agnostic) ──────────────
// A neutral abstraction so financing providers can be connected later
// WITHOUT hardcoding any one of them. Magical Moments never lends — the
// gateway only routes to approved third-party providers when present.
export interface FinancingOption {
  provider: string;        // provider id
  providerName: string;    // display name
  label: string;           // e.g. "4 payments of $62.25"
  detail?: string;
}

export interface FinancingProvider {
  id: string;
  name: string;
  /** True when the provider is configured/enabled (e.g. keys present). */
  isAvailable(): boolean;
  /** Return the plans this provider offers for an amount (USD). */
  quote(amountUSD: number): Promise<FinancingOption[]>;
}

const registry: FinancingProvider[] = [];

/** Register an approved financing provider. Called during app setup. */
export function registerFinancingProvider(provider: FinancingProvider): void {
  if (!registry.some((p) => p.id === provider.id)) registry.push(provider);
}

/** Any financing available at all? */
export function financingConfigured(): boolean {
  return registry.some((p) => p.isAvailable());
}

/**
 * The Magical+ Financing Gateway entry point. Aggregates options from every
 * available provider. Returns { available:false, options:[] } when none are
 * configured — it never invents an offer.
 */
export async function financingOptions(amountUSD: number): Promise<{ available: boolean; options: FinancingOption[] }> {
  const active = registry.filter((p) => p.isAvailable());
  if (active.length === 0 || amountUSD <= 0) return { available: false, options: [] };
  const results = await Promise.all(active.map((p) => p.quote(amountUSD).catch(() => [] as FinancingOption[])));
  return { available: true, options: results.flat() };
}

// ── Magical+ membership ─────────────────────────────────────────
export const MAGICAL_PLUS_PERKS = [
  "Special member pricing",
  "Reward Credits on purchases",
  "Exclusive invitation & gallery templates",
  "Priority support",
  "Future financing eligibility",
];

// ── Magical Tracker stages (canonical) ──────────────────────────
export const TRACKER_STAGES = [
  "Purchase Complete", "Payment Confirmed", "Experience Created", "Planning Started",
  "Invitations", "RSVP", "Gallery", "Completion Status",
] as const;

export function formatUSD(n: number): string {
  const r = round2(n);
  return Number.isInteger(r) ? `$${r.toLocaleString("en-US")}` : `$${r.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
