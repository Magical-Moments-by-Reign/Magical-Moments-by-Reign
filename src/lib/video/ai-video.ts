// ── AI video rules ──────────────────────────────────────────────
// Two hard rules for any AI-generated or AI-enhanced video:
//
// 1. NO BAKED-IN TEXT. Never ask Kling (or any generative video model)
//    to render lettering, names, dates, signs, banners, logos, or any
//    readable words. Generate clean visual footage only, then add
//    accurate text afterward through the Magical Moments
//    video-composition system.
//
// 2. REQUIRED NOTICE. Every AI-generated/enhanced video must display
//    the notice below beneath it.

export const AI_VIDEO_NOTICE =
  "AI-generated or AI-enhanced video may contain unexpected visual errors, " +
  "altered details, or inconsistencies. Please review all content before " +
  "publishing. Magical Moments by Reign is not responsible for AI-generation errors.";

// Words/instructions we must strip from any generative-video prompt so
// the model produces clean footage with no readable text. The real
// video pipeline calls sanitizeGenerativePrompt() before sending.
const TEXT_INSTRUCTION_PATTERNS: RegExp[] = [
  /\b(text|caption|title|subtitle|lettering|words?|writing|typography)\b/gi,
  /\b(name|names|date|dates|sign|signs|banner|banners|logo|logos|watermark)\b/gi,
  /\bthat says\b/gi,
  /\bwith the words?\b/gi,
  /\bspelling\b/gi,
];

export interface PromptSanitizeResult {
  prompt: string;
  removed: string[];
  changed: boolean;
}

/**
 * Strip text-rendering instructions from a generative-video prompt so
 * the model returns clean footage. Accurate text is composited later.
 */
export function sanitizeGenerativePrompt(input: string): PromptSanitizeResult {
  const removed: string[] = [];
  let prompt = input;
  for (const re of TEXT_INSTRUCTION_PATTERNS) {
    prompt = prompt.replace(re, (m) => {
      removed.push(m);
      return "";
    });
  }
  prompt = prompt.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
  return { prompt, removed, changed: removed.length > 0 };
}
