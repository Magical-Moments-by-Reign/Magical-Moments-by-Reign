// ── Purchase Concierge ──────────────────────────────────────────
// Helps customers organize, monitor, and manage purchases across every
// Life Journey. We never replace the merchant — the customer buys on the
// merchant's site, then connects the order here so it lives with the
// Journey it belongs to. Written against familyId so real multi-user
// permissions slot in later (same pattern as the Family Vault).

import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/family";

// Smart Order Tracking states (in order).
export const ORDER_STATUSES = [
  { id: "confirmed", label: "Order Confirmed" },
  { id: "preparing", label: "Preparing Shipment" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "delayed", label: "Delayed" },
  { id: "return_initiated", label: "Return Initiated" },
  { id: "completed", label: "Completed" },
] as const;

export function statusLabel(id: string): string {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? "Order Confirmed";
}

export const WISHLIST_CATEGORIES = [
  "Wedding", "Baby", "New Home", "Vacation", "Graduation", "Birthday", "General",
];

const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
const num = (v?: string) => {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export async function getPurchaseBundle() {
  const family = await getCurrentFamily();
  const [purchases, wishlist, journeys] = await Promise.all([
    prisma.purchase.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "desc" } }),
    prisma.wishlistItem.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "desc" } }),
    prisma.experience.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "desc" }, select: { slug: true, title: true } }),
  ]);
  return { family, purchases, wishlist, journeys };
}

export interface PurchaseInput {
  product: string; store?: string; orderDate?: string; estDelivery?: string;
  tracking?: string; price?: string; warranty?: string; returnWindow?: string;
  status?: string; notes?: string; experienceId?: string;
}

export async function savePurchase(input: PurchaseInput, id?: string) {
  const family = await getCurrentFamily();
  const data = {
    product: input.product.trim(),
    store: clean(input.store),
    orderDate: clean(input.orderDate),
    estDelivery: clean(input.estDelivery),
    tracking: clean(input.tracking),
    price: num(input.price),
    warranty: clean(input.warranty),
    returnWindow: clean(input.returnWindow),
    status: input.status || "confirmed",
    notes: clean(input.notes),
    experienceId: clean(input.experienceId),
  };
  if (id) {
    const existing = await prisma.purchase.findFirst({ where: { id, familyId: family.id }, select: { id: true } });
    if (existing) return prisma.purchase.update({ where: { id }, data });
  }
  return prisma.purchase.create({ data: { ...data, familyId: family.id } });
}

export async function setPurchaseStatus(id: string, status: string) {
  const family = await getCurrentFamily();
  await prisma.purchase.updateMany({ where: { id, familyId: family.id }, data: { status } });
}

export async function deletePurchase(id: string) {
  const family = await getCurrentFamily();
  await prisma.purchase.deleteMany({ where: { id, familyId: family.id } });
}

export async function addWishlistItem(input: { name: string; category?: string; store?: string; url?: string; price?: string; notes?: string }) {
  const family = await getCurrentFamily();
  return prisma.wishlistItem.create({
    data: {
      familyId: family.id,
      name: input.name.trim(),
      category: input.category || "General",
      store: clean(input.store),
      url: clean(input.url),
      price: num(input.price),
      notes: clean(input.notes),
    },
  });
}

export async function deleteWishlistItem(id: string) {
  const family = await getCurrentFamily();
  await prisma.wishlistItem.deleteMany({ where: { id, familyId: family.id } });
}

/** Purchases arriving within `days` — groundwork for delivery reminders. */
export function arrivingSoon(purchases: { product: string; estDelivery: string | null; status: string }[], now: Date, days = 7) {
  const horizon = now.getTime() + days * 24 * 60 * 60 * 1000;
  return purchases.filter((p) => {
    if (!p.estDelivery || p.status === "delivered" || p.status === "completed") return false;
    const d = new Date(p.estDelivery).getTime();
    return Number.isFinite(d) && d >= now.getTime() && d <= horizon;
  });
}

export function formatMoney(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
