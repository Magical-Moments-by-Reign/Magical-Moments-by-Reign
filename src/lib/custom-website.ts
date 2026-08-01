// ── Custom business website request service ─────────────────────
// Quote-based, concierge service — separate from the self-serve
// Magical Moments experiences. A request creates a CustomWebsiteRequest
// record, sends the customer a branded "we received it" email, and
// notifies the admin inbox. Accepting a request (from the admin) sends
// the "we've accepted your project — stand by for a call" email with the
// intake (Jotform) link.

import { prisma } from "@/lib/db";
import {
  sendEmail,
  ADMIN_EMAIL,
  customWebsiteReceivedEmail,
  customWebsiteAcceptedEmail,
  adminCustomWebsiteNotifyEmail,
} from "@/lib/email";

export interface CreateCustomWebsiteInput {
  name: string;
  email: string;
  phone?: string;
  business?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  details: string;
}

export interface CreatedCustomWebsite {
  id: string;
  number: string;
}

function customNumber(): string {
  // MMR-CW-XXXXXX (no ambiguous characters). Not security-sensitive.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MMR-CW-${s}`;
}

export async function createCustomWebsiteRequest(
  input: CreateCustomWebsiteInput,
): Promise<CreatedCustomWebsite> {
  let created: { id: string; number: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = customNumber();
    const exists = await prisma.customWebsiteRequest.findUnique({
      where: { number },
      select: { id: true },
    });
    if (exists) continue;
    const row = await prisma.customWebsiteRequest.create({
      data: {
        number,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        business: input.business || null,
        projectType: input.projectType || null,
        budget: input.budget || null,
        timeline: input.timeline || null,
        details: input.details,
        status: "NEW",
      },
      select: { id: true, number: true },
    });
    created = row;
    break;
  }
  if (!created) {
    throw new Error("Could not generate a unique reference number. Please try again.");
  }

  // Fire-and-forget emails — never block or fail the request on email.
  const customer = customWebsiteReceivedEmail({ name: input.name, number: created.number });
  const admin = adminCustomWebsiteNotifyEmail({
    number: created.number,
    name: input.name,
    email: input.email,
    business: input.business,
    details: input.details,
  });
  await Promise.allSettled([
    sendEmail({ to: input.email, subject: customer.subject, html: customer.html, replyTo: ADMIN_EMAIL }),
    sendEmail({ to: ADMIN_EMAIL, subject: admin.subject, html: admin.html, replyTo: input.email }),
  ]);

  return created;
}

/** Accept a request → mark ACCEPTED and send the "stand by for a call" email. */
export async function acceptCustomWebsiteRequest(
  id: string,
  jotformUrl?: string,
): Promise<void> {
  const req = await prisma.customWebsiteRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Request not found.");

  const link = jotformUrl || req.jotformUrl || process.env.CUSTOM_INTAKE_FORM_URL || undefined;

  await prisma.customWebsiteRequest.update({
    where: { id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), jotformUrl: link ?? req.jotformUrl },
  });

  const email = customWebsiteAcceptedEmail({ name: req.name, number: req.number, jotformUrl: link });
  await sendEmail({ to: req.email, subject: email.subject, html: email.html, replyTo: ADMIN_EMAIL });
}

/** Update just the status (e.g. IN_PROGRESS, COMPLETE, DECLINED). */
export async function setCustomWebsiteStatus(id: string, status: string): Promise<void> {
  await prisma.customWebsiteRequest.update({ where: { id }, data: { status } });
}

export const CUSTOM_STATUSES = ["NEW", "ACCEPTED", "IN_PROGRESS", "COMPLETE", "DECLINED"] as const;

export const PROJECT_TYPES = [
  "Business / brand website",
  "Portfolio",
  "Online store",
  "Event or wedding business",
  "Restaurant / hospitality",
  "Professional services",
  "Nonprofit",
  "Other",
] as const;

export const BUDGET_RANGES = [
  "Under $1,000",
  "$1,000 – $2,500",
  "$2,500 – $5,000",
  "$5,000+",
  "Not sure yet",
] as const;

export const TIMELINES = [
  "As soon as possible",
  "Within a month",
  "1 – 3 months",
  "Just exploring",
] as const;
