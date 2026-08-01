// ── Inquiry service ─────────────────────────────────────────────
// Creates contact-form tickets with a human-friendly inquiry number.
// (Email delivery to the customer + admin is a later integration seam;
// the record + number are created now.)

import { prisma } from "@/lib/db";

export interface CreateInquiryInput {
  name: string;
  email: string;
  phone?: string;
  reason: string;
  experienceType?: string;
  message: string;
  preferredContact?: string;
  consent: boolean;
}

function inquiryNumber(): string {
  // MMR-XXXXXX (no ambiguous chars). Not security-sensitive.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MMR-${s}`;
}

export async function createInquiry(input: CreateInquiryInput): Promise<string> {
  // Retry on the (very unlikely) number collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = inquiryNumber();
    const exists = await prisma.inquiry.findUnique({ where: { number }, select: { id: true } });
    if (exists) continue;
    await prisma.inquiry.create({
      data: {
        number,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        reason: input.reason,
        experienceType: input.experienceType || null,
        message: input.message,
        preferredContact: input.preferredContact || null,
        consent: input.consent,
      },
    });
    // TODO (integration): email the customer a confirmation + notify admin.
    return number;
  }
  throw new Error("Could not generate a unique inquiry number. Please try again.");
}

export const CONTACT_REASONS = [
  { id: "general", label: "General question" },
  { id: "plan", label: "Help choosing a plan" },
  { id: "create", label: "Help creating an experience" },
  { id: "billing", label: "Billing" },
  { id: "support", label: "Technical support" },
  { id: "concierge", label: "Custom Concierge experience ($5,000)" },
  { id: "consultation", label: "Schedule a consultation" },
  { id: "business", label: "Custom business website" },
  { id: "partnership", label: "Partnership" },
  { id: "media", label: "Media inquiry" },
  { id: "accessibility", label: "Accessibility support" },
  { id: "other", label: "Other" },
] as const;
