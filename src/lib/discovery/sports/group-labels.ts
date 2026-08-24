// ── Shared conference/division/league DISPLAY formatting (pure, no I/O) ──
// The real provider group value (e.g. API-Sports' actual conference label,
// "Southeastern Conference") is what filtering, caching, and every other
// piece of logic keys on — this module only ever changes how that same
// real string is PRESENTED, never what it equals or how it's compared.
// Previously duplicated verbatim in [sport]/page.tsx and
// team/[sport]/[teamId]/page.tsx; now the one shared source both import
// from, plus TeamDirectory's conference filter.

// A handful of major college conferences have a short form members
// already know them by — matched by the FULL real provider label,
// case-insensitively, never a partial/fuzzy match (a substring match
// risks silently mangling a label this map was never meant to touch).
// A label with no entry here just falls through to the generic casing
// below — never an invented nickname.
const CONFERENCE_NICKNAMES: Record<string, string> = {
  "southeastern conference": "SEC",
  "atlantic coast conference": "ACC",
  "american athletic conference": "AAC",
  "conference usa": "C-USA",
  "mid-american conference": "MAC",
  "big ten conference": "Big Ten",
  "big 12 conference": "Big 12",
  "mountain west conference": "Mountain West",
  "pac-12 conference": "Pac-12",
  "sun belt conference": "Sun Belt",
};

// A few provider group labels get a friendlier, still-accurate display
// form (e.g. a bare "east" becomes "Eastern Conference", matching how the
// league itself refers to it) — every other label is just cased
// consistently.
const GROUP_LABEL_OVERRIDES: Record<string, string> = { east: "Eastern Conference", west: "Western Conference" };
const KNOWN_ABBR = new Set(["afc", "nfc", "al", "nl", "ncaa"]);

/** Formats a real provider group/division/conference label for display —
 *  never mutates or replaces the value anything filters, caches, or
 *  compares by; callers keep using the original raw label for that and
 *  only pass it through here at the point of rendering. Checks the known
 *  major-conference nickname table first (exact, case-insensitive match
 *  on the full real label), then a couple of small casing overrides, then
 *  falls back to consistent title-casing with known all-caps
 *  abbreviations preserved. A label with no recognized nickname is shown
 *  exactly as the provider gave it — never an invented shorthand. */
export function formatGroupLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (CONFERENCE_NICKNAMES[key]) return CONFERENCE_NICKNAMES[key];
  if (GROUP_LABEL_OVERRIDES[key]) return GROUP_LABEL_OVERRIDES[key];
  return raw
    .split(/\s+/)
    .map((word) => (KNOWN_ABBR.has(word.toLowerCase()) ? word.toUpperCase() : word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

/** The generic collective noun for a set of REAL (not yet formatted) group
 *  labels — "Conferences" when the real labels are actually conferences,
 *  "Leagues"/"Divisions" when that's what the provider's own label text
 *  says, "Groups" as an honest fallback when it doesn't clearly say
 *  either way. Derived from the real label text itself, never hardcoded
 *  to one sport, so a filter control never calls MLB's leagues or an
 *  unlabeled grouping a "Conference" just because college football's
 *  does. Must be called with the ORIGINAL provider labels, not their
 *  formatGroupLabel'd display form — "SEC" no longer contains the word
 *  "conference" the way "Southeastern Conference" does. */
export function groupCollectiveNoun(rawLabels: string[]): string {
  const has = (word: string) => rawLabels.some((l) => l.toLowerCase().includes(word));
  if (has("conference")) return "Conferences";
  if (has("league")) return "Leagues";
  if (has("division")) return "Divisions";
  return "Groups";
}
