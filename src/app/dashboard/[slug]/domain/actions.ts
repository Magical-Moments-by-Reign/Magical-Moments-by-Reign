"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logDomainEvent, markRestored } from "@/lib/domains";
import { registrarConfigured, renewDomain } from "@/lib/registrar";
import { squareServerConfigured } from "@/lib/square";

// These actions drive the customer's domain recovery buttons. Real
// charging/renewal happens through Square card-on-file + the registrar;
// when those aren't configured yet, the intent is recorded and the
// customer is told we'll follow up (no silent failures, no fake success).

export async function retryRenewalAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const slug = String(formData.get("slug") || "");
  if (!id) return;

  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return;

  if (!squareServerConfigured() || !registrarConfigured()) {
    await prisma.domain.update({ where: { id }, data: { status: "RESTORATION_PENDING", lastRenewalAttempt: new Date() } });
    await logDomainEvent(id, "RETRY_REQUESTED", "Customer requested retry — awaiting Square/registrar configuration");
    revalidatePath(`/dashboard/${slug}/domain`);
    return;
  }

  // TODO(production): charge Square card-on-file (idempotency key),
  // then renew via the registrar. Only mark restored on real success.
  const result = await renewDomain({ domain: domain.name });
  if (result.ok && result.expirationDate) {
    await markRestored(id, result.expirationDate);
  } else {
    await prisma.domain.update({ where: { id }, data: { status: "MANUAL_REVIEW" } });
    await logDomainEvent(id, "RETRY_FAILED", result.error);
  }
  revalidatePath(`/dashboard/${slug}/domain`);
}

export async function toggleAutoRenewAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const slug = String(formData.get("slug") || "");
  const next = String(formData.get("autoRenew")) === "true";
  if (!id) return;
  await prisma.domain.update({ where: { id }, data: { autoRenew: next } });
  await logDomainEvent(id, "AUTORENEW", next ? "Auto-renew enabled" : "Auto-renew disabled");
  revalidatePath(`/dashboard/${slug}/domain`);
}
