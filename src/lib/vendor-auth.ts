// ── Vendor authentication & portal guards (server) ──────────────
// Vendors sign in with the SAME Account + mmr_session foundation as everyone
// else — there is no second login system, cookie, or user table. This resolves
// the signed-in Account to its marketplace Vendor record (linking on a VERIFIED
// email match, one-to-one, audited), derives the portal status, and enforces
// section access server-side.
//
// SERVER ONLY.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentAccount, type CurrentAccount } from "@/lib/auth-session";
import { isStaffRole } from "@/lib/roles";
import { canonicalEmail } from "@/lib/account-identity";
import {
  portalStatus, allowedSections, canAccessSection,
  type VendorPortalState, type VendorPortalStatus, type PortalSection,
  type VendorMarketStatus, type VendorMembershipStatusLike,
} from "@/lib/vendor-portal";

const DAY = 24 * 60 * 60 * 1000;
const marketStatusOf = (s: string): VendorMarketStatus => {
  const v = s.toLowerCase();
  return (["pending", "approved", "rejected", "suspended", "removed"].includes(v) ? v : "pending") as VendorMarketStatus;
};
const membershipStatusOf = (s: string): VendorMembershipStatusLike => {
  const v = s.toLowerCase();
  return (["active", "inactive", "pending_verification", "suspended"].includes(v) ? v : "pending_verification") as VendorMembershipStatusLike;
};

export interface VendorContext {
  account: CurrentAccount;
  vendorId: string | null;      // null when applicant hasn't been converted to a Vendor yet
  applicationNumber: string | null;
  state: VendorPortalState;
  status: VendorPortalStatus;
  missingDocuments: string[];
  expiringDocuments: string[];
}

/**
 * Link a marketplace Vendor to this Account when the Account's VERIFIED primary
 * email matches the Vendor's email and the Vendor isn't already linked. One-to-
 * one: skips if this account already manages a vendor, and the update is guarded
 * on `accountId: null` to prevent a double-link race. Every link is audited.
 */
async function linkVendorByVerifiedEmail(account: CurrentAccount): Promise<string | null> {
  const already = await prisma.vendor.findFirst({ where: { accountId: account.id }, select: { id: true } });
  if (already) return already.id; // one-to-one — never link a second vendor

  const primary = await prisma.customerEmail.findFirst({
    where: { accountId: account.id, isPrimary: true, verified: true },
    select: { email: true },
  });
  if (!primary) return null; // only VERIFIED email may link

  const canon = canonicalEmail(primary.email);
  // Candidate: an unlinked vendor whose email matches (case-insensitively).
  const candidates = await prisma.vendor.findMany({ where: { accountId: null }, select: { id: true, email: true } });
  const match = candidates.find((v) => v.email && canonicalEmail(v.email) === canon);
  if (!match) return null;

  const res = await prisma.vendor.updateMany({ where: { id: match.id, accountId: null }, data: { accountId: account.id } });
  if (res.count === 0) return null; // lost the race — someone linked it first

  await Promise.all([
    prisma.customerAuditLog.create({ data: { accountId: account.id, actor: "system", action: "vendor_account_linked", detail: match.id } }).catch(() => {}),
    prisma.vendorMembershipEvent.create({ data: { vendorId: match.id, type: "account_linked", detail: `account ${account.customerId}` } }).catch(() => {}),
  ]);
  return match.id;
}

async function buildContext(account: CurrentAccount): Promise<VendorContext> {
  // Resolve (or link) the vendor record.
  let vendor = await prisma.vendor.findFirst({
    where: { accountId: account.id },
    select: {
      id: true, status: true, membershipStatus: true, membershipRenewalDate: true,
      agreementAcceptedAt: true, probationUntil: true, businessInfoVerified: true,
      credentials: { select: { required: true, provided: true, verified: true, expiresAt: true, kind: true } },
    },
  });
  if (!vendor) {
    const linkedId = await linkVendorByVerifiedEmail(account);
    if (linkedId) {
      vendor = await prisma.vendor.findUnique({
        where: { id: linkedId },
        select: {
          id: true, status: true, membershipStatus: true, membershipRenewalDate: true,
          agreementAcceptedAt: true, probationUntil: true, businessInfoVerified: true,
          credentials: { select: { required: true, provided: true, verified: true, expiresAt: true, kind: true } },
        },
      });
    }
  }

  // Applicant (no Vendor record yet): fall back to their application, matched by
  // the account's primary email.
  let applicationNumber: string | null = null;
  let applicationStatus: string | null = null;
  if (!vendor) {
    const primary = await prisma.customerEmail.findFirst({ where: { accountId: account.id, isPrimary: true }, select: { email: true } });
    if (primary) {
      const app = await prisma.vendorApplication.findFirst({
        where: { email: { equals: primary.email, mode: "insensitive" } },
        orderBy: { createdAt: "desc" }, select: { number: true, status: true },
      });
      if (app) { applicationNumber = app.number; applicationStatus = app.status; }
    }
  }

  const now = Date.now();
  const creds = vendor?.credentials ?? [];
  const required = creds.filter((c) => c.required);
  const expired = (d: Date | null | undefined) => !!d && d.getTime() < now;
  const missingDocuments = required.filter((c) => !c.provided).map((c) => credLabel(c.kind));
  const expiringDocuments = creds
    .filter((c) => c.provided && c.expiresAt && c.expiresAt.getTime() - now < 90 * DAY && c.expiresAt.getTime() > now)
    .map((c) => credLabel(c.kind));
  const complianceOk = required.length > 0
    ? required.every((c) => c.provided && c.verified && !expired(c.expiresAt))
    : !!vendor?.businessInfoVerified;

  const state: VendorPortalState = {
    marketStatus: vendor ? marketStatusOf(vendor.status) : "pending",
    membershipStatus: vendor ? membershipStatusOf(vendor.membershipStatus) : "pending_verification",
    hasPendingApplication: !vendor && applicationStatus === "NEW",
    additionalInfoRequested: applicationStatus === "REJECTED",
    agreementAccepted: !!vendor?.agreementAcceptedAt,
    complianceOk,
    onProbation: !!vendor?.probationUntil && vendor.probationUntil.getTime() > now,
    temporarilyInactive: vendor ? membershipStatusOf(vendor.membershipStatus) === "inactive" : false,
  };

  return {
    account, vendorId: vendor?.id ?? null, applicationNumber,
    state, status: portalStatus(state), missingDocuments, expiringDocuments,
  };
}

function credLabel(kind: string): string {
  const map: Record<string, string> = {
    business_info: "business information", business_license: "business license",
    gl_insurance: "General Liability Insurance", workers_comp: "Workers' Compensation documentation",
    certification: "professional certification", permit: "permit", w9: "W-9",
  };
  return map[kind] ?? kind.replace(/_/g, " ");
}

/** Require a signed-in VENDOR (or staff) and return their portal context. */
export async function requireVendor(next = "/vendors/dashboard"): Promise<VendorContext> {
  const account = await currentAccount();
  if (!account) redirect(`/vendors/login?next=${encodeURIComponent(next)}`);
  if (account.role !== "vendor" && !isStaffRole(account.role)) {
    redirect("/account?denied=vendor");
  }
  return buildContext(account);
}

/** Require access to a specific portal section (server-side gate). */
export async function requireVendorSection(section: PortalSection, next?: string): Promise<VendorContext> {
  const ctx = await requireVendor(next);
  if (!canAccessSection(ctx.status, section)) redirect("/vendors/dashboard?denied=section");
  return ctx;
}

export { allowedSections };
