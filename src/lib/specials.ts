// ── Admin Specials & Promotions Engine ──────────────────────────
// Founder-run promotions with hard Lifetime Value Protection. No special
// may become active until it passes validation + Founder approval. See
// docs/design-bible/STANDARD-admin-specials.md.
//
// Full spec (email/SMS, geo, per-customer analytics, revenue reporting,
// stacking rules, preview/test-customer mode) is phased; this first slice
// delivers create/schedule/pause/end + Lifetime Value Protection + an
// append-only audit log — enough to safely run a "Lifetime 30% off today".

import { prisma } from "@/lib/db";
import {
  LIFETIME_COLLECTIONS, quote, protectsLifetime, formatUSD, TERMS,
} from "@/lib/pricing-engine";

export const OFFER_TYPES = [
  { id: "percent", label: "Percentage discount" },
  { id: "fixed", label: "Fixed-dollar discount" },
  { id: "preview_extension", label: "Journey Preview extension" },
  { id: "custom", label: "Custom offer" },
];

export const SCOPES = [
  { id: "all", label: "All memberships" },
  { id: "recurring", label: "Recurring plans (Monthly/1yr)" },
  { id: "term", label: "Term plans (5yr/10yr)" },
  { id: "lifetime", label: "A Lifetime Collection" },
  { id: "journey", label: "A specific Journey" },
];

export const AUDIENCES = [
  { id: "all", label: "Everyone" },
  { id: "new", label: "New customers only" },
  { id: "existing", label: "Existing customers only" },
  { id: "upgrade", label: "Upgrade customers only" },
];

export const STATUSES = ["draft", "scheduled", "active", "paused", "ended"] as const;

export interface SpecialInput {
  name: string;
  internalNote?: string;
  publicDesc?: string;
  code?: string;
  auto?: boolean;
  offerType?: string;
  discountType?: string;
  discountValue?: number;
  scope?: string;
  scopeValue?: string;
  audience?: string;
  startAt?: string;
  endAt?: string;
  maxRedemptions?: number;
  perCustomer?: number;
  minPurchase?: number;
  stackable?: boolean;
  isPublic?: boolean;
}

export interface ProtectionConflict {
  collection: string;
  comparableBuild: string; // e.g. "10-year, 10 Journeys"
  wouldBe: number;         // discounted price
  floor: number;           // the Lifetime Collection price
}

export interface ValidationResult {
  ok: boolean;
  conflicts: ProtectionConflict[];
  note?: string;
}

/** Apply a special's discount to a base price (dollars). */
export function discountedPrice(base: number, discountType: string, discountValue: number): number {
  const v = Math.max(0, discountValue || 0);
  const out = discountType === "fixed" ? base - v : base * (1 - v / 100);
  return Math.max(0, Math.round(out * 100) / 100);
}

/**
 * Lifetime Value Protection. A promotion that touches recurring/term plans may
 * never make a lifetime-comparable build cheaper than the comparable Lifetime
 * Collection. Lifetime-scoped specials are intentional (allowed) but still
 * require Founder approval + an expiration. Returns any conflicts to surface.
 */
export function validateSpecial(input: SpecialInput): ValidationResult {
  const dtype = input.discountType || "percent";
  const dval = input.discountValue || 0;
  const scope = input.scope || "all";

  // Lifetime specials are allowed by intent (Founder may discount a Collection);
  // no protection conflict, but the UI requires approval + expiry.
  if (scope === "lifetime") {
    return { ok: true, conflicts: [], note: "Lifetime Collection special — allowed with Founder approval and a set expiration; upgrade credits are preserved." };
  }
  if (input.offerType === "preview_extension" || input.offerType === "custom") {
    return { ok: true, conflicts: [], note: "Non-price offer — no Lifetime conflict; still requires Founder approval." };
  }

  // Worst case for a recurring/term discount: the 10-year build at each
  // Collection's Journey cap (the highest-value non-lifetime purchase that
  // maps to that Collection). If a discount drops it below the Collection
  // price, Lifetime is no longer the best value → block.
  const conflicts: ProtectionConflict[] = [];
  for (const c of LIFETIME_COLLECTIONS) {
    if (!Number.isFinite(c.maxOccasions)) continue; // Magical Moments (all) — no finite cap to compare
    const cap = c.maxOccasions;
    const base = quote(cap, "10yr").total;
    const promo = discountedPrice(base, dtype, dval);
    const { ok, floor } = protectsLifetime(base, promo, cap);
    if (!ok) {
      conflicts.push({ collection: c.name, comparableBuild: `10-year, ${cap} Journeys`, wouldBe: promo, floor });
    }
  }
  return { ok: conflicts.length === 0, conflicts };
}

// ── CRUD + audit ─────────────────────────────────────────────────
const clean = (v?: string) => (v && v.trim() ? v.trim() : null);

async function audit(specialId: string, action: string, detail?: string, actor = "Founder") {
  await prisma.specialAudit.create({ data: { specialId, action, detail: detail ?? null, actor } });
}

export async function listSpecials() {
  return prisma.special.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getSpecial(id: string) {
  return prisma.special.findUnique({ where: { id }, include: { audits: { orderBy: { createdAt: "desc" } } } });
}

export async function createSpecial(input: SpecialInput): Promise<{ id?: string; error?: string; conflicts?: ProtectionConflict[] }> {
  const check = validateSpecial(input);
  if (!check.ok) {
    return { error: "Blocked by Lifetime Value Protection.", conflicts: check.conflicts };
  }
  const s = await prisma.special.create({
    data: {
      name: input.name.trim(),
      internalNote: clean(input.internalNote),
      publicDesc: clean(input.publicDesc),
      code: clean(input.code),
      auto: !!input.auto,
      offerType: input.offerType || "percent",
      discountType: input.discountType || "percent",
      discountValue: input.discountValue || 0,
      scope: input.scope || "all",
      scopeValue: clean(input.scopeValue),
      audience: input.audience || "all",
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
      maxRedemptions: input.maxRedemptions ?? null,
      perCustomer: input.perCustomer ?? null,
      minPurchase: input.minPurchase ?? null,
      stackable: !!input.stackable,
      isPublic: input.isPublic ?? true,
      status: "draft",
    },
  });
  await audit(s.id, "created", `${s.name} created as draft`);
  return { id: s.id };
}

/** Approve + publish (draft → scheduled/active). Re-validates first. */
export async function publishSpecial(id: string): Promise<{ error?: string; conflicts?: ProtectionConflict[] }> {
  const s = await prisma.special.findUnique({ where: { id } });
  if (!s) return { error: "Not found." };
  const check = validateSpecial(s as unknown as SpecialInput);
  if (!check.ok) {
    await audit(id, "blocked", "Publication blocked by Lifetime Value Protection");
    return { error: "Blocked by Lifetime Value Protection.", conflicts: check.conflicts };
  }
  const now = new Date();
  const status = s.startAt && s.startAt > now ? "scheduled" : "active";
  await prisma.special.update({ where: { id }, data: { approved: true, status } });
  await audit(id, "published", `Approved & ${status}`);
  return {};
}

export async function setSpecialStatus(id: string, status: string, reason?: string) {
  await prisma.special.update({ where: { id }, data: { status } });
  await audit(id, status === "paused" ? "paused" : status === "active" ? "resumed" : status === "ended" ? "ended" : "edited", reason);
}

/** Draft specials may be deleted; published ones are ended (never silently removed). */
export async function removeSpecial(id: string) {
  const s = await prisma.special.findUnique({ where: { id }, select: { status: true } });
  if (!s) return;
  if (s.status === "draft") {
    await prisma.special.delete({ where: { id } });
  } else {
    await setSpecialStatus(id, "ended", "Ended (delete requested on a published special)");
  }
}

/** The status a special should currently show, honoring start/end windows. */
export function effectiveStatus(s: { status: string; startAt: Date | null; endAt: Date | null }, now: Date): string {
  if (s.status === "draft" || s.status === "paused" || s.status === "ended") return s.status;
  if (s.endAt && s.endAt <= now) return "ended";
  if (s.startAt && s.startAt > now) return "scheduled";
  return "active";
}

export function describeOffer(s: { discountType: string; discountValue: number; offerType: string }): string {
  if (s.offerType === "preview_extension") return "Journey Preview extension";
  if (s.offerType === "custom") return "Custom offer";
  return s.discountType === "fixed" ? `${formatUSD(s.discountValue)} off` : `${s.discountValue}% off`;
}

export { formatUSD, TERMS };
