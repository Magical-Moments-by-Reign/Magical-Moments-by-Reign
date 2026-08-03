"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-access";

const back = () => redirect("/admin/vendors?done=1");

function stamp(existing: string | null, actor: string, action: string): string {
  const line = `[${action}] by ${actor}`;
  return existing ? `${existing}\n${line}` : line;
}

// ── Applications ────────────────────────────────────────────────
export async function approveApplicationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("vendors.manage");
  const appId = String(formData.get("appId") || "");
  const app = await prisma.vendorApplication.findUnique({ where: { id: appId } });
  if (!app) redirect("/admin/vendors?error=notfound");

  // Create the marketplace Vendor record (starts approved but not yet public
  // until agreement + compliance + membership are complete).
  const slug = `${app!.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${appId.slice(-5)}`;
  const vendor = await prisma.vendor.create({
    data: {
      slug, businessName: app!.businessName, ownerName: app!.ownerName, description: app!.description,
      categoryId: app!.categoryId, city: app!.city, state: app!.state, email: app!.email, phone: app!.phone,
      website: app!.website, status: "APPROVED", membershipStatus: "PENDING_VERIFICATION",
    },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.vendorApplication.update({ where: { id: appId }, data: { status: "APPROVED", notes: stamp(app!.notes, admin.actor, "approved") } }),
    prisma.vendorMembershipEvent.create({ data: { vendorId: vendor.id, type: "created_from_application", detail: app!.number, actor: admin.actor } }),
  ]);
  back();
}

export async function rejectApplicationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("vendors.manage");
  const appId = String(formData.get("appId") || "");
  const app = await prisma.vendorApplication.findUnique({ where: { id: appId }, select: { notes: true } });
  await prisma.vendorApplication.update({ where: { id: appId }, data: { status: "REJECTED", notes: stamp(app?.notes ?? null, admin.actor, "rejected") } });
  back();
}

export async function requestInfoAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("vendors.manage");
  const appId = String(formData.get("appId") || "");
  const note = String(formData.get("note") || "additional information requested").trim();
  const app = await prisma.vendorApplication.findUnique({ where: { id: appId }, select: { notes: true } });
  // Keep status NEW; record the request as an auditable note.
  await prisma.vendorApplication.update({ where: { id: appId }, data: { notes: stamp(app?.notes ?? null, admin.actor, `info_requested: ${note}`) } });
  back();
}

// ── Vendor lifecycle ────────────────────────────────────────────
export async function suspendVendorAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("vendors.manage");
  const vendorId = String(formData.get("vendorId") || "");
  await prisma.$transaction([
    prisma.vendor.update({ where: { id: vendorId }, data: { status: "SUSPENDED", membershipStatus: "SUSPENDED" } }),
    prisma.vendorPerformanceEvent.create({ data: { vendorId, action: "suspended", actor: admin.actor } }),
  ]);
  back();
}

export async function reactivateVendorAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("vendors.manage");
  const vendorId = String(formData.get("vendorId") || "");
  await prisma.$transaction([
    prisma.vendor.update({ where: { id: vendorId }, data: { status: "APPROVED", membershipStatus: "ACTIVE" } }),
    prisma.vendorPerformanceEvent.create({ data: { vendorId, action: "reinstated", actor: admin.actor } }),
  ]);
  back();
}

export async function approveProfileChangeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("vendors.manage");
  const vendorId = String(formData.get("vendorId") || "");
  const v = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { pendingProfile: true } });
  if (!v?.pendingProfile) back();
  let p: Record<string, string> = {};
  try { p = JSON.parse(v!.pendingProfile!); } catch { back(); }
  await prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendorId },
      data: {
        businessName: p.businessName || undefined, ownerName: p.ownerName || undefined,
        description: p.description || undefined, categoryId: p.categoryId || undefined,
        serviceArea: p.serviceArea || undefined, phone: p.phone || undefined,
        email: p.email || undefined, website: p.website || undefined, pendingProfile: null,
      },
    }),
    prisma.vendorMembershipEvent.create({ data: { vendorId, type: "profile_change_approved", actor: admin.actor } }),
  ]);
  back();
}
