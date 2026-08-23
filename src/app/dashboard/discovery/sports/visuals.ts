import type { SportSlug } from "@/lib/discovery/providers/sports";
import type { SportGlyphKey } from "./SportGlyph";

// Sport identity vs. league identity, resolved through one registry instead
// of hard-coded per-card exclusions. "league-logo" cards try the real
// provider-returned league mark first (getLeagueLogos(), live from
// API-Sports) and fall back to the original glyph only when the provider
// has nothing — never three-letter text. "sport-icon" cards are broad
// categories that span many competitions (Soccer, Rugby, Volleyball, MMA)
// and always use the original glyph: a single competition's real crest
// (e.g. the Premier League) must never stand in for the whole sport.
export interface SportVisual {
  kind: "league-logo" | "sport-icon";
  glyph: SportGlyphKey;
}

export const SPORT_VISUALS: Record<SportSlug, SportVisual> = {
  nfl: { kind: "league-logo", glyph: "football" },
  ncaaf: { kind: "league-logo", glyph: "football" },
  nba: { kind: "league-logo", glyph: "basketball" },
  wnba: { kind: "league-logo", glyph: "basketball" },
  ncaab: { kind: "league-logo", glyph: "basketball" },
  mlb: { kind: "league-logo", glyph: "baseball" },
  ncaabaseball: { kind: "league-logo", glyph: "baseball" },
  nhl: { kind: "league-logo", glyph: "hockey" },
  f1: { kind: "league-logo", glyph: "racing" },
  soccer: { kind: "sport-icon", glyph: "soccer" },
  rugby: { kind: "sport-icon", glyph: "rugby" },
  volleyball: { kind: "sport-icon", glyph: "volleyball" },
  mma: { kind: "sport-icon", glyph: "mma" },
};
