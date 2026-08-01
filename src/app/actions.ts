"use server";

// ── Server actions ──────────────────────────────────────────────
// Form-driven mutations for the master application.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createExperience, regenerateDesign } from "@/lib/experiences";

export async function createExperienceAction(formData: FormData): Promise<void> {
  const type = String(formData.get("type") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const subtitle = String(formData.get("subtitle") || "").trim();
  const desiredSlug = String(formData.get("slug") || "").trim();

  if (!type || !title) {
    redirect("/create?error=missing");
  }

  const experience = await createExperience({
    type,
    title,
    subtitle: subtitle || undefined,
    desiredSlug: desiredSlug || undefined,
  });

  revalidatePath("/dashboard");
  redirect(`/${experience.slug}`);
}

export async function regenerateDesignAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) return;
  await regenerateDesign(slug);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}
