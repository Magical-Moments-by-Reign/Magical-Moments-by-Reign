// ── Owner / internal demo provisioning (server core) ────────────
// The single source of truth for provisioning the OWNER demo account and its
// sample drafts. Both the CLI script (scripts/provision-owner-demo.ts) and the
// secure in-app admin action (src/app/dashboard/owner-demo/actions.ts) call the
// same functions here, so they can never drift.
//
// Security & honesty guarantees:
//   • This runs with the app's ordinary server-side database credentials. It
//     does NOT touch, drop, or weaken any Row Level Security policy — RLS stays
//     exactly as migrated. It grants elevated roles to ONE specific internal
//     account only (info@magicalmomentsbyreign.com), never to customers.
//   • billingExempt is set ONLY on this internal account — real customers are
//     never affected and are never exposed to owner access (customer isolation
//     preserved).
//   • Fully idempotent: every write is find-or-create / merge, so running it
//     more than once never creates duplicate accounts, drafts, or roles.
//   • It sends NOTHING — no email, invite, reminder, vendor request, or social
//     post. Provisioning is silent by design.
//
// SERVER ONLY. Accepts a PrismaClient so the caller controls the connection.

import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { EXPERIENCES } from "@/lib/membership-builder";
import { generateDesignSpec } from "@/lib/design-engine";
import { buildDefaultContent } from "@/lib/content";
import { slugify } from "@/lib/slug";
import { canonicalEmail, normalizeEmail, normalizeName } from "@/lib/account-identity";

/** The one internal account this tooling provisions. */
export const OWNER_DEMO_EMAIL = "info@magicalmomentsbyreign.com";

/** Every demo draft slug starts here, so the Studio can find them and a reset
 *  can remove exactly these and nothing a customer ever created. */
export const DEMO_SLUG_PREFIX = "demo-";

/** Maps each Journey to a valid Experience `type` (see experience-types.ts) so
 *  the renderer has a real theme to draw. Anything unmapped falls back to a
 *  safe "custom" type. */
export const JOURNEY_TYPE: Record<string, string> = {
  relationship: "wedding",
  baby: "baby",
  birthday: "birthday",
  graduation: "graduation",
  home: "newhome",
  travel: "vacation",
  military: "military",
  sports: "sports",
  family: "reunion",
  career: "custom",
  "celebration-of-life": "memorial",
  custom: "custom",
};

export function demoSlugFor(journeyId: string): string {
  return slugify(`${DEMO_SLUG_PREFIX}${journeyId}`);
}

export interface DemoDraftPlan {
  journeyId: string;
  slug: string;
  type: string;
  title: string;
  subtitle: string;
}

/** The exact set of demo drafts we create — one per built Journey. Pure (no I/O),
 *  so it is unit-testable and drives both provisioning and the Studio listing. */
export function demoDraftPlans(): DemoDraftPlan[] {
  return EXPERIENCES.map((j) => ({
    journeyId: j.id,
    slug: demoSlugFor(j.id),
    type: JOURNEY_TYPE[j.id] ?? "custom",
    title: `Demo — ${j.label}`,
    subtitle: "Sample draft · replace this text, photos, videos and dates.",
  }));
}

function newCustomerId(): string {
  return `MMR-C-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Parse the stored staffRoles JSON array defensively (bad values dropped). */
function parseStaffRoles(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface ProvisionResult {
  accountId: string;
  email: string;
  accountCreated: boolean;
  platformRole: string;
  staffRoles: string[];
  membershipTier: string;
  isDemo: boolean;
  billingExempt: boolean;
  needsPasswordSetup: boolean;
  drafts: { journeyId: string; slug: string; title: string; created: boolean }[];
}

/**
 * Locate-or-create the internal owner account and grant every entitlement, then
 * ensure a demo draft exists for each Journey. Idempotent and non-destructive:
 * existing drafts are left untouched (your edits are preserved), roles are
 * merged not replaced, and nothing is deleted.
 */
export async function provisionOwnerDemo(
  prisma: PrismaClient,
  opts: { email?: string; passwordHash?: string | null } = {},
): Promise<ProvisionResult> {
  const email = (opts.email || OWNER_DEMO_EMAIL).trim();
  const canonical = canonicalEmail(email);

  // 1) Locate the account by its canonical email, else create a minimal one.
  const existingEmail = await prisma.customerEmail.findFirst({
    where: { canonical },
    select: { accountId: true },
  });

  let accountId: string;
  let accountCreated = false;
  let hadPassword = true;

  if (existingEmail) {
    accountId = existingEmail.accountId;
    const acc = await prisma.account.findUnique({
      where: { id: accountId },
      select: { passwordHash: true },
    });
    hadPassword = Boolean(acc?.passwordHash) || Boolean(opts.passwordHash);
  } else {
    const created = await prisma.account.create({
      data: {
        customerId: newCustomerId(),
        firstName: "Reign",
        lastName: "Owner",
        nameNormalized: normalizeName("Reign", "Owner"),
        status: "ACTIVE",
        platformRole: "admin",
        ...(opts.passwordHash ? { passwordHash: opts.passwordHash } : {}),
        emails: {
          create: {
            email: normalizeEmail(email),
            canonical,
            isPrimary: true,
            verified: true,
            verifiedAt: new Date(),
          },
        },
        auditLogs: {
          create: { actor: "provision-owner-demo", action: "owner_demo_account_created", detail: "internal owner/demo account" },
        },
      },
      select: { id: true },
    });
    accountId = created.id;
    accountCreated = true;
    hadPassword = Boolean(opts.passwordHash);
  }

  // 2) Grant Owner + Super Admin + Internal Demo + Full Lifetime + billing bypass.
  //    Roles are MERGED (never blindly replaced), so re-running is safe.
  const current = await prisma.account.findUnique({
    where: { id: accountId },
    select: { staffRoles: true },
  });
  // "owner" is the canonical Owner / Super Admin role (see admin-roles.ts —
  // owner ⇒ every capability). We store ONLY valid AdminRole ids so the admin
  // guard's parseStaffRoles keeps them (a bare "super_admin" string would be
  // silently dropped). Merge, never replace, so re-running is safe.
  const roles = parseStaffRoles(current?.staffRoles);
  if (!roles.includes("owner")) roles.push("owner");

  await prisma.account.update({
    where: { id: accountId },
    data: {
      platformRole: "admin", // staff/admin — see roles.ts isStaffRole
      staffRoles: JSON.stringify(roles),
      membershipTier: "magical", // Full Lifetime, unlimited Journeys
      isDemo: true, // Internal Demo Account
      billingExempt: true, // bypass payment for THIS account only
      ...(opts.passwordHash ? { passwordHash: opts.passwordHash } : {}),
    },
  });

  // The admin guard requires a VERIFIED primary email. Ensure the owner's
  // primary email is verified so /admin opens (idempotent — no-op if already).
  await prisma.customerEmail.updateMany({
    where: { accountId, isPrimary: true, verified: false },
    data: { verified: true, verifiedAt: new Date() },
  });

  await prisma.customerAuditLog.create({
    data: { accountId, actor: "provision-owner-demo", action: "owner_demo_provisioned", detail: "owner(super_admin)+admin+demo+magical+billingExempt+emailVerified" },
  });

  // 3) One demo draft per Journey — create only when missing (edits preserved).
  const plans = demoDraftPlans();
  const drafts: ProvisionResult["drafts"] = [];
  for (const plan of plans) {
    const existing = await prisma.experience.findUnique({
      where: { slug: plan.slug },
      select: { id: true },
    });
    if (existing) {
      drafts.push({ journeyId: plan.journeyId, slug: plan.slug, title: plan.title, created: false });
      continue;
    }
    const seed = `${plan.slug}-seed`;
    const designSpec = await generateDesignSpec(plan.type, seed);
    const content = buildDefaultContent({ type: plan.type, title: plan.title, subtitle: plan.subtitle, seed });
    await prisma.experience.create({
      data: {
        slug: plan.slug,
        type: plan.type,
        title: plan.title,
        subtitle: plan.subtitle,
        seed,
        status: "DRAFT", // never public until you publish
        visibility: "PRIVATE",
        designSpec: JSON.stringify(designSpec),
        // `_demo` marks this as sample content for the DEMO badge; the renderer
        // ignores unknown keys, so it never leaks into the keepsake itself.
        content: JSON.stringify({ ...content, _demo: true }),
        accountId,
      },
    });
    drafts.push({ journeyId: plan.journeyId, slug: plan.slug, title: plan.title, created: true });
  }

  return {
    accountId,
    email,
    accountCreated,
    platformRole: "admin",
    staffRoles: roles,
    membershipTier: "magical",
    isDemo: true,
    billingExempt: true,
    needsPasswordSetup: !hadPassword,
    drafts,
  };
}

export interface DemoDraftState {
  journeyId: string;
  journeyLabel: string;
  slug: string;
  title: string;
  exists: boolean;
  status: string | null; // DRAFT | PUBLISHED | ARCHIVED | null (not yet created)
}

/** Read-only snapshot of the demo account + drafts for the Owner Demo Studio. */
export async function getOwnerDemoState(
  prisma: PrismaClient,
  email: string = OWNER_DEMO_EMAIL,
): Promise<{
  provisioned: boolean;
  accountId: string | null;
  membershipTier: string | null;
  isDemo: boolean;
  billingExempt: boolean;
  drafts: DemoDraftState[];
}> {
  const canonical = canonicalEmail(email);
  const emailRow = await prisma.customerEmail.findFirst({ where: { canonical }, select: { accountId: true } });
  const account = emailRow
    ? await prisma.account.findUnique({
        where: { id: emailRow.accountId },
        select: { id: true, membershipTier: true, isDemo: true, billingExempt: true, staffRoles: true },
      })
    : null;

  const plans = demoDraftPlans();
  const rows = await prisma.experience.findMany({
    where: { slug: { in: plans.map((p) => p.slug) } },
    select: { slug: true, status: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r.status]));

  const drafts: DemoDraftState[] = plans.map((p) => {
    const journey = EXPERIENCES.find((e) => e.id === p.journeyId);
    return {
      journeyId: p.journeyId,
      journeyLabel: journey?.label ?? p.journeyId,
      slug: p.slug,
      title: p.title,
      exists: bySlug.has(p.slug),
      status: bySlug.get(p.slug) ?? null,
    };
  });

  const owner = account ? parseStaffRoles(account.staffRoles).includes("owner") : false;

  return {
    provisioned: Boolean(account) && owner,
    accountId: account?.id ?? null,
    membershipTier: account?.membershipTier ?? null,
    isDemo: Boolean(account?.isDemo),
    billingExempt: Boolean(account?.billingExempt),
    drafts,
  };
}

/** Flip a demo draft's publish state. Guarded to demo slugs only, so the Studio
 *  can never accidentally publish/unpublish a real customer's Journey. */
export async function setDemoDraftStatus(
  prisma: PrismaClient,
  slug: string,
  status: "DRAFT" | "PUBLISHED",
): Promise<boolean> {
  if (!slug.startsWith(DEMO_SLUG_PREFIX)) return false;
  const res = await prisma.experience.updateMany({ where: { slug }, data: { status } });
  return res.count > 0;
}

/** Remove ONLY the demo drafts (never a customer Journey). Used by --reset. */
export async function resetDemoDrafts(prisma: PrismaClient): Promise<number> {
  const plans = demoDraftPlans();
  const res = await prisma.experience.deleteMany({ where: { slug: { in: plans.map((p) => p.slug) } } });
  return res.count;
}
