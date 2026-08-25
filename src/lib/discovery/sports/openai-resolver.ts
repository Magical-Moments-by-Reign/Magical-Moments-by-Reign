// ── Sports OpenAI Verified Fallback — NBA/WNBA/NFL rosters (SERVER ONLY) ──
// Phase 1 shipped NBA-only; the shared roster-architecture fix generalized
// this to every league with a real, reviewed trusted-domain policy (see
// ROSTER_RESOLVER_LEAGUES below) — WNBA and NFL joined on the same
// authority basis as NBA (one real, verifiable, league-wide official
// domain). This was a genuine architecture change, not a loosened
// restriction: the underlying rule — "only a league with ONE verified
// official domain gets this fallback" — is unchanged and still the reason
// college football (ncaaf) is deliberately excluded (see that section
// below). When API-Sports and SportsDataIO (and their own cached
// last-known-good rosters) genuinely have nothing for a supported team,
// this resolves the roster via OpenAI's Responses API + web_search,
// restricted to that league's own official domain(s), and normalizes the
// retrieved evidence into our roster schema.
//
// This is the FIRST FEATURE ADAPTER of the shared platform-wide OpenAI
// foundation in ../../openai/ (responses.ts = transport, web-search.ts =
// evidence retrieval, trusted-sources.ts = domain policy, provenance.ts =
// the generic result shape) — everything Sports-specific lives here
// (trusted league domains, prompts, roster schema, roster-specific
// validation like "suspiciously few players" and duplicate detection);
// everything reusable by a future Travel/Events/Entertainment resolver
// lives in ../../openai/. Do not re-implement web_search evidence handling
// here — call the shared runWebSearchEvidence instead.
//
// HARD INVARIANT, same discipline as journey-narrative.ts (which this file
// does NOT modify or share code with — that module narrates facts already
// verified elsewhere; this module IS a fact source, for a different domain,
// with its own evidence-validation gate):
//   - Never accept an uncited "model knowledge" answer as data.
//   - Every fact returned must be traceable to a real, retained citation on
//     the league's own approved domain from an ACTUAL executed web_search
//     call — not the model's own training knowledge.
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
// TRUSTED_NBA_DOMAINS is deliberately just "nba.com" (mirrored by WNBA's
// wnba.com and NFL's nfl.com), not a per-team list of individual official
// team domains — this codebase has no way to verify 30+ individual domain
// names from this sandbox, and each league's own site carries every team's
// official roster page, so restricting to it avoids guessing a domain that
// turns out to be wrong, expired, or fan-run.

import { withCache, cacheKeyFor } from "../cache";
import { callOpenAIResponses, openaiResponsesConfigured, extractResponseTextAndCitations } from "../../openai/responses";
import { runWebSearchEvidence } from "../../openai/web-search";
import type { VerifiedDataProvenance } from "../../openai/provenance";
import type { SportSlug } from "../providers/sports";

export const TRUSTED_NBA_DOMAINS = ["nba.com"];

// ── Generalization beyond NBA (shared roster architecture fix) ──────────
// Only a league with ONE real, verifiable, league-wide official domain that
// reliably publishes every team's current roster gets an OpenAI fallback —
// CLAUDE.md §10: a trusted source is added only after its authority is
// understood, never guessed. WNBA (wnba.com) and NFL (nfl.com) are the same
// authority class as NBA (nba.com) — official league sites, one per league.
//
// College Football (ncaaf) is deliberately ABSENT and must stay that way
// until a real per-domain trusted-source policy is designed and reviewed:
// there are ~130 FBS programs (plus FCS/D2/D3/NAIA) each on their OWN
// independent athletics domain, and no single site plays nba.com's role for
// the whole sport — NCAA.org does not host authoritative live team rosters.
// Guessing or hardcoding a partial school-domain list here would be exactly
// the kind of unreviewed trust-policy CLAUDE.md §10 forbids; the honest
// answer today is "not yet safe," not a weakened approximation of it.
interface RosterResolverLeagueConfig {
  domains: string[];
  /** Human-readable league name for the search prompt (e.g. "NBA"). */
  label: string;
}

const ROSTER_RESOLVER_LEAGUES: Partial<Record<SportSlug, RosterResolverLeagueConfig>> = {
  nba: { domains: TRUSTED_NBA_DOMAINS, label: "NBA" },
  wnba: { domains: ["wnba.com"], label: "WNBA" },
  nfl: { domains: ["nfl.com"], label: "NFL" },
};

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

function searchPrompt(config: RosterResolverLeagueConfig, teamName: string): string {
  const domainList = config.domains.join(" or ");
  return [
    `Search ${domainList} for the CURRENT active roster of the ${config.label} team "${teamName}".`,
    `Only use information found on ${domainList} or their team subpages — do not use any other site.`,
    `For every player you can verify from the page(s) you actually retrieve, report: full name, position (if listed), and jersey number (if listed).`,
    `List one player per line, plainly. Do not include any player you cannot confirm from what you actually retrieved.`,
    `Do not add commentary, headers, or explanation beyond the player list.`,
  ].join("\n");
}

function normalizePrompt(leagueLabel: string, evidenceText: string): string {
  return [
    `You are given EVIDENCE TEXT retrieved from an authoritative web search about a ${leagueLabel} team's roster.`,
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
async function runNormalizeStep(leagueLabel: string, evidenceText: string): Promise<OpenAiRosterPlayer[] | null> {
  const result = await callOpenAIResponses(
    {
      model: resolverModel(),
      input: normalizePrompt(leagueLabel, evidenceText),
      text: { format: { type: "json_schema", name: "roster", schema: ROSTER_JSON_SCHEMA, strict: true } },
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

async function fetchAndValidate(config: RosterResolverLeagueConfig, teamName: string): Promise<OpenAiRosterResult | null> {
  const search = await runWebSearchEvidence(searchPrompt(config, teamName), { model: resolverModel(), allowedDomains: config.domains, timeoutMs: PROVIDER_TIMEOUT_MS });
  if (!search) return null;
  const players = await runNormalizeStep(config.label, search.text);
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
 * The generalized roster fallback entry point — Tiers 3+4 of the ladder
 * combined, for any league with a real, reviewed trusted-domain policy (see
 * ROSTER_RESOLVER_LEAGUES above): withCache serves a fresh OR stale
 * previously-verified result first (never re-searching on every page view,
 * and never letting a temporary OpenAI outage erase a roster that was
 * genuinely verified before); only when neither exists does it run a live
 * web_search. A validation failure anywhere in the chain returns null from
 * `fetchAndValidate`, which withCache treats exactly like a provider outage
 * — never cached as a valid (but wrong) empty result. Generic across every
 * team in a supported league — no per-team logic, hardcoding, or special-
 * casing. Returns null immediately, before any network call, for a league
 * with no entry in ROSTER_RESOLVER_LEAGUES (e.g. ncaaf) — this is the
 * single source of truth for "which sports this fallback covers"; callers
 * never need their own sport allowlist.
 */
export async function resolveRosterViaOpenAI(sport: SportSlug, teamName: string): Promise<OpenAiRosterResult | null> {
  const config = ROSTER_RESOLVER_LEAGUES[sport];
  if (!config || !openaiResponsesConfigured()) return null;
  const cached = await withCache("sports", "openai", cacheKeyFor({ sport, team: teamName, kind: "roster_openai" }), TTL_OPENAI_ROSTER_MINUTES, () => fetchAndValidate(config, teamName));
  return cached?.data ?? null;
}

/** Kept as a thin, byte-compatible wrapper around the generalized resolver
 *  above — same cache key shape ({sport:"nba",...}) and behavior as before
 *  this file was generalized, so nothing that already depends on this exact
 *  export needs to change. Prefer resolveRosterViaOpenAI(sport, teamName)
 *  for any new caller. */
export async function resolveNbaRosterViaOpenAI(teamName: string): Promise<OpenAiRosterResult | null> {
  return resolveRosterViaOpenAI("nba", teamName);
}
