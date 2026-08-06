// ── Journey Operations Engine — client context ──────────────────
//
// getCurrentClientContext resolves the minimum the engine needs to guide a
// specific signed-in client: who they are, which occasions (Journeys) they
// own, and what looks incomplete. It is READ-ONLY and strictly
// ownership-scoped — every occasion is fetched by the caller's accountId, so
// the engine can never see another family's data.
//
// Privacy (per spec): we deliberately return only task-relevant fields. No
// full account record, no emails, no payment details, no secrets — those
// never reach the model.

import { prisma } from "@/lib/db";
import type { CurrentAccount } from "@/lib/auth-session";
import type { SectionKind } from "@/types";

export interface JourneyOccasionContext {
  id: string;
  slug: string;
  type: string;
  title: string;
  subtitle: string | null;
  status: string; // DRAFT | PUBLISHED | ARCHIVED
  visibility: string; // PUBLIC | UNLISTED | PRIVATE
  eventDate: string | null;
  mediaCount: number;
  /** Sections that already have real content, inferred from the content JSON. */
  filledSections: SectionKind[];
  /** Plain-language flags about what's incomplete or needs attention. */
  attention: string[];
}

export interface JourneyClientContext {
  client: {
    accountId: string;
    firstName: string;
    membershipTier: string;
    assistantName: string; // the client's chosen name for Journey
  };
  occasions: JourneyOccasionContext[];
  counts: {
    occasions: number;
    drafts: number;
    published: number;
  };
  /** Cross-occasion nudges — the "where did I stop / what's missing" summary. */
  attention: string[];
}

const KNOWN_SECTIONS: SectionKind[] = ["hero", "story", "gallery", "timeline", "quote", "details", "guestbook", "footer"];

/** Infer which sections have real content from the stored content JSON. */
function filledSectionsFrom(contentJson: string): SectionKind[] {
  let parsed: unknown;
  try { parsed = JSON.parse(contentJson); } catch { return []; }
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const found: SectionKind[] = [];
  for (const s of KNOWN_SECTIONS) {
    const v = obj[s];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    found.push(s);
  }
  return found;
}

/**
 * Resolve the operating context for the signed-in client. Ownership is
 * enforced by querying occasions with `accountId = account.id`.
 */
export async function getCurrentClientContext(account: CurrentAccount): Promise<JourneyClientContext> {
  const rows = await prisma.experience.findMany({
    where: { accountId: account.id },
    select: {
      id: true, slug: true, type: true, title: true, subtitle: true,
      status: true, visibility: true, eventDate: true, content: true,
      _count: { select: { media: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const occasions: JourneyOccasionContext[] = rows.map((r) => {
    const filled = filledSectionsFrom(r.content);
    const attention: string[] = [];
    if (r.status === "DRAFT") attention.push("This occasion is still a draft — not published yet.");
    if (r._count.media === 0) attention.push("No photos or videos uploaded yet.");
    if (!filled.includes("story")) attention.push("The story section is empty.");
    if (!filled.includes("gallery") && r._count.media > 0) attention.push("Uploads aren't placed into the gallery yet.");
    return {
      id: r.id,
      slug: r.slug,
      type: r.type,
      title: r.title,
      subtitle: r.subtitle,
      status: r.status,
      visibility: r.visibility,
      eventDate: r.eventDate ? r.eventDate.toISOString() : null,
      mediaCount: r._count.media,
      filledSections: filled,
      attention,
    };
  });

  const drafts = occasions.filter((o) => o.status === "DRAFT").length;
  const published = occasions.filter((o) => o.status === "PUBLISHED").length;

  const attention: string[] = [];
  if (occasions.length === 0) attention.push("No Journeys yet — the client can start their first occasion.");
  if (drafts > 0) attention.push(`${drafts} occasion(s) still in draft.`);
  const emptyMedia = occasions.filter((o) => o.mediaCount === 0).length;
  if (emptyMedia > 0) attention.push(`${emptyMedia} occasion(s) have no uploads yet.`);

  return {
    client: {
      accountId: account.id,
      firstName: account.firstName,
      membershipTier: account.membershipTier,
      assistantName: account.assistantName,
    },
    occasions,
    counts: { occasions: occasions.length, drafts, published },
    attention,
  };
}
