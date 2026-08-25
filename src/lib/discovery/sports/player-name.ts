// ── Shared player-name normalization (pure, SERVER-safe) ────────────────
// One normalization used everywhere a player identity must be matched
// across two independently-sourced rosters (API-Sports <-> SportsDataIO, or
// either <-> the OpenAI verified fallback) — never a fuzzy/substring match,
// always an EXACT match after normalizing away formatting differences a
// real name commonly carries across providers (diacritics, punctuation, a
// trailing generational suffix like "Jr."/"III"). This never conflates two
// DIFFERENT real players — it only closes the gap between two providers'
// different-but-equivalent spellings of the SAME real name. A name that
// still doesn't match after this normalization stays unmatched — never a
// guess.

const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

/** Exported for tests and for every cross-provider player-identity match
 *  site (player-profile.ts's profile-link resolution, service.ts's
 *  roster field-enrichment merge). */
export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "")
    .toLowerCase()
    .replace(/[.,'"]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
