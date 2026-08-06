"use server";

// ── Create a Moment — start a real draft ────────────────────────
// Creates a DRAFT Experience owned by the signed-in account and sends them into
// the builder. Enforces the membership rule (Free Forever cannot create
// occasions) via requireOccasionAccess — the same gate as the rest of the app.

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOccasionAccess } from "@/lib/guard";
import { generateDesignSpec } from "@/lib/design-engine";
import { buildDefaultContent } from "@/lib/content";
import { slugify } from "@/lib/slug";
import { getExperience } from "@/lib/membership-builder";
import { JOURNEY_TYPE } from "@/lib/owner-demo";

// Shared: create a real DRAFT Experience for this account and return its slug.
async function createDraft(opts: {
  accountId: string; journeyId: string; title: string;
  subtitle?: string; visibility: string; eventDate?: Date | null;
}): Promise<string> {
  const type = JOURNEY_TYPE[opts.journeyId] ?? "custom";
  const slug = `${slugify(opts.title)}-${randomBytes(3).toString("hex")}`;
  const seed = `${slug}-seed`;
  const designSpec = await generateDesignSpec(type, seed);
  const content = buildDefaultContent({ type, title: opts.title, subtitle: opts.subtitle ?? "", seed });

  await prisma.experience.create({
    data: {
      slug, type, title: opts.title, subtitle: opts.subtitle,
      seed, status: "DRAFT",
      visibility: ["PUBLIC", "UNLISTED", "PRIVATE"].includes(opts.visibility) ? opts.visibility : "PRIVATE",
      eventDate: opts.eventDate ?? null,
      designSpec: JSON.stringify(designSpec),
      content: JSON.stringify(content),
      accountId: opts.accountId,
    },
  });
  return slug;
}

// ── Create a Memory ── the full planning flow → the builder.
export async function createMomentAction(formData: FormData): Promise<void> {
  const account = await requireOccasionAccess("/dashboard/create");

  const journeyId = String(formData.get("journey") || "");
  const milestoneId = String(formData.get("milestone") || "");
  const rawTitle = String(formData.get("title") || "").trim();
  const dateStr = String(formData.get("date") || "").trim();
  const privacy = String(formData.get("privacy") || "PRIVATE").toUpperCase();

  const journey = getExperience(journeyId);
  if (!journey) redirect("/dashboard/create?error=journey");

  const milestone = journey!.milestones.find((m) => m.id === milestoneId);
  const slug = await createDraft({
    accountId: account.id, journeyId,
    title: rawTitle || journey!.label,
    subtitle: milestone ? milestone.label : undefined,
    visibility: privacy,
    eventDate: dateStr ? new Date(dateStr) : null,
  });

  redirect(`/${slug}`);
}

// ── Capture a Memory ── the moment already happened → straight to the gallery.
// Creates a real DRAFT Experience, then lands the member in the media uploader
// so they can add photos & videos right away (no planning form in between).
export async function captureMemoryAction(formData: FormData): Promise<void> {
  const account = await requireOccasionAccess("/dashboard/create");

  const journeyId = String(formData.get("journey") || "");
  const rawTitle = String(formData.get("title") || "").trim();

  const journey = getExperience(journeyId);
  if (!journey) redirect("/dashboard/create?error=journey");

  const slug = await createDraft({
    accountId: account.id, journeyId,
    title: rawTitle || `${journey!.label} Memories`,
    visibility: "PRIVATE", // captured memories default to private; changeable in the gallery
  });

  redirect(`/dashboard/${slug}/media`);
}
