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

export async function createMomentAction(formData: FormData): Promise<void> {
  const account = await requireOccasionAccess("/dashboard/create");

  const journeyId = String(formData.get("journey") || "");
  const milestoneId = String(formData.get("milestone") || "");
  const rawTitle = String(formData.get("title") || "").trim();
  const dateStr = String(formData.get("date") || "").trim();
  const privacy = String(formData.get("privacy") || "PRIVATE").toUpperCase();

  const journey = getExperience(journeyId);
  if (!journey) redirect("/dashboard/create?error=journey");

  const title = rawTitle || journey!.label;
  const visibility = ["PUBLIC", "UNLISTED", "PRIVATE"].includes(privacy) ? privacy : "PRIVATE";
  const type = JOURNEY_TYPE[journeyId] ?? "custom";
  const slug = `${slugify(title)}-${randomBytes(3).toString("hex")}`;
  const seed = `${slug}-seed`;

  const milestone = journey!.milestones.find((m) => m.id === milestoneId);
  const subtitle = milestone ? milestone.label : undefined;

  const designSpec = await generateDesignSpec(type, seed);
  const content = buildDefaultContent({ type, title, subtitle: subtitle ?? "", seed });

  await prisma.experience.create({
    data: {
      slug, type, title, subtitle,
      seed, status: "DRAFT", visibility,
      eventDate: dateStr ? new Date(dateStr) : null,
      designSpec: JSON.stringify(designSpec),
      content: JSON.stringify(content),
      accountId: account.id,
    },
  });

  redirect(`/${slug}`);
}
