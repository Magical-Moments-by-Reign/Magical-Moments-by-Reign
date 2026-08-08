// ── Journey Studio™ — deterministic Creative Director ───────────
//
// The honest fallback. When no OPENAI_API_KEY is configured (or the live
// call fails), Journey Studio still returns real, useful recommendations —
// derived deterministically from the occasion catalog and the uploaded
// media. It never fabricates an "AI" answer; it does sensible curation and
// labels itself source: "heuristic" so provenance is always truthful.
//
// Pure: no prisma, no filesystem, no network. Same input → same output.

import type { SectionKind } from "@/types";
import { getExperienceType } from "@/lib/experience-types";
import { memoryIdeasFor } from "./memory-ideas";
import type {
  StudioDuplicateGroup,
  StudioLayout,
  StudioMediaItem,
  StudioRationale,
  StudioRecommendation,
  StudioRequest,
  StudioTimelineMoment,
} from "./types";

// A calm, editorial default layout used when the occasion isn't in the catalog.
const DEFAULT_ORDER: SectionKind[] = ["hero", "story", "gallery", "timeline", "guestbook", "footer"];

// One tasteful variant per section — the "house style" the Studio defaults to.
const HOUSE_VARIANT: Record<SectionKind, string> = {
  hero: "overlay",
  story: "alternating",
  gallery: "mosaic",
  timeline: "vertical",
  quote: "framed",
  details: "cards",
  guestbook: "cards",
  footer: "centered",
};

/** Photos before videos, then dated-earliest first, then by filename — stable. */
function orderMedia(media: StudioMediaItem[]): StudioMediaItem[] {
  return [...media].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "photo" ? -1 : 1;
    const da = a.takenAt || "";
    const db = b.takenAt || "";
    if (da && db && da !== db) return da < db ? -1 : 1;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return (a.filename || a.id).localeCompare(b.filename || b.id);
  });
}

/** Landscape, high-resolution photo makes the best cover; fall back to the first photo. */
function pickCover(media: StudioMediaItem[]): { mediaId: string; reason: string } | undefined {
  const photos = media.filter((m) => m.kind === "photo");
  if (photos.length === 0) return undefined;

  const scored = photos.map((p) => {
    const area = (p.width || 0) * (p.height || 0);
    const landscape = p.width && p.height ? p.width >= p.height : false;
    return { p, area, landscape };
  });
  scored.sort((a, b) => {
    if (a.landscape !== b.landscape) return a.landscape ? -1 : 1;
    if (a.area !== b.area) return b.area - a.area;
    return (a.p.filename || a.p.id).localeCompare(b.p.filename || b.p.id);
  });
  const best = scored[0];
  const reason = best.landscape && best.area > 0
    ? "Widest, highest-resolution photo — reads well as a full-bleed hero."
    : best.area > 0
      ? "Highest-resolution photo available for the cover."
      : "First photo in the set (no dimensions provided yet).";
  return { mediaId: best.p.id, reason };
}

/** Group dated media by calendar day into timeline moments. */
function buildTimeline(media: StudioMediaItem[]): StudioTimelineMoment[] {
  const dated = media.filter((m) => m.takenAt);
  if (dated.length === 0) return [];
  const byDay = new Map<string, StudioMediaItem[]>();
  for (const m of dated) {
    const day = (m.takenAt as string).slice(0, 10);
    const bucket = byDay.get(day) ?? [];
    bucket.push(m);
    byDay.set(day, bucket);
  }
  return [...byDay.keys()]
    .sort()
    .map((day) => ({
      date: day,
      title: byDay.get(day)!.length > 1 ? `Moments from ${day}` : `A moment on ${day}`,
      mediaIds: orderMedia(byDay.get(day)!).map((m) => m.id),
    }));
}

/** Flag likely duplicates: identical url, or identical filename+size signature. */
function findDuplicates(media: StudioMediaItem[]): StudioDuplicateGroup[] {
  const groups = new Map<string, StudioMediaItem[]>();
  for (const m of media) {
    // Signature = normalized filename + dimensions when present, else the url.
    const name = (m.filename || "").trim().toLowerCase();
    const dims = m.width && m.height ? `${m.width}x${m.height}` : "";
    const sig = name ? `${name}|${dims}` : m.url;
    const bucket = groups.get(sig) ?? [];
    bucket.push(m);
    groups.set(sig, bucket);
  }
  const out: StudioDuplicateGroup[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length > 1) {
      out.push({
        mediaIds: bucket.map((m) => m.id),
        reason: "Same filename and dimensions — likely the same shot uploaded more than once.",
      });
    }
  }
  return out;
}

/** Which sections the material already supports, from what's present. */
function detectSections(req: StudioRequest, media: StudioMediaItem[]): SectionKind[] {
  const found = new Set<SectionKind>(req.existingSections ?? []);
  found.add("hero");
  found.add("footer");
  if (media.some((m) => m.kind === "photo" || m.kind === "video")) found.add("gallery");
  if (media.some((m) => m.takenAt)) found.add("timeline");
  if (req.notes && req.notes.trim().length > 0) found.add("story");
  return [...found];
}

/** Build the layout for an occasion from its catalog entry (or the house default). */
function layoutFor(occasionType?: string): StudioLayout {
  const type = occasionType ? getExperienceType(occasionType) : undefined;
  const required = type?.requiredSections ?? DEFAULT_ORDER;
  const optional = type?.optionalSections ?? [];

  // Keep hero first and footer last; keep the rest in catalog order, then optionals.
  const middle: SectionKind[] = [];
  for (const s of [...required, ...optional]) {
    if (s !== "hero" && s !== "footer" && !middle.includes(s)) middle.push(s);
  }
  const sectionOrder: SectionKind[] = ["hero", ...middle, "footer"];

  const variants: Partial<Record<SectionKind, string>> = {};
  for (const s of sectionOrder) variants[s] = HOUSE_VARIANT[s];
  return { sectionOrder, variants };
}

/**
 * Produce a full deterministic recommendation. Fills in only the fields the
 * task asks for, but "enhance" fills them all.
 */
export function heuristicRecommend(req: StudioRequest): StudioRecommendation {
  const media = req.media ?? [];
  const ordered = orderMedia(media);
  const wants = (t: StudioRequest["task"]) => req.task === t || req.task === "enhance";

  const rec: StudioRecommendation = {
    task: req.task,
    source: "heuristic",
    summary: "",
    notes: [],
  };

  if (wants("recommend_layout")) rec.layout = layoutFor(req.occasionType);
  if (wants("suggest_cover")) rec.coverSuggestion = pickCover(media);
  if (wants("organize_uploads")) rec.galleryOrder = ordered.map((m) => m.id);
  if (wants("build_timeline")) rec.timeline = buildTimeline(media);
  if (wants("dedupe_media")) rec.duplicates = findDuplicates(media);
  if (wants("detect_sections")) rec.detectedSections = detectSections(req, media);

  // Missing = catalog-required sections not yet detected/present.
  const type = req.occasionType ? getExperienceType(req.occasionType) : undefined;
  if (type && (wants("detect_sections") || wants("recommend_layout"))) {
    const present = new Set<SectionKind>(rec.detectedSections ?? detectSections(req, media));
    rec.missingSections = type.requiredSections.filter((s) => !present.has(s));
  }

  // ── The "why" behind each recommendation — warm, encouraging, and grounded
  // ONLY in signals we actually have. Never claims visual qualities we can't
  // see (lighting, expressions); never criticizes.
  if (wants("detect_sections") || wants("recommend_layout") || wants("suggest_cover") || wants("organize_uploads") || wants("build_timeline")) {
    const photos = media.filter((m) => m.kind === "photo");
    const dated = media.filter((m) => m.takenAt);
    const days = new Set(dated.map((m) => (m.takenAt as string).slice(0, 10)));
    const typeLabel = (type?.label ?? "occasion").toLowerCase();
    const rationale: StudioRationale = {};

    if (rec.coverSuggestion) {
      const cov = media.find((m) => m.id === rec.coverSuggestion!.mediaId);
      const landscape = cov?.width && cov?.height ? cov.width >= cov.height : false;
      rationale.cover = landscape
        ? "This is the widest, highest-resolution photo you've uploaded — it fills the hero beautifully and draws visitors straight in."
        : photos.length > 0
          ? "This is the strongest photo we have to lead with, giving your page a warm, welcoming first impression."
          : "A gentle image to lead your page.";
    }
    if (rec.galleryOrder && rec.galleryOrder.length) {
      rationale.gallery = dated.length >= 2
        ? "These flow in the order your moments were captured, so visitors relive the story the way it unfolded."
        : "These open with your cover and flow gently into the rest of your photos for a smooth, unhurried gallery.";
    }
    if (rec.timeline && rec.timeline.length) {
      rationale.timeline = days.size > 1
        ? `Your photos span ${days.size} different days, which form ${rec.timeline.length} natural chapters in your story.`
        : "Your dated photos gather into a gentle timeline, giving your story a lovely sense of unfolding.";
    }
    if (rec.layout) {
      rationale.layout = `This arrangement opens with your hero and carries visitors smoothly through the ${typeLabel} — the flow we find reads most beautifully.`;
    }
    if (rec.missingSections && rec.missingSections.length) {
      rationale.missing = "You've already gathered lovely memories here. If these moments exist, adding them could make your story even richer.";
    }
    if (Object.keys(rationale).length) rec.rationale = rationale;

    // Occasion-specific memory inspiration (never a claim that anything's missing).
    if (wants("detect_sections") || wants("recommend_layout")) {
      rec.memoryIdeas = memoryIdeasFor(req.occasionType);
    }
  }

  // NOTE: emotional context, the Creative Reflection, and manifestations are
  // curated (occasion-soul.ts) and applied centrally in runJourneyStudio for
  // BOTH the heuristic and AI paths — so that warm, meaningful content always
  // comes from the curated library and never from a model.

  // A warm, honest one-liner summary.
  const parts: string[] = [];
  if (rec.coverSuggestion) parts.push("chose a cover");
  if (rec.galleryOrder) parts.push(`ordered ${rec.galleryOrder.length} upload(s)`);
  if (rec.timeline && rec.timeline.length) parts.push(`grouped ${rec.timeline.length} timeline moment(s)`);
  if (rec.duplicates && rec.duplicates.length) parts.push(`flagged ${rec.duplicates.length} possible duplicate(s)`);
  if (rec.missingSections && rec.missingSections.length) parts.push(`noted ${rec.missingSections.length} section(s) still to add`);
  rec.summary = parts.length
    ? `Studio (offline curation): ${parts.join(", ")}.`
    : "Studio (offline curation): reviewed the occasion; nothing to change yet.";

  if (!process.env.OPENAI_API_KEY) {
    rec.notes.push("Journey Studio's live creative model isn't connected yet — these are deterministic suggestions. Set OPENAI_API_KEY to enable richer, bespoke direction.");
  }
  return rec;
}
