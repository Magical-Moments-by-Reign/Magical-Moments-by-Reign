// ── OpenAI Responses API — shared transport (SERVER ONLY) ────────────────
// The one place that knows how to POST to /v1/responses. No feature's
// business logic lives here — a caller passes a request body and gets back
// the raw parsed response or a typed, honest failure reason. Never throws,
// never logs the key or any request/response body.
//
// This is intentionally separate from the three existing OpenAI
// integrations in this codebase (src/lib/studio/openai-adapter.ts,
// src/lib/journey/runtime.ts, src/lib/discovery/sports/journey-narrative.ts)
// — all three call the older Chat Completions endpoint and have their own
// feature-specific validation baked in. They are NOT migrated to this
// transport here; that would widen this PR's scope well beyond what it's
// for. This file exists for callers that specifically need the Responses
// API (web_search + structured output), starting with the Sports roster
// resolver in ../discovery/sports/openai-resolver.ts.
//
// Env (optional; every caller degrades to an "unconfigured" failure without
// it — never a fabricated result):
//   OPENAI_API_KEY   — required to go live
//   OPENAI_BASE_URL  — default https://api.openai.com/v1

const DEFAULT_TIMEOUT_MS = 20_000;

/** True when a live OpenAI key is configured for Responses API callers. */
export function openaiResponsesConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type OpenAIResponsesFailureReason = "unconfigured" | "timeout" | "network" | "http_error" | "invalid_json";

export interface OpenAIResponsesResult {
  ok: true;
  status: number;
  body: any;
}

export interface OpenAIResponsesFailure {
  ok: false;
  reason: OpenAIResponsesFailureReason;
  status?: number;
}

/**
 * One raw POST to /v1/responses. Never throws — every failure mode (missing
 * key, network error, timeout, non-2xx status, unparseable body) comes back
 * as a typed failure so callers degrade honestly instead of crashing a
 * route or a serverless function running past its execution-time limit.
 */
export async function callOpenAIResponses(
  body: Record<string, unknown>,
  opts?: { timeoutMs?: number },
): Promise<OpenAIResponsesResult | OpenAIResponsesFailure> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, reason: "unconfigured" };
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: "http_error", status: res.status };
    try {
      const json = await res.json();
      return { ok: true, status: res.status, body: json };
    } catch {
      return { ok: false, reason: "invalid_json", status: res.status };
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

/** True only when the Responses API's `output` array actually contains a
 *  web_search tool call — the hard evidence that a live search executed,
 *  not just that the model was asked to search. Defensive against any
 *  output shape: never throws on an unexpected body. */
export function responseIncludesWebSearchCall(body: any): boolean {
  const output = body?.output;
  if (!Array.isArray(output)) return false;
  return output.some((item: any) => item?.type === "web_search_call");
}

export interface ResponseCitation {
  title?: string;
  url: string;
}

/** Extracts the final assistant text and every retained URL citation from a
 *  Responses API body. Walks the `output` array defensively — an
 *  unexpected/changed shape yields an empty result rather than throwing, so
 *  a caller's own evidence-validation (never trust an uncited answer) is
 *  what actually gates whether the result is usable. */
export function extractResponseTextAndCitations(body: any): { text: string; citations: ResponseCitation[] } {
  const output = Array.isArray(body?.output) ? body.output : [];
  let text = "";
  const citations: ResponseCitation[] = [];
  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      if (typeof part?.text === "string") text += part.text;
      const annotations = Array.isArray(part?.annotations) ? part.annotations : [];
      for (const a of annotations) {
        if (a?.type === "url_citation" && typeof a?.url === "string") {
          citations.push({ title: typeof a.title === "string" ? a.title : undefined, url: a.url });
        }
      }
    }
  }
  return { text, citations };
}
