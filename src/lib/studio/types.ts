// ── Journey Studio™ — types (the Creative Director's vocabulary) ─
//
// Journey Studio is the INTERNAL creative director. Claude (the builder)
// calls it to design, organize, and enhance an occasion. It speaks in the
// same section vocabulary as the rest of the platform (SectionKind) and the
// same occasion catalog (EXPERIENCE_TYPES), so its recommendations map
// straight onto real experiences.
//
// HARD CONSTRAINT (by design, enforced by construction — see index.ts):
//   Journey Studio never edits production code. Never deploys. Never
//   modifies the database. It ONLY returns creative recommendations and
//   structured website content. Claude remains the builder.
//
// Nothing in this file (or the whole studio/ module) imports prisma, the
// filesystem, or any deploy path — the request/response shapes below are
// plain data in, plain advice out.

import type { SectionKind } from "@/types";

/** The creative jobs Claude can ask the Studio to do. */
export type StudioTask =
  | "recommend_layout" // order + variant per section for this occasion
  | "organize_uploads" // sort raw uploads into cover / gallery / timeline
  | "suggest_cover" // pick the strongest hero/cover image
  | "dedupe_media" // flag likely duplicate uploads
  | "build_timeline" // group dated media into a story timeline
  | "detect_sections" // which sections the material already fills
  | "enhance"; // the full pass — everything above, together

/** One uploaded asset, described the way the Studio needs to reason about it. */
export interface StudioMediaItem {
  id: string;
  kind: "photo" | "video";
  url: string;
  filename?: string;
  /** Pixel dimensions when known — drives cover/orientation heuristics. */
  width?: number;
  height?: number;
  /** ISO date the media was captured, when known — drives the timeline. */
  takenAt?: string;
  caption?: string;
}

/** What Claude sends the Studio. Pure description — no live handles. */
export interface StudioRequest {
  task: StudioTask;
  /** EXPERIENCE_TYPES id (e.g. "wedding", "baby"). Optional but recommended. */
  occasionType?: string;
  title?: string;
  /** Sections that already have real content on the occasion. */
  existingSections?: SectionKind[];
  /** The uploads to organize / dedupe / place. */
  media?: StudioMediaItem[];
  /** Free-form context from the family or the builder. */
  notes?: string;
}

/** A suggested layout: section order + a variant name per section. */
export interface StudioLayout {
  sectionOrder: SectionKind[];
  variants: Partial<Record<SectionKind, string>>;
}

/** A cover/hero suggestion with a plain-language reason. */
export interface StudioCoverSuggestion {
  mediaId: string;
  reason: string;
}

/** One timeline moment the Studio proposes from the material. */
export interface StudioTimelineMoment {
  /** ISO date if known; omitted when the moment is undated. */
  date?: string;
  title: string;
  mediaIds: string[];
}

/** A cluster of uploads the Studio believes are duplicates/near-duplicates. */
export interface StudioDuplicateGroup {
  mediaIds: string[];
  reason: string;
}

/**
 * Warm, encouraging "why" for each recommendation — the Creative Director
 * explaining its thinking. HONESTY RULE: every line is grounded in a real
 * signal the Studio actually has (orientation, resolution, capture dates,
 * captions, counts, the occasion catalog). It never claims to judge visual
 * quality it cannot see (lighting, expressions, gaze) and never criticizes —
 * it only inspires ("consider adding…", "if these memories exist…").
 */
export interface StudioRationale {
  cover?: string;
  gallery?: string;
  timeline?: string;
  layout?: string;
  missing?: string;
}

/**
 * A manifestation / inspirational line for an occasion. Drawn ONLY from the
 * curated library (see occasion-soul.ts) — never generated on the fly, never
 * scraped from a real author without attribution. `attribution` is present
 * only when the curated entry has a known, intended source.
 */
export interface StudioManifestation {
  text: string;
  attribution?: string;
}

/**
 * The Studio's answer. Every advisory field is OPTIONAL — a task fills in
 * only what it produced. This is structured content and recommendations
 * ONLY; it never contains code, migrations, or commands.
 */
export interface StudioRecommendation {
  task: StudioTask;
  /** Where the advice came from — honest provenance, never faked. */
  source: "openai" | "heuristic";
  /** One warm sentence a builder or member can read. */
  summary: string;
  layout?: StudioLayout;
  coverSuggestion?: StudioCoverSuggestion;
  /** Gallery display order, by media id. */
  galleryOrder?: string[];
  timeline?: StudioTimelineMoment[];
  /** Sections the material already supports. */
  detectedSections?: SectionKind[];
  /** Sections worth adding that aren't filled yet. */
  missingSections?: SectionKind[];
  /**
   * Gentle, occasion-specific "memory moments" worth capturing — inspiration,
   * NOT a claim that they're missing (the Studio can't see inside photos).
   * Framed as "consider adding, if these memories exist."
   */
  memoryIdeas?: string[];
  duplicates?: StudioDuplicateGroup[];
  /** The warm "why" behind each recommendation. Encouraging, never critical. */
  rationale?: StudioRationale;
  /**
   * The emotional meaning of the occasion — derived ENTIRELY from the Journey
   * type (a wedding is the beginning of a marriage; a memorial holds grief),
   * NEVER inferred from photographs or guessed relationships. Curated.
   */
  emotionalContext?: string;
  /** The suggested manifestation (first of the curated set for this occasion). */
  manifestation?: StudioManifestation;
  /** The full curated manifestation library for this occasion (for cycling). */
  manifestations?: StudioManifestation[];
  /**
   * A short closing Creative Reflection on the occasion — a warm sentence that
   * makes the family feel the meaning of what they're preserving. Generated
   * only from real signals (the chosen occasion + actual uploaded content);
   * OMITTED entirely when it can't be produced honestly and confidently.
   */
  reflection?: string;
  /** Any extra creative notes, one per line. */
  notes: string[];
}
