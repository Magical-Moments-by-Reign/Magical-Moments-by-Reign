"use server";

// ── Server actions ──────────────────────────────────────────────
// Form-driven mutations for the master application.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createExperience, regenerateDesign } from "@/lib/experiences";
import { upsertGiftData } from "@/lib/gifts";
import { getCurrentFamily } from "@/lib/family";
import { getCurrentUserId } from "@/lib/session";

export async function createExperienceAction(formData: FormData): Promise<void> {
  const type = String(formData.get("type") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const subtitle = String(formData.get("subtitle") || "").trim();
  const desiredSlug = String(formData.get("slug") || "").trim();

  if (!type || !title) {
    redirect("/create?error=missing");
  }

  // Every Journey attaches to the Family Vault — nothing exists independently.
  const [ownerId, family] = await Promise.all([getCurrentUserId(), getCurrentFamily()]);
  const experience = await createExperience({
    type,
    title,
    subtitle: subtitle || undefined,
    desiredSlug: desiredSlug || undefined,
    ownerId,
    familyId: family.id,
  });

  // Optional Gifts & Registry — asked (never required) during setup.
  const giftMode = String(formData.get("giftMode") || "none");
  const opted = giftMode === "registry" || giftMode === "cash" || giftMode === "both";
  if (giftMode !== "none") {
    await upsertGiftData(experience.id, {
      mode: giftMode as "registry" | "cash" | "both" | "later",
      enabled: opted,
      visibility: "everyone",
      registries: [],
      cashMethods: [],
    });
  }

  revalidatePath("/dashboard");
  // If they opted into gifts, take them to fill in the details.
  redirect(opted ? `/dashboard/${experience.slug}/gifts` : `/${experience.slug}`);
}

export async function regenerateDesignAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) return;
  await regenerateDesign(slug);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}
