"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { upsertGiftData, type Registry, type CashMethod } from "@/lib/gifts";

export async function saveGiftsAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") || "");
  const exp = await prisma.experience.findUnique({ where: { slug }, select: { id: true } });
  if (!exp) redirect("/dashboard");

  let registries: Registry[] = [];
  let cashMethods: CashMethod[] = [];
  try { registries = JSON.parse(String(formData.get("registries") || "[]")); } catch { /* ignore */ }
  try { cashMethods = JSON.parse(String(formData.get("cashMethods") || "[]")); } catch { /* ignore */ }

  // Keep only complete entries.
  registries = registries.filter((r) => r && r.url && r.url.trim()).map((r) => ({ label: (r.label || "Registry").trim(), url: r.url.trim() }));
  cashMethods = cashMethods.filter((m) => m && m.handle && m.handle.trim()).map((m) => ({ platform: m.platform, handle: m.handle.trim() }));

  const mode = String(formData.get("mode") || "none") as "none" | "registry" | "cash" | "both" | "later";
  const enabled = formData.get("enabled") === "on";

  await upsertGiftData(exp!.id, {
    mode,
    enabled,
    registries,
    cashMethods,
    message: String(formData.get("message") || "").trim() || undefined,
    visibility: String(formData.get("visibility") || "everyone") as "everyone" | "invited" | "family" | "hidden",
  });

  revalidatePath(`/dashboard/${slug}/gifts`);
  revalidatePath(`/${slug}`);
  redirect(`/dashboard/${slug}/gifts?saved=1`);
}
