// ── Journey Studio — Creative Reflection ────────────────────────
//
// A short, warm closing line about the MEANING of the occasion. HONESTY: it
// is produced only from real signals we actually have — the occasion the
// family chose AND the fact that they've uploaded content. When neither is
// confidently known, the reflection is OMITTED (returns undefined) rather
// than invented. It never claims specifics it can't see. Pure function.

/** Occasion-specific reflection templates. `{who}` is the occasion's subject. */
const REFLECTIONS: Record<string, (who: string) => string> = {
  wedding: (w) => `${w} tells a beautiful story of two families becoming one.`,
  proposal: (w) => `${w} captures the moment two lives chose to become one.`,
  anniversary: (w) => `${w} is a testament to a love that keeps growing, year after year.`,
  baby: (w) => `${w} is already becoming a wonderful journey worth preserving.`,
  firstbirthday: (w) => `${w} marks a whole year of wonder — the first of many worth keeping.`,
  babyshower: (w) => `${w} is a warm welcome, gathered before the little one arrives.`,
  genderreveal: (w) => `${w} holds the joy of a family growing by one.`,
  birthday: (w) => `${w} is another year worth celebrating — and remembering.`,
  graduation: (w) => `${w} honors years of effort and the bright chapter now beginning.`,
  sweet16: (w) => `${w} captures a milestone night on the way to growing up.`,
  quinceanera: (w) => `${w} celebrates tradition, family, and a radiant new chapter.`,
  prom: (w) => `${w} keeps one magical night exactly as it felt.`,
  vacation: (w) => `${w} preserves the places, faces, and feeling of the journey.`,
  newhome: (w) => `${w} represents far more than a house — it marks the beginning of a new chapter.`,
  military: (w) => `${w} honors the wait, the service, and the joy of coming home.`,
  reunion: (w) => `${w} gathers generations into one story worth keeping.`,
  retirement: (w) => `${w} celebrates a career well lived and the freedom now ahead.`,
  memorial: (w) => `${w} is a loving tribute to a life that touched so many.`,
  sports: (w) => `${w} preserves the seasons, the effort, and the triumphs.`,
  bridalshower: (w) => `${w} gathers loved ones in celebration of what's to come.`,
};

/**
 * Build the closing Creative Reflection, or return undefined to OMIT it.
 * Requires a known occasion type AND that the family has uploaded content —
 * otherwise there isn't an honest basis for a reflection.
 */
export function reflectionFor(input: { occasionType?: string; title?: string; hasMedia: boolean }): string | undefined {
  if (!input.hasMedia) return undefined;
  const tmpl = input.occasionType ? REFLECTIONS[input.occasionType] : undefined;
  if (!tmpl) return undefined;

  const title = input.title?.trim();
  // Prefer the family's own title ("Reign & Jordan's Wedding"); fall back to a
  // neutral subject ("This wedding") — never invent names or details.
  const who = title ? `${title}` : subjectFor(input.occasionType!);
  return tmpl(who);
}

/** A neutral, honest subject phrase when the occasion has no title yet. */
function subjectFor(occasionType: string): string {
  const map: Record<string, string> = {
    wedding: "This wedding", proposal: "This proposal", anniversary: "This anniversary",
    baby: "This baby's journey", firstbirthday: "This first birthday", babyshower: "This baby shower",
    genderreveal: "This reveal", birthday: "This birthday", graduation: "This graduation",
    sweet16: "This Sweet 16", quinceanera: "This quinceañera", prom: "This prom night",
    vacation: "This journey", newhome: "This home", military: "This homecoming",
    reunion: "This reunion", retirement: "This retirement", memorial: "This celebration of life",
    sports: "This season", bridalshower: "This bridal shower",
  };
  return map[occasionType] ?? "This moment";
}
