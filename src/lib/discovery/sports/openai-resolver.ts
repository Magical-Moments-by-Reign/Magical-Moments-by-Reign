// ── Sports OpenAI Verified Fallback — NBA rosters only (SERVER ONLY) ─────
// Phase 1 of the "Verified Sports Data Source Ladder": when API-Sports and
// SportsDataIO (and their own cached last-known-good rosters) genuinely
// have nothing for an NBA team, this resolves the roster via OpenAI's
// Responses API + web_search, restricted to nba.com, and normalizes the
// retrieved evidence into our roster schema.
//
// This is the FIRST FEATURE ADAPTER of the shared platform-wide OpenAI
// foundation in ../../openai/ (responses.ts = transport, web-search.ts =
// evidence retrieval, trusted-sources.ts = domain policy, provenance.ts =
// the generic result shape) — everything Sports-specific lives here
// (trusted NBA domains, prompts, roster schema, roster-specific validation
// like "suspiciously few players" and duplicate detection); everything
// reusable by a future Travel/Events/Entertainment resolver lives in
// ../../openai/. Do not re-implement web_search evidence handling here —
// call the shared runWebSearchEvidence instead.
//
// HARD INVARIANT, same discipline as journey-narrative.ts (which this file
// does NOT modify or share code with — that module narrates facts already
// verified elsewhere; this module IS a fact source, for a different domain,
// with its own evidence-validation gate):
//   - Never accept an uncited "model knowledge" answer as data.
//   - Every fact returned must be traceable to a real, retained nba.com
//     source URL from an ACTUAL executed web_search call — not the
//     model's own training knowledge.
//   - Any validation failure returns null. Never a guessed/partial roster.
//
// Two-step design (search, then normalize) rather than one combined
// web_search + structured-output call — deliberately, because this
// sandbox has no live OPENAI_API_KEY to confirm that exact combination is
// supported by the account's available models. Two plain, separately
// well-documented Responses API calls (web_search alone; structured output
// alone) is the safer bet until an Owner does live verification (see the
// PR description's Owner Verification Steps).
//
// TRUSTED_NBA_DOMAINS is deliberately just "nba.com" for this phase, not a
// 30-team list of individual official team domains — this codebase has no
// way to verify 30 individual domain names from this sandbox, and nba.com
// itself carries every team's official roster page (nba.com/team/...), so
// restricting to it avoids guessing a domain that turns out to be wrong,
// expired, or fan-run.

import { withCache, cacheKeyFor } from "../cache";
import { callOpenAIResponses, openaiResponsesConfigured, extractResponseTextAndCitations } from "../../openai/responses";
import { runWebSearchEvidence } from "../../openai/web-search";
import type { VerifiedDataProvenance } from "../../openai/provenance";

export const TRUSTED_NBA_DOMAINS = ["nba.com"];

// NEEDS LIVE VERIFICATION (see PR description): this must be a real model
// in the account's catalog that supports both the Responses API `web_search`
// tool and strict JSON-schema structured output. "gpt-4o" is the most
// broadly-documented choice as of this codebase's knowledge — same
// "unverified until live key" honesty this codebase already applies
// elsewhere (see journey-narrative.ts's OPENAI_JOURNEY_MODEL comment). A
// separate env var from the other three integrations' model vars —
// OPENAI_JOURNEY_MODEL is already reused by two unrelated features
// (Journey Engine + the Sports narrator); this doesn't add a third.
const DEFAULT_MODEL = "gpt-4o";
function resolverModel(): string {
  return process.env.OPENAI_SPORTS_RESOLVER_MODEL || DEFAULT_MODEL;
}

const PROVIDER_TIMEOUT_MS = 20_000;
const TTL_OPENAI_ROSTER_MINUTES = 1440; // 24h — this IS the "don't search once per page view" cost control; withCache also transparently serves a stale row when a fresh search fails, so a temporary OpenAI outage never erases a previously verified roster.
const MIN_ROSTER_SIZE = 5; // NBA active rosters run ~12-17 — a handful or fewer is the "suspiciously empty" signal called out in the evidence-validation policy, not a real roster.

export interface OpenAiRosterPlayer {
  name: string;
  position?: string;
  number?: number;
  // photoUrl is deliberately never populated in this phase — the
  // freeform web_search evidence this resolver reads doesn't reliably
  // carry a usable, policy-permitted image URL, and a missing photo must
  // never invalidate an otherwise verified roster (per the roster
  // contract), so the honest choice is to omit it entirely rather than
  // guess at extracting one.
}

/** Sports' own provenance shape — the shared VerifiedDataProvenance base
 *  plus a `sourceType` field the roster contract calls for. Extending
 *  (rather than duplicating) the shared shape so any future consumer that
 *  only cares about the generic fields can treat this as one. */
export interface SportsDataProvenance extends VerifiedDataProvenance {
  resolver: "openai_web_search";
  sourceType: "official_web";
}

export interface OpenAiRosterResult {
  players: OpenAiRosterPlayer[];
  provenance: SportsDataProvenance;
}

function searchPrompt(teamName: string): string {
  return [
    `Search nba.com for the CURRENT active roster of the NBA team "${teamName}".`,
    `Only use information found on nba.com or its team subpages — do not use any other site.`,
    `For every player you can verify from the page(s) you actually retrieve, report: full name, position (if listed), and jersey number (if listed).`,
    `List one player per line, plainly. Do not include any player you cannot confirm from what you actually retrieved.`,
    `Do not add commentary, headers, or explanation beyond the player list.`,
  ].join("\n");
}

function normalizePrompt(evidenceText: string): string {
  return [
    "You are given EVIDENCE TEXT retrieved from an authoritative web search about an NBA team's roster.",
    "Extract ONLY the players explicitly named in the evidence into the roster schema.",
    "Never invent, infer, or add a player, position, or jersey number that is not explicitly present in the evidence.",
    "If a position or jersey number is not given for a player in the evidence, use null for that field rather than guessing.",
    "EVIDENCE TEXT:",
    evidenceText.slice(0, 6000),
  ].join("\n");
}

const ROSTER_JSON_SCHEMA = {
  type: "object",
  properties: {
    players: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          position: { type: ["string", "null"] },
          number: { type: ["number", "null"] },
        },
        required: ["name", "position", "number"],
        additionalProperties: false,
      },
    },
  },
  required: ["players"],
  additionalProperties: false,
} as const;

/** Strict, defensive parse: any malformed entry, missing name, or duplicate
 *  player name rejects the WHOLE roster (never a partial/best-effort
 *  result) — a duplicate is treated as a signal the extraction itself is
 *  unreliable, not something to silently de-duplicate and trust. This is
 *  Sports-specific validation (roster shape, "suspiciously few players")
 *  and stays here rather than in the shared foundation. */
function validateAndCleanRoster(raw: unknown): OpenAiRosterPlayer[] | null {
  if (!raw || typeof raw !== "object") return null;
  const players = (raw as any).players;
  if (!Array.isArray(players)) return null;
  const seen = new Set<string>();
  const out: OpenAiRosterPlayer[] = [];
  for (const p of players) {
    if (!p || typeof p !== "object") return null;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (!name) return null;
    const key = name.toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    out.push({
      name,
      position: typeof p.position === "string" && p.position.trim() ? p.position.trim() : undefined,
      number: typeof p.number === "number" ? p.number : undefined,
    });
  }
  if (out.length < MIN_ROSTER_SIZE) return null;
  return out;
}

/** Step 2: normalize step 1's retrieved evidence into the strict roster
 *  schema. No web_search tool here — this call may only reorganize the
 *  evidence text it's given, never add a fact. */
async function runNormalizeStep(evidenceText: string): Promise<OpenAiRosterPlayer[] | null> {
  const result = await callOpenAIResponses(
    {
      model: resolverModel(),
      input: normalizePrompt(evidenceText),
      text: { format: { type: "json_schema", name: "nba_roster", schema: ROSTER_JSON_SCHEMA, strict: true } },
    },
    { timeoutMs: PROVIDER_TIMEOUT_MS },
  );
  if (!result.ok) return null;
  const { text } = extractResponseTextAndCitations(result.body);
  if (!text.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return validateAndCleanRoster(parsed);
}

async function fetchAndValidate(teamName: string): Promise<OpenAiRosterResult | null> {
  const search = await runWebSearchEvidence(searchPrompt(teamName), { model: resolverModel(), allowedDomains: TRUSTED_NBA_DOMAINS, timeoutMs: PROVIDER_TIMEOUT_MS });
  if (!search) return null;
  const players = await runNormalizeStep(search.text);
  if (!players) return null;
  const now = new Date().toISOString();
  return {
    players,
    provenance: {
      resolver: "openai_web_search",
      sourceType: "official_web",
      sources: search.citations.map((c) => ({ title: c.title, url: c.url })),
      verifiedAt: now,
      fetchedAt: now,
    },
  };
}

/**
 * The NBA roster fallback entry point — Tiers 3+4 of the ladder combined:
 * withCache serves a fresh OR stale previously-verified result first
 * (never re-searching on every page view, and never letting a temporary
 * OpenAI outage erase a roster that was genuinely verified before); only
 * when neither exists does it run a live web_search. A validation failure
 * anywhere in the chain returns null from `fetchAndValidate`, which
 * withCache treats exactly like a provider outage — never cached as a
 * valid (but wrong) empty result. Generic across every NBA team — no
 * per-team logic, hardcoding, or special-casing.
 */
export async function resolveNbaRosterViaOpenAI(teamName: string): Promise<OpenAiRosterResult | null> {
  if (!openaiResponsesConfigured()) return null;
  const cached = await withCache("sports", "openai", cacheKeyFor({ sport: "nba", team: teamName, kind: "roster_openai" }), TTL_OPENAI_ROSTER_MINUTES, () => fetchAndValidate(teamName));
  return cached?.data ?? null;
}
