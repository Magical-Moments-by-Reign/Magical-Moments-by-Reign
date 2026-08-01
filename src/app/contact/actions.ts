"use server";

import { redirect } from "next/navigation";
import { createInquiry } from "@/lib/inquiries";

export async function submitInquiryAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const reason = String(formData.get("reason") || "general").trim();
  const consent = formData.get("consent") === "on";

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !valid || !message || !consent) {
    redirect("/contact?error=1");
  }

  const number = await createInquiry({
    name,
    email,
    reason,
    message,
    phone: String(formData.get("phone") || "").trim() || undefined,
    experienceType: String(formData.get("experienceType") || "").trim() || undefined,
    preferredContact: String(formData.get("preferredContact") || "").trim() || undefined,
    consent,
  });

  redirect(`/contact?sent=${number}`);
}
