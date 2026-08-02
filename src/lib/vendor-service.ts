// ── Vendor Marketplace — server-side services ───────────────────
// DB-backed operations (a "Become a Vendor" application creates a real
// VendorApplication row for admin review). Kept separate from src/lib/vendors.ts
// (the pure/client-safe domain) so Prisma never enters a client bundle. Mirrors
// the Custom Website request pattern. No payment or approval is faked — a new
// application is simply queued for the admin.

import { prisma } from "@/lib/db";

export interface CreateVendorApplicationInput {
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  website?: string;
  categoryId: string;
  description: string;
  yearsInBusiness?: number;
  city: string;
  state: string;
  businessLicense?: string;
  insurance?: string;
  socials?: { platform: string; url: string }[];
  references?: string;
  agreedTerms: boolean;
}

function vendorNumber(): string {
  // MMR-V-XXXXXX (no ambiguous characters). Not security-sensitive.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MMR-V-${s}`;
}

export async function createVendorApplication(
  input: CreateVendorApplicationInput,
): Promise<{ id: string; number: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = vendorNumber();
    const exists = await prisma.vendorApplication.findUnique({ where: { number }, select: { id: true } });
    if (exists) continue;
    const row = await prisma.vendorApplication.create({
      data: {
        number,
        businessName: input.businessName,
        ownerName: input.ownerName,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        website: input.website || null,
        categoryId: input.categoryId,
        description: input.description,
        yearsInBusiness: input.yearsInBusiness ?? null,
        city: input.city,
        state: input.state,
        businessLicense: input.businessLicense || null,
        insurance: input.insurance || null,
        socials: JSON.stringify(input.socials ?? []),
        references: input.references || null,
        agreedTerms: input.agreedTerms,
        status: "NEW",
      },
      select: { id: true, number: true },
    });
    return row;
  }
  throw new Error("Could not generate a unique reference number. Please try again.");
}
