// ── Magical Sports Data Policy — tiers 3 & 4 ────────────────────────
// Full source priority for any sports fact: (1) API-Sports, (2) SportsDataIO,
// (3) a verified official league/team machine-readable feed, (4) a manually
// curated fact confirmed as officially announced, (5) graceful unavailable.
// Tiers 1-2 live in providers/sports.ts and providers/sportsdata.ts; this
// module is the shared, reusable tier-3/tier-4 layer every sport's fallback
// chain reads from, instead of one-off constants scattered through
// page/service code.
//
// Tier 3 is deliberately empty today. It exists so a real, verified
// official API/JSON/RSS feed can be wired in the moment one is confirmed —
// but no league currently publishes one of those for free public
// consumption that's been verified and tested here. HTML scraping a league
// site is explicitly excluded from this tier (fragile, likely against that
// site's terms of use, and indistinguishable from "made it up" the moment
// the page layout changes) — never add one on a guess.
//
// Tier 4 holds specific facts a human has confirmed as officially
// announced (the Owner, today) — a date, never a matchup/score/roster
// move. The instant a live provider or a real feed returns the same
// milestone, that takes over automatically; the fact just sits here idle.

import type { SportSlug } from "../providers/sports";

export type OfficialFactKind = "preseason_opener_date" | "regular_season_opener_date";

export interface OfficialDateFact {
  dateOnly: string; // "YYYY-MM-DD" — a calendar date, never a fabricated time
  verifiedAt: string; // ISO — when this was entered, for admin auditability
  note?: string; // provenance, admin-only, never shown to members
}

interface OfficialFeed {
  fetchDate(kind: OfficialFactKind): Promise<string | null>;
}

// Tier 3 registry — empty until a real, verified feed is wired in. See the
// module doc comment above for why this isn't populated with a guess.
const OFFICIAL_FEEDS: Partial<Record<SportSlug, OfficialFeed>> = {};

// Tier 4 registry — grows as specific milestones get manually confirmed.
const KNOWN_DATE_FACTS: Partial<Record<SportSlug, Partial<Record<OfficialFactKind, OfficialDateFact>>>> = {
  nba: {
    preseason_opener_date: { dateOnly: "2026-10-03", verifiedAt: "2026-08-21", note: "Owner-confirmed, NBA-announced" },
    regular_season_opener_date: { dateOnly: "2026-10-20", verifiedAt: "2026-08-21", note: "Owner-confirmed, NBA-announced" },
  },
};

export function getKnownDateFact(sport: SportSlug, kind: OfficialFactKind): OfficialDateFact | null {
  return KNOWN_DATE_FACTS[sport]?.[kind] ?? null;
}

export type SourceTier = "api-sports" | "sportsdata" | "official-feed" | "known-fact";
export interface SourceAttempt {
  tier: SourceTier;
  outcome: "hit" | "empty" | "unconfigured" | "error";
}

/** Resolves a date-type milestone through tiers 3 then 4, given tiers 1-2
 *  (the paid providers) already came back empty — appends both attempts to
 *  the passed-in log for admin diagnostics ("which sources were checked
 *  and why none could answer"), never shown to members. */
export async function resolveOfficialDate(sport: SportSlug, kind: OfficialFactKind, log: SourceAttempt[]): Promise<string | null> {
  const feed = OFFICIAL_FEEDS[sport];
  if (feed) {
    try {
      const date = await feed.fetchDate(kind);
      log.push({ tier: "official-feed", outcome: date ? "hit" : "empty" });
      if (date) return date;
    } catch {
      log.push({ tier: "official-feed", outcome: "error" });
    }
  } else {
    log.push({ tier: "official-feed", outcome: "unconfigured" });
  }

  const known = getKnownDateFact(sport, kind);
  log.push({ tier: "known-fact", outcome: known ? "hit" : "empty" });
  return known?.dateOnly ?? null;
}
