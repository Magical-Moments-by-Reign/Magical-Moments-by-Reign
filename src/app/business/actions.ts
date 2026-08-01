"use server";

import { redirect } from "next/navigation";
import { createCustomWebsiteRequest } from "@/lib/custom-website";

export async function submitCustomWebsiteAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const details = String(formData.get("details") || "").trim();

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !valid || !details) {
    redirect("/business?error=1");
  }

  const { number } = await createCustomWebsiteRequest({
    name,
    email,
    details,
    phone: String(formData.get("phone") || "").trim() || undefined,
    business: String(formData.get("business") || "").trim() || undefined,
    projectType: String(formData.get("projectType") || "").trim() || undefined,
    budget: String(formData.get("budget") || "").trim() || undefined,
    timeline: String(formData.get("timeline") || "").trim() || undefined,
  });

  redirect(`/business?sent=${number}`);
}
