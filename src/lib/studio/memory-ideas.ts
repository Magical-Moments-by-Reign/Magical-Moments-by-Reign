// ── Journey Studio — memory-moment ideas ("Missing Memories") ───
//
// Per-occasion inspiration: the moments that most often make an occasion's
// story feel complete. HONESTY: the Studio cannot see inside a family's
// photos, so this is NOT a claim that anything is missing — it is a gentle
// checklist offered as inspiration ("consider adding, if these memories
// exist"). Pure data + one lookup. No network, no DB.

/** A tasteful, occasion-specific list of moments worth capturing. */
const MEMORY_IDEAS: Record<string, string[]> = {
  wedding: ["The invitation", "Getting ready", "The ceremony", "Family portraits", "The first dance", "Reception details", "The send-off"],
  proposal: ["The setting beforehand", "The moment of the question", "The happy “yes”", "The ring", "Telling family & friends"],
  anniversary: ["A photo from the very beginning", "Milestones along the way", "The celebration today", "A note to one another"],
  baby: ["The announcement", "The nursery", "Arrival day", "Tiny details — hands & feet", "First moments with family"],
  firstbirthday: ["The invitation", "The decorations", "The cake smash", "Family & friends", "A candid favorite"],
  babyshower: ["The invitation", "The décor & table", "Guests celebrating", "Opening gifts", "A group photo"],
  genderreveal: ["The lead-up", "The big reveal", "Everyone's reactions", "The celebration after"],
  birthday: ["The invitation", "The decorations", "The cake & candles", "Friends & family", "A favorite candid"],
  graduation: ["The countdown", "Cap & gown portrait", "The ceremony", "With family", "Celebrating after"],
  sweet16: ["Getting ready", "The entrance", "With friends", "The cake", "Dancing"],
  quinceanera: ["Getting ready", "The gown", "The ceremony", "The court", "The waltz", "The celebration"],
  prom: ["Getting ready", "The outfit", "The group photo", "Arrival", "The after-glow"],
  vacation: ["Setting off", "Where you stayed", "The scenery", "The food", "A favorite day", "The journey home"],
  newhome: ["Before — the empty rooms", "Signing / the keys", "Moving day", "The first meal", "Rooms coming together"],
  military: ["The countdown", "Travel home", "The reunion moment", "With family", "The celebration"],
  reunion: ["Everyone arriving", "The big group photo", "Generations together", "Shared meals", "Candid laughter"],
  retirement: ["Early-career memories", "Milestones along the way", "The send-off celebration", "With colleagues", "The road ahead"],
  memorial: ["A cherished portrait", "Moments through the years", "With loved ones", "A favorite place", "Words of tribute"],
  sports: ["Season openers", "Game-day action", "The team", "A standout moment", "The celebration"],
  bridalshower: ["The invitation", "The décor", "Guests celebrating", "Opening gifts", "A group photo"],
};

/** A gentle, universal fallback for occasions without a curated list. */
const GENERIC_IDEAS = ["The beginning", "The people who were there", "A few candid moments", "The details that made it special", "How it wrapped up"];

/** Suggested memory moments for an occasion (inspiration, never a deficiency). */
export function memoryIdeasFor(occasionType?: string): string[] {
  if (occasionType && MEMORY_IDEAS[occasionType]) return MEMORY_IDEAS[occasionType];
  return GENERIC_IDEAS;
}
