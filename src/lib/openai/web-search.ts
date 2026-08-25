// ── OpenAI web_search evidence retrieval — shared (SERVER ONLY) ─────────
// One generic "search, then hand back only what's actually cited" step
// that any feature's OpenAI resolver can call — Sports today
// (sports/openai-resolver.ts), and future Travel/Events/Entertainment
// resolvers without re-implementing this validation. Deliberately separate
// from the fact-normalization step (each feature owns its own schema/
// prompt for that) — this file only knows how to run a bounded web_search
// and return trustworthy evidence or null.
//
// HARD INVARIANT: never returns text without at least one retained
// citation, and never returns a citation outside the caller's own
// approved domain list. A caller must still run its own normalization
// step to turn this evidence into structured facts — this never invents
// or infers a fact itself.

import { callOpenAIResponses, responseIncludesWebSearchCall, extractResponseTextAndCitations, type ResponseCitation } from "./responses";
import { isUrlWithinDomains } from "./trusted-sources";

export interface WebSearchEvidence {
  text: string;
  citations: ResponseCitation[];
}

/**
 * Runs one web_search-enabled Responses API call restricted to
 * `allowedDomains`, and returns the retrieved text + citations ONLY when:
 *   - a web_search call actually executed (not just requested)
 *   - at least one citation was retained
 *   - EVERY retained citation is within the approved domain list
 * Any other outcome (unconfigured, network/timeout, off-domain source,
 * no citations at all) returns null — the caller's job is to treat that
 * exactly like "this tier had nothing," never to retry with a weaker
 * standard.
 */
export async function runWebSearchEvidence(prompt: string, opts: { model: string; allowedDomains: readonly string[]; timeoutMs?: number }): Promise<WebSearchEvidence | null> {
  const result = await callOpenAIResponses(
    {
      model: opts.model,
      input: prompt,
      tools: [{ type: "web_search", filters: { allowed_domains: opts.allowedDomains } }],
    },
    { timeoutMs: opts.timeoutMs },
  );
  if (!result.ok) return null;
  if (!responseIncludesWebSearchCall(result.body)) return null;
  const { text, citations } = extractResponseTextAndCitations(result.body);
  if (!text.trim() || citations.length === 0) return null;
  if (!citations.every((c) => isUrlWithinDomains(c.url, opts.allowedDomains))) return null;
  return { text, citations };
}
