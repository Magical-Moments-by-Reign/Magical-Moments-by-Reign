// ── Custom domains + Legacy Protection ──────────────────────────
// Core rule: every experience ALWAYS has a permanent platform address
// (<slug>.magicalmomentsbyreign.com). A custom domain is an optional
// premium address layered on top. The platform address is never
// removed because a domain payment fails or a domain expires — the
// experience automatically falls back to it (Legacy Protection).

import { prisma } from "@/lib/db";
import type { PlanId } from "@/lib/plans";

export const PLATFORM_ROOT = "magicalmomentsbyreign.com";

// Full status lifecycle (see spec). Stored as strings for portability.
export const DOMAIN_STATUS = [
  "AVAILABLE",
  "PENDING_PURCHASE",
  "REGISTERED",
  "CONNECTING",
  "ACTIVE",
  "RENEWAL_DUE",
  "PAYMENT_FAILED",
  "GRACE_PERIOD",
  "EXPIRED",
  "USING_FALLBACK",
  "RESTORATION_PENDING",
  "RESTORED",
  "MANUAL_REVIEW",
] as const;
export type DomainStatus = (typeof DOMAIN_STATUS)[number];

export const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  PENDING_PURCHASE: "Pending purchase",
  REGISTERED: "Registered",
  CONNECTING: "Connecting",
  ACTIVE: "Active",
  RENEWAL_DUE: "Renewal due",
  PAYMENT_FAILED: "Payment failed",
  GRACE_PERIOD: "Grace period",
  EXPIRED: "Expired",
  USING_FALLBACK: "Using fallback",
  RESTORATION_PENDING: "Restoration pending",
  RESTORED: "Restored",
  MANUAL_REVIEW: "Manual review required",
};

/** Plans eligible for a custom domain. */
export function domainEligible(planId?: string | null): boolean {
  return planId === "diamond" || planId === "lifetime";
}

/** The permanent, never-deleted platform address for an experience. */
export function fallbackAddressFor(slug: string): string {
  return `${slug}.${PLATFORM_ROOT}`;
}

/** The address currently serving the experience (custom when active,
 *  otherwise the permanent platform address). */
export function activeAddressFor(d: {
  name: string;
  status: string;
  usingFallback: boolean;
  fallbackAddress: string;
}): string {
  const liveOnCustom = (d.status === "ACTIVE" || d.status === "RESTORED") && !d.usingFallback;
  return liveOnCustom ? d.name : d.fallbackAddress;
}

/** Statuses that mean the experience is currently served by the
 *  permanent platform address rather than the custom domain. */
export function isFallbackActive(status: string, usingFallback: boolean): boolean {
  return usingFallback || ["PAYMENT_FAILED", "GRACE_PERIOD", "EXPIRED", "USING_FALLBACK", "RESTORATION_PENDING"].includes(status);
}

// ── Audit log ───────────────────────────────────────────────────
export async function logDomainEvent(domainId: string, type: string, detail?: string) {
  await prisma.domainEvent.create({ data: { domainId, type, detail: detail ?? null } });
}

// ── Lifecycle ───────────────────────────────────────────────────
export interface CreateDomainInput {
  name: string;
  experienceId?: string;
  experienceSlug: string; // used to build the fallback address
  customerId?: string;
  orderId?: string;
  planId?: PlanId;
  renewalPrice?: number; // cents
  extension?: string;
  privacyProtection?: boolean;
}

export async function createDomainRecord(input: CreateDomainInput) {
  const domain = await prisma.domain.create({
    data: {
      name: input.name.toLowerCase().trim(),
      status: "PENDING_PURCHASE",
      experienceId: input.experienceId ?? null,
      customerId: input.customerId ?? null,
      orderId: input.orderId ?? null,
      planId: input.planId ?? null,
      fallbackAddress: fallbackAddressFor(input.experienceSlug),
      renewalPrice: input.renewalPrice ?? null,
      extension: input.extension ?? null,
      privacyProtection: input.privacyProtection ?? true,
    },
  });
  await logDomainEvent(domain.id, "CREATED", `Requested ${domain.name}`);
  return domain;
}

/** Mark a domain successfully registered + connected. */
export async function markRegistered(id: string, data: {
  registrar: string;
  registrarOrderId: string;
  registrationDate: Date;
  expirationDate: Date;
}) {
  const d = await prisma.domain.update({
    where: { id },
    data: {
      status: "ACTIVE",
      usingFallback: false,
      dnsStatus: "CONFIGURED",
      sslStatus: "ACTIVE",
      registrar: data.registrar,
      registrarOrderId: data.registrarOrderId,
      registrationDate: data.registrationDate,
      expirationDate: data.expirationDate,
      restoredAt: null,
    },
  });
  await logDomainEvent(id, "REGISTERED", `Registered via ${data.registrar}`);
  return d;
}

/** A renewal charge failed — protect content and fall back. Never deletes. */
export async function markPaymentFailed(id: string) {
  const d = await prisma.domain.update({
    where: { id },
    data: {
      status: "PAYMENT_FAILED",
      usingFallback: true,
      fallbackActivatedAt: new Date(),
      retryCount: { increment: 1 },
      lastRenewalAttempt: new Date(),
    },
  });
  await logDomainEvent(id, "PAYMENT_FAILED", "Renewal payment failed — Legacy Protection fallback active");
  return d;
}

/** A successful renewal (or restoration) reconnects the custom domain. */
export async function markRestored(id: string, expirationDate: Date) {
  const d = await prisma.domain.update({
    where: { id },
    data: {
      status: "RESTORED",
      usingFallback: false,
      dnsStatus: "CONFIGURED",
      sslStatus: "ACTIVE",
      expirationDate,
      restoredAt: new Date(),
      retryCount: 0,
    },
  });
  await logDomainEvent(id, "RESTORED", "Custom domain renewed and reconnected");
  return d;
}

export async function setDomainStatus(id: string, status: DomainStatus, detail?: string) {
  await prisma.domain.update({ where: { id }, data: { status } });
  await logDomainEvent(id, "STATUS", `${status}${detail ? ` — ${detail}` : ""}`);
}

// ── Customer-facing legal language (use verbatim per spec) ───────
export const DOMAIN_LANGUAGE =
  "Your Magical Moments experience and your custom domain are separate services. " +
  "Your experience remains available through its Magical Moments by Reign address " +
  "according to your preservation plan. Custom domains require separate registration and annual renewal.";

export const DOMAIN_LANGUAGE_LIFETIME =
  "Lifetime preservation is provided for the lifetime of the Magical Moments by Reign service, " +
  "subject to the Terms of Service, fair-use limits, storage allowances, and platform availability. " +
  "Custom-domain registration and renewal fees are separate.";

export const LEGACY_PROTECTION_MARKETING =
  "Your memories remain protected even if your custom-domain payment fails. Your experience " +
  "automatically stays available through its secure Magical Moments by Reign address until your " +
  "custom domain is restored.";
