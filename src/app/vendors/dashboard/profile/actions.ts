"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireVendorSection } from "@/lib/vendor-auth";

// Profile edits are staged in Vendor.pendingProfile for ADMIN REVIEW — sensitive
// changes never publish to the live listing automatically.
export async function saveVendorProfileAction(formData: FormData): Promise<void> {
  const ctx = await requireVendorSection("profile");
  if (!ctx.vendorId) redirect("/vendors/dashboard/profile?error=no_vendor");

  const s = (k: string) => String(formData.get(k) || "").trim();
  const pending = {
    businessName: s("businessName"),
    ownerName: s("ownerName"),
    description: s("description"),
    categoryId: s("categoryId"),
    serviceArea: s("serviceArea"),
    phone: s("phone"),
    email: s("email"),
    website: s("website"),
    socials: s("socials"),
    submittedAt: new Date().toISOString(),
  };

  await prisma.vendor.update({ where: { id: ctx.vendorId }, data: { pendingProfile: JSON.stringify(pending) } });
  await prisma.vendorMembershipEvent.create({
    data: { vendorId: ctx.vendorId, type: "profile_change_submitted", detail: "awaiting admin review", actor: ctx.account.customerId },
  }).catch(() => {});

  redirect("/vendors/dashboard/profile?submitted=1");
}
