"use server";

// ── Journey Studio (builder) — server actions ───────────────────
// Ownership is enforced HERE (the media surface is otherwise unguarded):
// every action resolves the signed-in account and scopes the occasion by
// `accountId`, so a member can only review/apply against their own occasion.
//
// runReview  — read-only: ask Journey Studio for creative direction.
// applyStudio — write: apply the selected suggestions, return the pre-apply
//               snapshot so the client can offer a real Undo.
// revertStudio — write: restore a snapshot (the Undo).
// Every write records an audit event and revalidates the builder + public page.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/guard";
import { serialize, hydrateExperience } from "@/lib/serialize";
import { runJourneyStudio, studioAiConfigured, isCuratedManifestation, type StudioRecommendation } from "@/lib/studio";
import { recordJourneyEvent } from "@/lib/journey/audit";
import {
  buildStudioRequest,
  applyStudioSelections,
  availableApplyKinds,
  applyManifestation as applyManifestationToContent,
  removeManifestation as removeManifestationFromContent,
  type StudioApplyKind,
  type StudioAsset,
} from "@/lib/journey/studio-apply";
import type { DesignSpec, ExperienceContent, SectionKind } from "@/types";

export interface StudioSnapshot {
  content: ExperienceContent;
  designSpec: DesignSpec;
}

export interface StudioReviewResult {
  ok: boolean;
  error?: string;
  aiConfigured: boolean;
  recommendation?: StudioRecommendation;
  available?: StudioApplyKind[];
}

/** Load an occasion the signed-in account OWNS, hydrated. Null if not owned. */
async function loadOwned(slug: string) {
  const account = await requireAccount(`/dashboard/${slug}/studio`);
  const row = await prisma.experience.findFirst({ where: { slug, accountId: account.id } });
  if (!row) return null;
  return { account, exp: hydrateExperience(row) };
}

async function loadAssets(experienceId: string): Promise<StudioAsset[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: { experienceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, kind: true, caption: true, width: true, height: true, createdAt: true },
  });
  return rows;
}

/** Read-only: run Journey Studio for this occasion and return its advice. */
export async function runReview(slug: string): Promise<StudioReviewResult> {
  const owned = await loadOwned(slug);
  if (!owned) return { ok: false, error: "We couldn't find that occasion in your account.", aiConfigured: studioAiConfigured() };
  const { account, exp } = owned;
  const assets = await loadAssets(exp.id);

  try {
    const rec = await runJourneyStudio(
      buildStudioRequest({
        occasionType: exp.type,
        title: exp.title,
        existingSections: exp.designSpec.sectionOrder as SectionKind[],
        assets,
      }),
    );
    recordJourneyEvent({
      kind: "recommendation",
      accountId: account.id,
      at: new Date().toISOString(),
      tool: "journeyStudio.review",
      detail: { slug, source: rec.source, assetCount: assets.length },
    });
    return { ok: true, aiConfigured: studioAiConfigured(), recommendation: rec, available: availableApplyKinds(rec, assets) };
  } catch {
    return { ok: false, error: "Journey Studio is unavailable right now. Nothing was changed.", aiConfigured: studioAiConfigured() };
  }
}

export interface StudioApplyResponse {
  ok: boolean;
  error?: string;
  applied?: StudioApplyKind[];
  previous?: StudioSnapshot; // pre-apply snapshot, for Undo
}

/** Apply the selected suggestions. Re-runs the Studio server-side so we apply
 *  against fresh advice (never client-supplied recommendations we can't trust). */
export async function applyStudio(slug: string, kinds: StudioApplyKind[]): Promise<StudioApplyResponse> {
  const owned = await loadOwned(slug);
  if (!owned) return { ok: false, error: "We couldn't find that occasion in your account." };
  const { account, exp } = owned;
  if (!kinds?.length) return { ok: false, error: "Nothing was selected to apply." };

  const assets = await loadAssets(exp.id);
  let rec: StudioRecommendation;
  try {
    rec = await runJourneyStudio(
      buildStudioRequest({ occasionType: exp.type, title: exp.title, existingSections: exp.designSpec.sectionOrder as SectionKind[], assets }),
    );
  } catch {
    return { ok: false, error: "Journey Studio is unavailable right now. Nothing was changed." };
  }

  const previous: StudioSnapshot = { content: exp.content, designSpec: exp.designSpec };
  const next = applyStudioSelections({ content: exp.content, designSpec: exp.designSpec, recommendation: rec, assets, kinds });
  if (!next.applied.length) return { ok: false, error: "Those suggestions are no longer available to apply." };

  await prisma.experience.updateMany({
    where: { slug, accountId: account.id },
    data: { content: serialize(next.content), designSpec: serialize(next.designSpec) },
  });

  recordJourneyEvent({
    kind: "tool_result",
    accountId: account.id,
    at: new Date().toISOString(),
    tool: "journeyStudio.apply",
    detail: { slug, applied: next.applied, source: rec.source },
  });

  revalidatePath(`/dashboard/${slug}/studio`);
  revalidatePath(`/${slug}`);
  return { ok: true, applied: next.applied, previous };
}

/**
 * Add a manifestation to the page. HONESTY GATE: the text must be a curated
 * manifestation for this occasion — arbitrary/model text is refused, so only
 * curated lines are ever written. Returns the pre-apply snapshot for Undo.
 */
export async function applyManifestation(slug: string, text: string): Promise<StudioApplyResponse> {
  const owned = await loadOwned(slug);
  if (!owned) return { ok: false, error: "We couldn't find that occasion in your account." };
  const { account, exp } = owned;

  if (!isCuratedManifestation(exp.type, text)) {
    return { ok: false, error: "That manifestation isn't available for this occasion." };
  }

  const previous: StudioSnapshot = { content: exp.content, designSpec: exp.designSpec };
  const next = applyManifestationToContent(exp.content, exp.designSpec, { text: text.trim() });

  await prisma.experience.updateMany({
    where: { slug, accountId: account.id },
    data: { content: serialize(next.content), designSpec: serialize(next.designSpec) },
  });
  recordJourneyEvent({ kind: "tool_result", accountId: account.id, at: new Date().toISOString(), tool: "journeyStudio.manifestation.add", detail: { slug } });
  revalidatePath(`/dashboard/${slug}/studio`);
  revalidatePath(`/${slug}`);
  return { ok: true, applied: ["quote"], previous };
}

/** Remove the manifestation from the page. Returns the snapshot for Undo. */
export async function removeManifestation(slug: string): Promise<StudioApplyResponse> {
  const owned = await loadOwned(slug);
  if (!owned) return { ok: false, error: "We couldn't find that occasion in your account." };
  const { account, exp } = owned;

  const previous: StudioSnapshot = { content: exp.content, designSpec: exp.designSpec };
  const next = removeManifestationFromContent(exp.content, exp.designSpec);

  await prisma.experience.updateMany({
    where: { slug, accountId: account.id },
    data: { content: serialize(next.content), designSpec: serialize(next.designSpec) },
  });
  recordJourneyEvent({ kind: "tool_result", accountId: account.id, at: new Date().toISOString(), tool: "journeyStudio.manifestation.remove", detail: { slug } });
  revalidatePath(`/dashboard/${slug}/studio`);
  revalidatePath(`/${slug}`);
  return { ok: true, applied: ["quote"], previous };
}

/** Undo: restore a snapshot captured before an apply. */
export async function revertStudio(slug: string, previous: StudioSnapshot): Promise<{ ok: boolean; error?: string }> {
  const owned = await loadOwned(slug);
  if (!owned) return { ok: false, error: "We couldn't find that occasion in your account." };
  const { account } = owned;
  if (!previous?.content || !previous?.designSpec) return { ok: false, error: "There's nothing to undo." };

  await prisma.experience.updateMany({
    where: { slug, accountId: account.id },
    data: { content: serialize(previous.content), designSpec: serialize(previous.designSpec) },
  });

  recordJourneyEvent({
    kind: "tool_result",
    accountId: account.id,
    at: new Date().toISOString(),
    tool: "journeyStudio.undo",
    detail: { slug },
  });

  revalidatePath(`/dashboard/${slug}/studio`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}
