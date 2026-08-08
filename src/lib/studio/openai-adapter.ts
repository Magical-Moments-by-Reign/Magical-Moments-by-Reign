// ── Journey Studio™ — OpenAI adapter (Creative Director model) ──
//
// Server-only. Calls OpenAI's Chat Completions endpoint (OpenAI-compatible,
// same shape as the Qwen adapter that powers Ask Magical) to get bespoke
// creative direction, then VALIDATES the JSON against the recommendation
// shape before trusting it. Any failure returns null so the caller falls
// back to the deterministic heuristic — we never surface an unvalidated or
// fabricated answer.
//
// This adapter returns STRUCTURED RECOMMENDATIONS ONLY. It has no ability to
// run code, deploy, or touch the database — it makes one outbound HTTPS call
// and parses text. That is the whole of its power.
//
// Env (all optional; the Studio degrades to heuristics without them):
//   OPENAI_API_KEY   — required to go live
//   OPENAI_BASE_URL  — default https://api.openai.com/v1
//   OPENAI_STUDIO_MODEL — default gpt-4o-mini

import type { SectionKind } from "@/types";
import type { StudioRecommendation, StudioRequest } from "./types";

const SECTION_KINDS: SectionKind[] = ["hero", "story", "gallery", "timeline", "quote", "details", "guestbook", "footer"];

/** True when a live OpenAI key is configured for the Studio. */
export function studioAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM = `You are Journey Studio, the internal Creative Director for "Magical Moments by Reign" — a warm luxury platform where families preserve life's biggest moments (weddings, babies, graduations, new homes, memorials, and more).

YOUR ROLE: Given an occasion and its uploaded media, return CREATIVE DIRECTION as JSON — the best section order and layout, the strongest cover image, a sensible gallery order, a timeline grouped from dated media, likely duplicate uploads, and which sections are missing. You organize and enhance; you make the family's material shine.

HARD LIMITS: You never write code, never deploy, never touch a database, never invent media that wasn't provided. You reference media only by the ids given to you. You return ONLY the JSON object described — no prose, no code fences.

Palette is warm luxury: cream, ivory, chocolate, champagne gold. Keep direction tasteful and timeless, never loud.

ALWAYS EXPLAIN YOUR THINKING. For every recommendation, give a warm, encouraging "why" in the "rationale" object. Also add "memoryIdeas" (gentle, occasion-specific moments worth capturing) and a short closing "reflection" on what this occasion means.

TONE (non-negotiable): Always encourage, never criticize. Never say photos are poor, few, or low quality. Never make the family feel they failed to capture enough. Use invitations like "Consider adding…", "If available…", "This could make your story even richer…", "If these memories exist…". Inspire; never judge.

GROUNDING (honesty): You are given only media METADATA (id, kind, dimensions, capture date, caption) — NOT the pixels. So NEVER claim things you cannot verify from that metadata: do not say the lighting is good, that people are smiling, or that everyone looks at the camera. Base every "why" on real signals you DO have: orientation/resolution (for cover), capture order/dates (for gallery/timeline), captions, counts, and the occasion. Generate the "reflection" ONLY from the occasion and the fact that real content exists; if you cannot write one honestly, OMIT the "reflection" key entirely. Never invent names, places, or events.

Return a JSON object with these optional keys (include only what the task needs):
{
  "summary": string,                       // one warm sentence
  "layout": { "sectionOrder": SectionKind[], "variants": { [SectionKind]: string } },
  "coverSuggestion": { "mediaId": string, "reason": string },
  "galleryOrder": string[],                // media ids
  "timeline": [ { "date"?: string, "title": string, "mediaIds": string[] } ],
  "detectedSections": SectionKind[],
  "missingSections": SectionKind[],
  "memoryIdeas": string[],                 // gentle moment suggestions, e.g. "The invitation", "Family portraits"
  "duplicates": [ { "mediaIds": string[], "reason": string } ],
  "rationale": { "cover"?: string, "gallery"?: string, "timeline"?: string, "layout"?: string, "missing"?: string },
  "reflection": string,                    // OMIT if you can't write one honestly
  "notes": string[]
}
SectionKind is one of: hero, story, gallery, timeline, quote, details, guestbook, footer.`;

/** Only keep section kinds we actually support. */
function cleanSections(v: unknown): SectionKind[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((s): s is SectionKind => typeof s === "string" && (SECTION_KINDS as string[]).includes(s));
  return out.length ? out : undefined;
}

/** Only keep ids that were actually in the request — the model may never invent media. */
function cleanIds(v: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((id): id is string => typeof id === "string" && allowed.has(id));
}

/**
 * Validate + sanitize the model's JSON into a trustworthy StudioRecommendation,
 * or return null if it isn't usable. Sanitizing (not just accepting) is the
 * safety boundary: media ids are constrained to the ones we sent, sections to
 * the ones we support.
 */
function validate(raw: unknown, req: StudioRequest): StudioRecommendation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const allowedIds = new Set((req.media ?? []).map((m) => m.id));

  const rec: StudioRecommendation = {
    task: req.task,
    source: "openai",
    summary: typeof o.summary === "string" && o.summary.trim() ? o.summary.trim() : "Journey Studio prepared creative direction for this occasion.",
    notes: Array.isArray(o.notes) ? o.notes.filter((n): n is string => typeof n === "string") : [],
  };

  // layout
  if (o.layout && typeof o.layout === "object") {
    const l = o.layout as Record<string, unknown>;
    const order = cleanSections(l.sectionOrder);
    if (order) {
      const variants: Partial<Record<SectionKind, string>> = {};
      if (l.variants && typeof l.variants === "object") {
        for (const [k, val] of Object.entries(l.variants as Record<string, unknown>)) {
          if ((SECTION_KINDS as string[]).includes(k) && typeof val === "string") variants[k as SectionKind] = val;
        }
      }
      rec.layout = { sectionOrder: order, variants };
    }
  }

  // cover
  if (o.coverSuggestion && typeof o.coverSuggestion === "object") {
    const c = o.coverSuggestion as Record<string, unknown>;
    if (typeof c.mediaId === "string" && allowedIds.has(c.mediaId)) {
      rec.coverSuggestion = { mediaId: c.mediaId, reason: typeof c.reason === "string" ? c.reason : "" };
    }
  }

  // gallery order
  const gallery = cleanIds(o.galleryOrder, allowedIds);
  if (gallery.length) rec.galleryOrder = gallery;

  // timeline
  if (Array.isArray(o.timeline)) {
    const timeline = o.timeline
      .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
      .map((t) => ({
        date: typeof t.date === "string" ? t.date : undefined,
        title: typeof t.title === "string" ? t.title : "Moment",
        mediaIds: cleanIds(t.mediaIds, allowedIds),
      }))
      .filter((t) => t.mediaIds.length > 0 || t.date);
    if (timeline.length) rec.timeline = timeline;
  }

  // detected / missing sections
  const detected = cleanSections(o.detectedSections);
  if (detected) rec.detectedSections = detected;
  const missing = cleanSections(o.missingSections);
  if (missing) rec.missingSections = missing;

  // duplicates
  if (Array.isArray(o.duplicates)) {
    const dups = o.duplicates
      .filter((d): d is Record<string, unknown> => Boolean(d) && typeof d === "object")
      .map((d) => ({ mediaIds: cleanIds(d.mediaIds, allowedIds), reason: typeof d.reason === "string" ? d.reason : "" }))
      .filter((d) => d.mediaIds.length > 1);
    if (dups.length) rec.duplicates = dups;
  }

  // memory ideas — gentle inspiration; keep non-empty strings only.
  if (Array.isArray(o.memoryIdeas)) {
    const ideas = o.memoryIdeas
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 12);
    if (ideas.length) rec.memoryIdeas = ideas;
  }

  // rationale — the warm "why" per area; keep only known string fields.
  if (o.rationale && typeof o.rationale === "object") {
    const r = o.rationale as Record<string, unknown>;
    const rationale: NonNullable<StudioRecommendation["rationale"]> = {};
    for (const k of ["cover", "gallery", "timeline", "layout", "missing"] as const) {
      if (typeof r[k] === "string" && (r[k] as string).trim()) rationale[k] = (r[k] as string).trim();
    }
    if (Object.keys(rationale).length) rec.rationale = rationale;
  }

  // reflection — omitted entirely when absent (never invented downstream).
  if (typeof o.reflection === "string" && o.reflection.trim()) rec.reflection = o.reflection.trim();

  return rec;
}

/**
 * Ask the OpenAI model for creative direction. Returns a validated
 * StudioRecommendation, or null on any failure (missing key, network,
 * non-OK response, unparseable/invalid JSON) so the caller can fall back.
 */
export async function openaiRecommend(req: StudioRequest): Promise<StudioRecommendation | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_STUDIO_MODEL || "gpt-4o-mini";

  // Keep the payload lean and safe: describe the occasion + media compactly.
  const brief = {
    task: req.task,
    occasionType: req.occasionType,
    title: req.title,
    existingSections: req.existingSections,
    notes: req.notes?.slice(0, 2000),
    media: (req.media ?? []).slice(0, 200).map((m) => ({
      id: m.id,
      kind: m.kind,
      filename: m.filename,
      width: m.width,
      height: m.height,
      takenAt: m.takenAt,
      caption: m.caption,
    })),
  };

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(brief) },
        ],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }
    return validate(parsed, req);
  } catch {
    return null;
  }
}
