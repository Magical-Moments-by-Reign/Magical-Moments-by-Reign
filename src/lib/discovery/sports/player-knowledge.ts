// ── Player Knowledge Provider (SERVER ONLY) ─────────────────────────
// The automated historical/biographical fallback tier for a player
// profile — real structured facts from Wikidata (college attended with
// real date ranges, birth year, full team-membership history including
// college AND pro teams with real start/end years) plus a real, attributed
// Wikipedia summary blurb. This is the general-purpose resolver: it works
// for any real player by name, not a hand-maintained list. A provider that
// has nothing for a given player simply contributes nothing — never a
// fabricated fact standing in for a real one.
//
// Disambiguation confirms a name search found the actual athlete (not a
// same-named stranger) by matching the search result's own real,
// human-written Wikidata description against real sport/position keywords
// — never a hardcoded occupation QID guessed from memory.
//
// Cached long-term (a real historical fact essentially never changes) —
// this tier is meant to run once per player, not on every page view.

import { withCache, cacheKeyFor } from "../cache";
import { searchWikidataPerson, pickAthleteCandidate, getWikidataPersonFacts, getWikipediaSummary, type TeamMembership } from "../providers/wikidata";

const TTL_PLAYER_KNOWLEDGE = 60 * 24 * 180; // ~6 months — real historical facts don't change

export interface PlayerKnowledge {
  qid: string;
  birthYear?: number;
  /** The player's real college, with real attended years, when Wikidata
   *  documents it — undefined when it doesn't, never guessed from the
   *  player's pro-league college field alone. */
  college?: { name: string; startYear?: number; endYear?: number };
  /** Every real team (college and pro) Wikidata documents this player as a
   *  member of, with real date ranges where known — the raw material for
   *  filling real gaps in a player's career timeline. */
  teamHistory: TeamMembership[];
  bioSummary?: { text: string; sourceUrl: string };
}

// Real, sport-appropriate keywords that show up in an athlete's own
// Wikidata description (e.g. "American football wide receiver",
// "basketball guard") — used only to confirm a search candidate is the
// right kind of athlete, never to identify which specific person they are.
const SPORT_KEYWORDS: Record<string, string[]> = {
  nfl: ["american football", "gridiron football"],
  cfb: ["american football", "gridiron football"],
  nba: ["basketball"],
  wnba: ["basketball"],
};

async function resolveKnowledge(name: string, sportKeywords: string[]): Promise<PlayerKnowledge | null> {
  const candidates = await searchWikidataPerson(name).catch(() => []);
  const match = pickAthleteCandidate(candidates, sportKeywords);
  if (!match) return null;

  const facts = await getWikidataPersonFacts(match.qid).catch(() => null);
  if (!facts) return null;

  const summary = await getWikipediaSummary(facts.name).catch(() => null);

  return {
    qid: facts.qid,
    birthYear: facts.birthYear,
    college: facts.educatedAt[0] ? { name: facts.educatedAt[0].label, startYear: facts.educatedAt[0].startYear, endYear: facts.educatedAt[0].endYear } : undefined,
    teamHistory: facts.teamHistory,
    bioSummary: summary ? { text: summary.extract, sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title.replace(/ /g, "_"))}` } : undefined,
  };
}

/** Resolves a real player's automated historical/biographical facts —
 *  cached per player for months, since this genuinely doesn't change once
 *  set. Returns null when no real matching athlete entity can be
 *  confirmed, never a low-confidence guess. */
export async function getPlayerKnowledge(name: string, league: "nfl" | "cfb" | "nba" | "wnba"): Promise<PlayerKnowledge | null> {
  const keywords = SPORT_KEYWORDS[league] ?? [];
  const cached = await withCache("sports", "wikidata", cacheKeyFor({ name, league, kind: "player_knowledge" }), TTL_PLAYER_KNOWLEDGE, () =>
    resolveKnowledge(name, keywords));
  return cached?.data ?? null;
}
