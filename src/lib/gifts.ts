// ── Gifts & Registries ──────────────────────────────────────────
// Optional per Journey. The platform NEVER holds or processes funds —
// it stores only the customer's public registry links and payment
// handles, and routes guests to the customer's own app.

import { prisma } from "@/lib/db";

export interface Registry { label: string; url: string }
export interface CashMethod { platform: CashPlatform; handle: string }
export type CashPlatform = "venmo" | "cashapp" | "zelle" | "paypal";

export interface GiftData {
  enabled: boolean;
  mode: "none" | "registry" | "cash" | "both" | "later";
  registries: Registry[];
  cashMethods: CashMethod[];
  message: string;
  visibility: "everyone" | "invited" | "family" | "hidden";
}

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
    message: row.message ?? "",
    visibility: row.visibility as GiftData["visibility"],
  };
}

/** Should the gift section render on the PUBLIC experience page? */
export function showsPublicly(g: GiftData | null): boolean {
  if (!g || !g.enabled || g.visibility !== "everyone") return false;
  return g.registries.length > 0 || g.cashMethods.length > 0;
}

export async function upsertGiftData(experienceId: string, data: Partial<GiftData>) {
  const mode = data.mode ?? "none";
  const enabled = data.enabled ?? (mode === "registry" || mode === "cash" || mode === "both");
  return prisma.giftSettings.upsert({
    where: { experienceId },
    update: {
      enabled,
      mode,
      registries: JSON.stringify(data.registries ?? []),
      cashMethods: JSON.stringify(data.cashMethods ?? []),
      message: data.message ?? null,
      visibility: data.visibility ?? "everyone",
    },
    create: {
      experienceId,
      enabled,
      mode,
      registries: JSON.stringify(data.registries ?? []),
      cashMethods: JSON.stringify(data.cashMethods ?? []),
      message: data.message ?? null,
      visibility: data.visibility ?? "everyone",
    },
  });
}
