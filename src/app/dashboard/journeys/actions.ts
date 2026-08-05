"use server";

// ── My Journeys — owner-scoped actions ──────────────────────────
// Every action re-validates the session and operates ONLY on Experiences that
// belong to the signed-in account (where: { accountId, ... }), so a member can
// never publish, duplicate, or delete another user's Journey. No emails or
// notifications are sent.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/guard";

const PATH = "/dashboard/journeys";

async function setStatus(slug: string, status: "DRAFT" | "PUBLISHED") {
  const account = await requireAccount(PATH);
  await prisma.experience.updateMany({ where: { slug, accountId: account.id }, data: { status } });
  revalidatePath(PATH);
}

export async function publishJourneyAction(formData: FormData): Promise<void> {
  await setStatus(String(formData.get("slug") || ""), "PUBLISHED");
}
export async function unpublishJourneyAction(formData: FormData): Promise<void> {
  await setStatus(String(formData.get("slug") || ""), "DRAFT");
}

export async function duplicateJourneyAction(formData: FormData): Promise<void> {
  const account = await requireAccount(PATH);
  const slug = String(formData.get("slug") || "");
  const src = await prisma.experience.findFirst({ where: { slug, accountId: account.id } });
  if (!src) return;
  const newSlug = `${src.slug}-copy-${randomBytes(3).toString("hex")}`;
  await prisma.experience.create({
    data: {
      slug: newSlug,
      type: src.type,
      title: `${src.title} (Copy)`,
      subtitle: src.subtitle,
      seed: `${newSlug}-seed`,
      status: "DRAFT",
      visibility: "PRIVATE",
      designSpec: src.designSpec,
      content: src.content,
      accountId: account.id,
    },
  });
  revalidatePath(PATH);
}

export async function deleteJourneyAction(formData: FormData): Promise<void> {
  const account = await requireAccount(PATH);
  const slug = String(formData.get("slug") || "");
  // Scoped delete — only ever removes the caller's own Journey.
  await prisma.experience.deleteMany({ where: { slug, accountId: account.id } });
  revalidatePath(PATH);
}
