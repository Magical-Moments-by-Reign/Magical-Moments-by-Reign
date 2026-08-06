// ── Journey Studio™ — the internal Creative Director ────────────
//
// THREE-AI ARCHITECTURE (as designed by the owner):
//   • Claude          — Chief Software Engineer. Builds the platform. The
//                       ONLY agent that writes code, deploys, or touches the DB.
//   • Ask Magical     — customer-facing Concierge (Qwen). See ask-magical.ts.
//   • Journey Studio  — this module. The INTERNAL Creative Director that
//                       Claude calls to design, organize, and enhance
//                       occasions (layouts, cover images, gallery order,
//                       timelines, duplicate detection, missing sections).
//
// HARD CONSTRAINT (verbatim, enforced by construction):
//   "Journey Studio never edits production code. Journey Studio never deploys.
//    Journey Studio never modifies the database. Journey Studio only returns
//    creative recommendations and structured website content. Claude remains
//    the builder."
//
// How that constraint is guaranteed here — not merely promised:
//   The entire studio/ module imports NO prisma, NO filesystem, NO
//   child_process, NO deploy path. Its only side effect is one optional
//   outbound HTTPS call to the creative model (openai-adapter.ts). Given a
//   StudioRequest it returns a StudioRecommendation — plain data in, plain
//   advice out. Applying that advice (writing content, moving media, saving
//   a layout) is always a separate, explicit step performed by Claude/the
//   app, never by the Studio itself.
//
// Honesty: when no OPENAI_API_KEY is set, or the live call fails, the Studio
// still returns real, deterministic curation (source: "heuristic") — it never
// fabricates an "AI" answer and always reports where its advice came from.

import { heuristicRecommend } from "./heuristics";
import { openaiRecommend, studioAiConfigured } from "./openai-adapter";
import type { StudioRecommendation, StudioRequest } from "./types";

export type {
  StudioTask,
  StudioMediaItem,
  StudioRequest,
  StudioLayout,
  StudioCoverSuggestion,
  StudioTimelineMoment,
  StudioDuplicateGroup,
  StudioRecommendation,
} from "./types";
export { studioAiConfigured } from "./openai-adapter";

/**
 * Run Journey Studio for one creative task.
 *
 * AI HOOK: when OPENAI_API_KEY is configured we ask the creative model,
 * validate its JSON, and use it; on any failure we fall back to the
 * deterministic Creative Director so a caller ALWAYS gets a usable answer.
 * The return value is advice only — the caller decides what to apply.
 */
export async function runJourneyStudio(req: StudioRequest): Promise<StudioRecommendation> {
  if (studioAiConfigured()) {
    const live = await openaiRecommend(req);
    if (live) return live;
    // Live path failed (network / bad JSON / invalid) — degrade honestly.
    const fallback = heuristicRecommend(req);
    fallback.notes.push("Journey Studio's live model was unavailable for this request; used deterministic curation instead.");
    return fallback;
  }
  return heuristicRecommend(req);
}
