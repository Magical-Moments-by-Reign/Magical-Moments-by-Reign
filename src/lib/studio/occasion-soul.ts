// ── Journey Studio — the soul of each occasion (CURATED) ────────
//
// Emotional intelligence for Journey Studio, grounded ENTIRELY in the Journey
// TYPE the family chose — never in their photographs, never in guessed
// relationships or fabricated life events. Every line here is hand-curated:
//
//   • emotion       — what this occasion means (a wedding is the beginning of
//                     a marriage; a memorial holds grief).
//   • reflection    — a warm, elegant closing line on that meaning.
//   • manifestations— a small curated library of affirmations the family may
//                     add to their page (chosen, never generated on the fly).
//
// Because it is curated and keyed only by occasion type, it is honest by
// construction: Journey "understands" the occasion the family selected, and
// nothing more. Pure data + pure lookups — no network, no DB, no model.

import type { StudioManifestation, StudioRecommendation, StudioRequest } from "./types";

interface OccasionSoul {
  /** Completes the sentence "Journey understands …". A short noun phrase. */
  emotion: string;
  /** A warm, elegant reflection (1–2 sentences) on the occasion's meaning. */
  reflection: string;
  /** Curated affirmations for this occasion — no author, so none is invented. */
  manifestations: string[];
}

const SOUL: Record<string, OccasionSoul> = {
  wedding: {
    emotion: "this is the beginning of a marriage",
    reflection: "Today marks more than a celebration. It marks the beginning of a lifetime together.",
    manifestations: ["Two hearts, one journey.", "Love is the greatest adventure of all.", "Together is a beautiful place to be.", "A lifetime of love begins with a single yes."],
  },
  proposal: {
    emotion: "the moment two lives chose each other",
    reflection: "The question was asked, the answer was yes — and everything wonderful begins here.",
    manifestations: ["Forever started with a single question.", "The best yes of a lifetime.", "Two lives, one path ahead."],
  },
  anniversary: {
    emotion: "a love that has endured and deepened",
    reflection: "Love is not measured in years, but in the moments that made them unforgettable.",
    manifestations: ["Still, and always, us.", "Love grows more beautiful with time.", "The best love story is the one you're still writing."],
  },
  baby: {
    emotion: "a family is growing",
    reflection: "Every little milestone becomes part of a story your family will treasure for generations.",
    manifestations: ["Small hands, infinite possibilities.", "A tiny miracle, endlessly loved.", "The greatest adventures begin small."],
  },
  firstbirthday: {
    emotion: "a family's first whole year of wonder",
    reflection: "One whole year of firsts — and a lifetime of them still to come.",
    manifestations: ["One year of wonder, a lifetime of love.", "The littlest moments make the biggest memories.", "Wonder begins at one."],
  },
  babyshower: {
    emotion: "a family preparing to welcome new life",
    reflection: "Before the first hello, there is already a room full of love.",
    manifestations: ["A room full of love, before the first hello.", "Welcome, little one.", "The greatest gift is on its way."],
  },
  genderreveal: {
    emotion: "the joy of a family growing by one",
    reflection: "A little more joy, a little more love — the family is growing.",
    manifestations: ["A little more love is on the way.", "The best surprises are worth the wait.", "So loved, already."],
  },
  birthday: {
    emotion: "this is a celebration worth savoring",
    reflection: "Another year, another chapter — and every candle is a wish worth keeping.",
    manifestations: ["Here's to another year of becoming.", "Celebrate how far you've come.", "The best is yet to come."],
  },
  graduation: {
    emotion: "years of hard work have reached a milestone",
    reflection: "This chapter celebrates perseverance, growth, and everything that made this achievement possible.",
    manifestations: ["The future belongs to those who prepare for it.", "Every ending is a new beginning.", "Hard work has a beautiful reward."],
  },
  sweet16: {
    emotion: "a joyful step toward growing up",
    reflection: "Sixteen is a doorway — and the whole bright future waits on the other side.",
    manifestations: ["Shine bright, this is your moment.", "Sixteen and endlessly becoming.", "The best is just beginning."],
  },
  quinceanera: {
    emotion: "a treasured passage into womanhood",
    reflection: "Tradition, family, and grace come together to celebrate a radiant new chapter.",
    manifestations: ["Grace, tradition, and a radiant future.", "Today a girl becomes a young woman.", "Bloom beautifully."],
  },
  prom: {
    emotion: "the magic of a night to remember",
    reflection: "Some nights are so golden they deserve to be kept forever.",
    manifestations: ["Tonight, we shine.", "A night to remember forever.", "Make it magic."],
  },
  vacation: {
    emotion: "the joy of exploration and discovery",
    reflection: "The best journeys live on long after we return home.",
    manifestations: ["Collect moments, not things.", "Adventure is always worthwhile.", "The world is wide and waiting."],
  },
  newhome: {
    emotion: "a dream has been achieved",
    reflection: "A home is never simply a place. It becomes the backdrop for the memories still waiting to be created.",
    manifestations: ["Home is where your story unfolds.", "May these walls know laughter.", "A dream, finally, with a front door."],
  },
  military: {
    emotion: "the weight of sacrifice, distance, and reunion",
    reflection: "Some homecomings are worth every mile, every day, and every prayer of the wait.",
    manifestations: ["Home at last.", "Distance means so little when someone means so much.", "Worth every day of the wait."],
  },
  reunion: {
    emotion: "the bond that keeps a family close",
    reflection: "Family is where the story always begins, and where it always returns.",
    manifestations: ["Family: where life begins and love never ends.", "Together again, always worth it.", "The ties that bind are made of love."],
  },
  retirement: {
    emotion: "a lifetime of dedication and professional growth",
    reflection: "One remarkable chapter closes, and a well-earned new one opens.",
    manifestations: ["Well done is better than well said.", "The next chapter is yours to write.", "Rest — you have earned it."],
  },
  memorial: {
    emotion: "this occasion honors remembrance, love, and the life being celebrated",
    reflection: "This collection honors a life that continues to live through every shared memory.",
    manifestations: ["A life this beautiful is never truly gone.", "Held in memory, kept in love.", "Their light lives on in every memory shared."],
  },
  sports: {
    emotion: "the dedication, teamwork, and achievement behind this",
    reflection: "Behind every victory are the quiet hours of effort no one else saw.",
    manifestations: ["Champions are made when no one is watching.", "Teamwork makes the dream work.", "Effort today, glory tomorrow."],
  },
  bridalshower: {
    emotion: "the love gathering before a wedding",
    reflection: "Surrounded by love, the countdown to forever begins.",
    manifestations: ["Showered with love.", "The countdown to forever.", "Love is in the air."],
  },
  custom: {
    emotion: "how much this moment means to you",
    reflection: "Every meaningful moment deserves a place to be remembered beautifully.",
    manifestations: ["Every moment matters.", "Keep what matters close.", "Some memories deserve forever."],
  },
};

/** Curated soul for an occasion, or undefined for an unknown/uncurated type. */
function soulFor(occasionType?: string): OccasionSoul | undefined {
  return occasionType ? SOUL[occasionType] : undefined;
}

/** The curated manifestation library for an occasion (empty if none). */
export function manifestationsFor(occasionType?: string): StudioManifestation[] {
  const soul = soulFor(occasionType);
  return soul ? soul.manifestations.map((text) => ({ text })) : [];
}

/** True when `text` is a curated manifestation for this occasion (honesty gate
 *  for applying: only curated lines may be written to a page). */
export function isCuratedManifestation(occasionType: string | undefined, text: string): boolean {
  const soul = soulFor(occasionType);
  if (!soul) return false;
  const t = text.trim();
  return soul.manifestations.some((m) => m === t);
}

/**
 * Overlay the curated "soul" onto a recommendation — emotional context, the
 * elegant reflection, and the manifestation library. Applied to EVERY
 * recommendation regardless of source (heuristic OR AI), so this warm,
 * meaningful content always comes from the curated library and never from the
 * model. When the occasion is unknown/uncurated, these fields are OMITTED
 * (and any model-produced reflection is cleared) — honest by construction.
 */
export function enrichRecommendation(rec: StudioRecommendation, req: StudioRequest): StudioRecommendation {
  const soul = soulFor(req.occasionType);
  if (!soul) {
    // No curated basis → never fabricate meaning.
    delete rec.emotionalContext;
    delete rec.reflection;
    delete rec.manifestation;
    delete rec.manifestations;
    return rec;
  }
  rec.emotionalContext = `Journey understands ${soul.emotion}.`;
  rec.reflection = soul.reflection;
  const library = soul.manifestations.map((text) => ({ text }));
  rec.manifestations = library;
  rec.manifestation = library[0];
  return rec;
}
