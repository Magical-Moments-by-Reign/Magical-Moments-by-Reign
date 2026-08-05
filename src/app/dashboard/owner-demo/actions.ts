"use server";

// ── Owner Demo Studio — server actions ──────────────────────────
// Every action here is gated by requireOwner() (re-validated against the DB) and
// scoped to demo content only. Nothing is destructive to customer data, and
// nothing sends any email, notification, invite, vendor request, or social post.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guard";
import {
  provisionOwnerDemo,
  setDemoDraftStatus,
  resetDemoDrafts,
  DEMO_SLUG_PREFIX,
} from "@/lib/owner-demo";

const STUDIO = "/dashboard/owner-demo";

/**
 * The in-app "re-sync / repair" of the owner demo (roles + any missing drafts).
 * Owner-only. The FIRST-EVER provisioning is done with the CLI script
 * (scripts/provision-owner-demo.ts) since there is no owner to authorize this
 * button until that has run once. Idempotent — safe to press repeatedly.
 */
export async function reprovisionOwnerDemoAction(): Promise<void> {
  await requireOwner(STUDIO);
  await provisionOwnerDemo(prisma);
  revalidatePath(STUDIO);
}

export async function publishDemoDraftAction(formData: FormData): Promise<void> {
  await requireOwner(STUDIO);
  const slug = String(formData.get("slug") || "");
  if (slug.startsWith(DEMO_SLUG_PREFIX)) await setDemoDraftStatus(prisma, slug, "PUBLISHED");
  revalidatePath(STUDIO);
}

export async function unpublishDemoDraftAction(formData: FormData): Promise<void> {
  await requireOwner(STUDIO);
  const slug = String(formData.get("slug") || "");
  if (slug.startsWith(DEMO_SLUG_PREFIX)) await setDemoDraftStatus(prisma, slug, "DRAFT");
  revalidatePath(STUDIO);
}

/** Remove ONLY the demo drafts (never a customer Journey). */
export async function resetDemoDraftsAction(): Promise<void> {
  await requireOwner(STUDIO);
  await resetDemoDrafts(prisma);
  revalidatePath(STUDIO);
}
