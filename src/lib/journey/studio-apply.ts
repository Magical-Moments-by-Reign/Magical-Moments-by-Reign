// ── Journey Studio — apply layer (PURE) ─────────────────────────
//
// Journey Studio only ADVISES (see src/lib/studio). Applying its advice to a
// real occasion is a separate, explicit, reversible step — this module.
//
// Everything here is a PURE function: (current content/designSpec + the
// recommendation + the occasion's real uploads) → new content/designSpec.
// No prisma, no fetch, no clock — so it is fully unit-testable and the server
// action that writes to the DB stays a thin, ownership-checked shell.
//
// Two model quirks this layer bridges honestly:
//   • The Studio references media by MediaAsset.id, but content.gallery /
//     content.hero store URLs. We translate id → url from the real asset list,
//     and silently drop any id that isn't a real upload (never invent media).
//   • Sections live in designSpec (order + variants); cover / gallery / timeline
//     live in content. Each apply-kind writes only its own home.

import type { DesignSpec, ExperienceContent, SectionKind } from "@/types";
import type { StudioManifestation, StudioMediaItem, StudioRecommendation, StudioRequest } from "@/lib/studio";

/** The distinct, independently-approvable things a member can APPLY. */
export type StudioApplyKind = "cover" | "gallery" | "timeline" | "sections" | "quote";

const SECTION_KINDS: SectionKind[] = ["hero", "story", "gallery", "timeline", "quote", "details", "guestbook", "footer"];

/** A minimal asset shape — what both the request builder and the apply layer
 *  need. Maps straight from a Prisma MediaAsset row. */
export interface StudioAsset {
  id: string;
  url: string;
  kind: string; // "IMAGE" | "VIDEO"
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt?: Date | string;
}

/** Map a real upload to the Studio's media vocabulary (photo/video). */
export function assetToStudioItem(a: StudioAsset): StudioMediaItem {
  return {
    id: a.id,
    kind: a.kind === "VIDEO" ? "video" : "photo",
    url: a.url,
    filename: a.caption ?? undefined,
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    takenAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined,
    caption: a.caption ?? undefined,
  };
}

/** Build the full "enhance" request from a real occasion + its uploads. */
export function buildStudioRequest(input: {
  occasionType?: string;
  title?: string;
  existingSections?: SectionKind[];
  assets: StudioAsset[];
}): StudioRequest {
  return {
    task: "enhance",
    occasionType: input.occasionType,
    title: input.title,
    existingSections: input.existingSections,
    media: input.assets.map(assetToStudioItem),
  };
}

/** Which apply-kinds does this recommendation actually offer? (drives the UI) */
export function availableApplyKinds(rec: StudioRecommendation, assets: StudioAsset[]): StudioApplyKind[] {
  const byId = new Set(assets.map((a) => a.id));
  const out: StudioApplyKind[] = [];
  if (rec.coverSuggestion && byId.has(rec.coverSuggestion.mediaId)) out.push("cover");
  if ((rec.galleryOrder ?? []).some((id) => byId.has(id))) out.push("gallery");
  if ((rec.timeline ?? []).length) out.push("timeline");
  if ((rec.layout?.sectionOrder ?? []).length || (rec.missingSections ?? []).length) out.push("sections");
  return out;
}

const imagesOnly = (assets: StudioAsset[]) => assets.filter((a) => a.kind !== "VIDEO");

/** Set the cover/hero poster to the suggested upload (by URL). */
export function applyCover(content: ExperienceContent, rec: StudioRecommendation, assets: StudioAsset[]): ExperienceContent {
  const id = rec.coverSuggestion?.mediaId;
  const asset = id ? assets.find((a) => a.id === id) : undefined;
  if (!asset) return content;
  return { ...content, hero: { ...content.hero, posterUrl: asset.url } };
}

/** Rebuild the gallery from the real uploads, in the Studio's order. Ordered
 *  ids first; any remaining image uploads are appended so nothing is lost. */
export function applyGallery(content: ExperienceContent, rec: StudioRecommendation, assets: StudioAsset[]): ExperienceContent {
  const images = imagesOnly(assets);
  if (!images.length) return content;
  const byId = new Map(images.map((a) => [a.id, a]));
  const ordered: StudioAsset[] = [];
  const seen = new Set<string>();
  for (const id of rec.galleryOrder ?? []) {
    const a = byId.get(id);
    if (a && !seen.has(a.id)) { ordered.push(a); seen.add(a.id); }
  }
  for (const a of images) if (!seen.has(a.id)) ordered.push(a); // keep every upload
  const gallery = ordered.map((a) => ({ url: a.url, caption: a.caption ?? "" }));
  return { ...content, gallery };
}

/** Write the Studio's timeline moments into content.timeline. Body is composed
 *  honestly from the captions of the moment's media (or left blank) — never
 *  invented prose. */
export function applyTimeline(content: ExperienceContent, rec: StudioRecommendation, assets: StudioAsset[]): ExperienceContent {
  const moments = rec.timeline ?? [];
  if (!moments.length) return content;
  const byId = new Map(assets.map((a) => [a.id, a]));
  const timeline = moments.map((m) => {
    const captions = (m.mediaIds ?? [])
      .map((id) => byId.get(id)?.caption)
      .filter((c): c is string => Boolean(c && c.trim()));
    return { date: m.date ?? "", title: m.title, body: captions.join(" · ") };
  });
  return { ...content, timeline };
}

/** Apply the recommended section order + variants to the designSpec. Missing
 *  sections are appended; hero always leads and footer always trails; unknown
 *  kinds are dropped. */
export function applySections(designSpec: DesignSpec, rec: StudioRecommendation): DesignSpec {
  const clean = (arr: readonly string[] | undefined): SectionKind[] =>
    (arr ?? []).filter((s): s is SectionKind => (SECTION_KINDS as string[]).includes(s));

  const recommended = clean(rec.layout?.sectionOrder);
  const missing = clean(rec.missingSections);
  const base = recommended.length ? recommended : designSpec.sectionOrder;

  // Union, preserving order: base first, then any missing not already present.
  const merged: SectionKind[] = [];
  const seen = new Set<SectionKind>();
  for (const s of [...base, ...missing]) {
    if (!seen.has(s)) { merged.push(s); seen.add(s); }
  }
  // Structural guarantees: hero first, footer last.
  let order: SectionKind[] = merged.filter((s) => s !== "hero" && s !== "footer");
  order = [...(seen.has("hero") || designSpec.sectionOrder.includes("hero") ? (["hero"] as SectionKind[]) : []), ...order];
  if (seen.has("footer") || designSpec.sectionOrder.includes("footer")) order.push("footer");

  const variants = { ...designSpec.variants, ...(rec.layout?.variants ?? {}) };
  return { ...designSpec, sectionOrder: order, variants };
}

/** Ensure a section appears in the order (before footer); no-op if present. */
function withSection(order: SectionKind[], section: SectionKind): SectionKind[] {
  if (order.includes(section)) return order;
  const footerAt = order.indexOf("footer");
  if (footerAt < 0) return [...order, section];
  return [...order.slice(0, footerAt), section, ...order.slice(footerAt)];
}

/**
 * Add a manifestation to the page: write it into content.quote AND make the
 * quote section visible in the layout. Reversible via removeManifestation.
 * The caller is responsible for confirming the text is curated (honesty gate).
 */
export function applyManifestation(
  content: ExperienceContent,
  designSpec: DesignSpec,
  manifestation: StudioManifestation,
): { content: ExperienceContent; designSpec: DesignSpec } {
  const quote = manifestation.attribution
    ? { text: manifestation.text, attribution: manifestation.attribution }
    : { text: manifestation.text };
  return {
    content: { ...content, quote },
    designSpec: { ...designSpec, sectionOrder: withSection(designSpec.sectionOrder, "quote") },
  };
}

/** Remove the manifestation: clear content.quote and hide the quote section. */
export function removeManifestation(
  content: ExperienceContent,
  designSpec: DesignSpec,
): { content: ExperienceContent; designSpec: DesignSpec } {
  const next = { ...content };
  delete next.quote;
  return {
    content: next,
    designSpec: { ...designSpec, sectionOrder: designSpec.sectionOrder.filter((s) => s !== "quote") },
  };
}

export interface StudioApplyResult {
  content: ExperienceContent;
  designSpec: DesignSpec;
  applied: StudioApplyKind[];
}

/**
 * Apply the selected suggestion kinds. Only kinds that are BOTH selected and
 * actually offered by the recommendation are applied; the rest pass through
 * untouched. Returns the new content/designSpec plus exactly what changed.
 */
export function applyStudioSelections(input: {
  content: ExperienceContent;
  designSpec: DesignSpec;
  recommendation: StudioRecommendation;
  assets: StudioAsset[];
  kinds: StudioApplyKind[];
}): StudioApplyResult {
  const offered = new Set(availableApplyKinds(input.recommendation, input.assets));
  const wanted = new Set(input.kinds.filter((k) => offered.has(k)));

  let content = input.content;
  let designSpec = input.designSpec;
  const applied: StudioApplyKind[] = [];

  if (wanted.has("cover")) { content = applyCover(content, input.recommendation, input.assets); applied.push("cover"); }
  if (wanted.has("gallery")) { content = applyGallery(content, input.recommendation, input.assets); applied.push("gallery"); }
  if (wanted.has("timeline")) { content = applyTimeline(content, input.recommendation, input.assets); applied.push("timeline"); }
  if (wanted.has("sections")) { designSpec = applySections(designSpec, input.recommendation); applied.push("sections"); }

  return { content, designSpec, applied };
}
