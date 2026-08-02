"use server";

import { redirect } from "next/navigation";
import { createVendorApplication } from "@/lib/vendor-service";
import { vendorCategory } from "@/lib/vendors";

export async function submitVendorApplication(formData: FormData): Promise<void> {
  const s = (k: string) => String(formData.get(k) || "").trim();
  const businessName = s("businessName");
  const ownerName = s("ownerName");
  const email = s("email");
  const categoryId = s("categoryId");
  const description = s("description");
  const city = s("city");
  const state = s("state");
  const agreedTerms = formData.get("agreedTerms") === "on";

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const categoryOk = !!vendorCategory(categoryId);
  if (!businessName || !ownerName || !emailOk || !categoryOk || !description || !city || !state || !agreedTerms) {
    redirect("/vendors/apply?error=1");
  }

  const yearsRaw = s("yearsInBusiness");
  const years = yearsRaw ? Math.max(0, parseInt(yearsRaw, 10) || 0) : undefined;

  const { number } = await createVendorApplication({
    businessName, ownerName, email, categoryId, description, city, state, agreedTerms,
    phone: s("phone") || undefined,
    website: s("website") || undefined,
    yearsInBusiness: years,
    businessLicense: s("businessLicense") || undefined,
    insurance: s("insurance") || undefined,
    references: s("references") || undefined,
    socials: s("socials") ? [{ platform: "link", url: s("socials") }] : undefined,
  });

  redirect(`/vendors/apply?sent=${number}`);
}
