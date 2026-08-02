// ── Gifts & Registries ──────────────────────────────────────────
// Optional per Journey. The platform NEVER holds or processes funds —
// it stores only the customer's public registry links and payment
// handles, and routes guests to the customer's own app.

import { prisma } from "@/lib/db";

export interface Registry { label: string; url: string }
export interface CashMethod { platform: CashPlatform; handle: string }
export type CashPlatform = "venmo" | "cashapp" | "zelle" | "paypal";

export interface GiftItem {
  id: string;
  name: string;
  price?: string;
  store?: string;
  url?: string;
  image?: string;
  description?: string;
  qtyRequested?: number;
  priority?: "high" | "medium" | "low";
  purchased?: boolean;
}

export interface Charity {
  name: string;
  url?: string;
  cause?: string;
  goal?: string;
  raised?: string;
}

export interface GiftData {
  enabled: boolean;
  mode: "none" | "registry" | "cash" | "both" | "later";
  registries: Registry[];
  cashMethods: CashMethod[];
  items: GiftItem[];
  charity: Charity | null;
  message: string;
  visibility: "everyone" | "invited" | "family" | "hidden";
}

// ── Occasion-specific wording ────────────────────────────────────
// A reusable module across every experience type — the heading + intro
// adapt to the occasion so it never feels generic.
export interface GiftWording { eyebrow: string; heading: string; intro: string; }

const DEFAULT_WORDING: GiftWording = {
  eyebrow: "With love & gratitude",
  heading: "Gifts & Registry",
  intro: "For those who wish to give, our registries and gift options are below — but your presence is the greatest gift of all.",
};

const GIFT_WORDING: Record<string, GiftWording> = {
  wedding: { eyebrow: "With love & gratitude", heading: "Registry & Wedding Gifts", intro: "Your love and presence are the greatest gifts. For guests who would like to help us begin our next chapter, our registries are available below." },
  proposal: { eyebrow: "The next chapter", heading: "Registry & Wedding Gifts", intro: "For those who'd like to help us celebrate what's ahead, our gift options are below." },
  baby: { eyebrow: "For our little one", heading: "Baby Registry", intro: "We are preparing for our little one and are grateful for every gift, message, and act of love." },
  babyshower: { eyebrow: "For our little one", heading: "Baby Registry", intro: "We are preparing for our little one and are grateful for every gift, message, and act of love." },
  genderreveal: { eyebrow: "For our little one", heading: "Baby Registry", intro: "As we count down to the big reveal, here are a few ways to shower our little one with love." },
  birthday: { eyebrow: "Celebrate", heading: "Birthday Wishes & Gifts", intro: "Your presence means the most — but for those who'd like to give, here are a few favorite things." },
  firstbirthday: { eyebrow: "One whole year", heading: "Birthday Wishes & Gifts", intro: "Help us celebrate this milestone with a gift or a heartfelt message." },
  sweet16: { eyebrow: "Sixteen", heading: "Birthday Wishes & Gifts", intro: "For those who'd like to give, a few favorite things are below." },
  graduation: { eyebrow: "The next chapter", heading: "Celebrate the Graduate", intro: "Help support the graduate's next chapter with a gift, college contribution, or encouraging message." },
  newhome: { eyebrow: "Home sweet home", heading: "Housewarming Registry", intro: "Help us turn our new house into a home." },
  anniversary: { eyebrow: "Years of love", heading: "Anniversary Gifts", intro: "For those who'd like to celebrate the years with us, our gift options are below." },
  military: { eyebrow: "With gratitude", heading: "Support Their Journey", intro: "For those who'd like to send their support and love, here are a few ways to give." },
  memorial: { eyebrow: "In loving memory", heading: "Honor Their Memory", intro: "In place of flowers, the family welcomes donations to the selected cause." },
  vacation: { eyebrow: "The adventure ahead", heading: "Trip Contributions", intro: "For those who'd like to help make this trip unforgettable, here are a few ways to contribute." },
  reunion: { eyebrow: "Together again", heading: "Reunion Contributions", intro: "For those who'd like to chip in for our gathering, here are a few ways to give." },
  retirement: { eyebrow: "A new chapter", heading: "Retirement Wishes & Gifts", intro: "Help us celebrate this well-earned next chapter with a gift or a message." },
};

export function giftWording(type?: string): GiftWording {
  return (type && GIFT_WORDING[type]) || DEFAULT_WORDING;
}

export const PRIORITIES = [
  { id: "high", label: "Most wanted" },
  { id: "medium", label: "Would love" },
  { id: "low", label: "Nice to have" },
] as const;

export const GIFT_MODES = [
  { id: "none", label: "No gifts" },
  { id: "registry", label: "Traditional gift registry" },
  { id: "cash", label: "Cash gifts" },
  { id: "both", label: "Both registry & cash gifts" },
  { id: "later", label: "Add later" },
] as const;

export const VISIBILITY_OPTIONS = [
  { id: "everyone", label: "Everyone can contribute" },
  { id: "invited", label: "Only invited guests" },
  { id: "family", label: "Only family" },
  { id: "hidden", label: "Hidden for now" },
] as const;

export const CASH_PLATFORMS: { id: CashPlatform; label: string; placeholder: string; hint: string }[] = [
  { id: "venmo", label: "Venmo", placeholder: "@your-handle", hint: "Your Venmo username" },
  { id: "cashapp", label: "Cash App", placeholder: "$YourCashtag", hint: "Your $Cashtag" },
  { id: "zelle", label: "Zelle", placeholder: "email or phone", hint: "The email/phone linked to Zelle" },
  { id: "paypal", label: "PayPal", placeholder: "paypal.me/you or username", hint: "Your PayPal.Me link or username" },
];

export const REGISTRY_SUGGESTIONS = [
  "Amazon", "Target", "Walmart", "Babylist", "Pottery Barn",
  "Williams Sonoma", "Macy's", "Crate & Barrel",
];

/** A guest-facing link/instruction for a cash method. Zelle has no
 *  universal deep link, so we surface the handle to send to. */
export function cashLink(m: CashMethod): { href?: string; display: string } {
  const h = m.handle.trim();
  switch (m.platform) {
    case "venmo": {
      const u = h.replace(/^@/, "");
      return { href: `https://venmo.com/u/${encodeURIComponent(u)}`, display: `@${u}` };
    }
    case "cashapp": {
      const u = h.replace(/^\$/, "");
      return { href: `https://cash.app/$${encodeURIComponent(u)}`, display: `$${u}` };
    }
    case "paypal": {
      if (/paypal\.me\//i.test(h)) {
        const url = h.startsWith("http") ? h : `https://${h}`;
        return { href: url, display: h.replace(/^https?:\/\//, "") };
      }
      const u = h.replace(/^@/, "");
      return { href: `https://paypal.me/${encodeURIComponent(u)}`, display: `paypal.me/${u}` };
    }
    case "zelle":
    default:
      return { display: h }; // send-to handle, no deep link
  }
}

export function cashLabel(p: CashPlatform): string {
  return CASH_PLATFORMS.find((c) => c.id === p)?.label ?? p;
}

function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function getGiftData(experienceId: string): Promise<GiftData | null> {
  const row = await prisma.giftSettings.findUnique({ where: { experienceId } });
  if (!row) return null;
  return {
    enabled: row.enabled,
    mode: row.mode as GiftData["mode"],
    registries: parseJson<Registry[]>(row.registries, []),
    cashMethods: parseJson<CashMethod[]>(row.cashMethods, []),
    items: parseJson<GiftItem[]>(row.items ?? "[]", []),
    charity: row.charity ? parseJson<Charity | null>(row.charity, null) : null,
    message: row.message ?? "",
    visibility: row.visibility as GiftData["visibility"],
  };
}

/** Should the gift section render on the PUBLIC experience page? */
export function showsPublicly(g: GiftData | null): boolean {
  if (!g || !g.enabled || g.visibility !== "everyone") return false;
  return g.registries.length > 0 || g.cashMethods.length > 0 || g.items.length > 0 || !!g.charity?.name;
}

export async function upsertGiftData(experienceId: string, data: Partial<GiftData>) {
  const mode = data.mode ?? "none";
  const enabled = data.enabled ?? (mode === "registry" || mode === "cash" || mode === "both");
  const fields = {
    enabled,
    mode,
    registries: JSON.stringify(data.registries ?? []),
    cashMethods: JSON.stringify(data.cashMethods ?? []),
    items: JSON.stringify(data.items ?? []),
    charity: data.charity && data.charity.name ? JSON.stringify(data.charity) : null,
    message: data.message ?? null,
    visibility: data.visibility ?? "everyone",
  };
  return prisma.giftSettings.upsert({
    where: { experienceId },
    update: fields,
    create: { experienceId, ...fields },
  });
}
