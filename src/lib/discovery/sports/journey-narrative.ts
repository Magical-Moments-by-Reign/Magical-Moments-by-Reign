// ── Journey Narrative Generator (SERVER ONLY) ───────────────────────
// The final NARRATIVE layer only — never a factual source. Every fact in
// the output must already be present in the FACTS passed in (built from
// verified providers: SportsDataIO, API-Sports, Wikidata, the curated
// override registry). The model may rewrite, organize, and narrate those
// facts into warm prose; it must never add a statistic, team, award,
// injury, personal detail, motivation, or accomplishment that wasn't
// explicitly supplied. Same "structured recommendation, validated before
// trust" discipline as src/lib/studio/openai-adapter.ts — this module
// additionally never lets the model introduce new facts, only reorganize
// given ones, so there's no id/field allowlist to validate against, just a
// strict system prompt plus a graceful null on any failure.
//
// Cached by a hash of the exact facts passed in (see cacheKeyFor) — an
// unchanged set of facts always hits the cache; a real fact changing (a
// new team, transaction, award, or completed season) naturally produces a
// different hash and regenerates. This is the "regenerate only when
// meaningful facts change" rule, enforced structurally rather than by a
// short TTL.
//
// Env (all optional; the page falls back to the plain verified timeline
// without them):
//   OPENAI_API_KEY       — required to go live
//   OPENAI_BASE_URL      — default https://api.openai.com/v1
//   OPENAI_JOURNEY_MODEL — default gpt-5.4-mini (unverified against a live
//     key in this environment; if the account's real model catalog rejects
//     it, set this env var to a confirmed model id — a bad model id just
//     fails the request and this module degrades to null, never crashes).

import { withCache, cacheKeyFor } from "../cache";

const TTL_NARRATIVE = 60 * 24 * 90; // ~90 days — paired with the facts-hash cache key, this is a cost/staleness ceiling, not the real invalidation trigger

export interface JourneyFacts {
  name: string;
  highSchool?: string;
  college?: string;
  collegeSeasonsAttended?: string;
  collegeHonors?: string[];
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  draftTeam?: string;
  /** Real, dated career stops in chronological order — "2020–2023 —
   *  Baltimore Ravens" style strings, exactly as the verified timeline
   *  already shows them. The model narrates these, never invents others. */
  careerStops: string[];
  currentTeam?: string;
}

export function journeyNarrativeConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM = `You are the Journey Narrator for Magical Moments by Reign's Player Profile pages — a warm, premium sports experience for paying members.

YOUR ROLE: You are given a FACTS object describing one real athlete's verified career. Rewrite, organize, and narrate ONLY those facts into a short, warm paragraph (2-4 sentences) explaining who this player is and how they got where they are today.

HARD LIMITS (non-negotiable):
- Use ONLY the facts given in the FACTS object. Never add, infer, or imply any statistic, team, award, injury, personal detail, motivation, hardship, or accomplishment that is not explicitly present in FACTS.
- Never invent dates, scores, records, or relationships.
- If FACTS is sparse, write a short, honest narrative using only what's there. Do not pad with generic filler that implies more is known than is given.
- Do not editorialize about the player's character, effort, or future beyond what a neutral reading of FACTS supports.

TONE: Warm, premium, factual — like a trusted concierge introducing a member to a player's real story, never a hype reel and never a fabrication.

Return ONLY a JSON object: {"narrative": string}`;

function narrativeCacheKey(facts: JourneyFacts): string {
  return cacheKeyFor(facts as unknown as Record<string, unknown>);
}

async function callOpenAI(facts: JourneyFacts): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_JOURNEY_MODEL || "gpt-5.4-mini";

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify({ FACTS: facts }) },
        ],
        temperature: 0.3,
        max_tokens: 300,
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
    const narrative = (parsed as any)?.narrative;
    return typeof narrative === "string" && narrative.trim() ? narrative.trim() : null;
  } catch {
    return null;
  }
}

/** Generates a warm narrative from real, already-verified facts — never a
 *  factual source itself. Cached by the exact facts given, so an unchanged
 *  career never regenerates and a real change (new team, award, completed
 *  season) always does. Returns null when unconfigured or on any failure —
 *  the caller falls back to the plain verified timeline, never a broken
 *  page. */
export async function generateJourneyNarrative(facts: JourneyFacts): Promise<string | null> {
  if (!journeyNarrativeConfigured()) return null;
  const cached = await withCache("sports", "openai", narrativeCacheKey(facts), TTL_NARRATIVE, () => callOpenAI(facts));
  return cached?.data ?? null;
}
