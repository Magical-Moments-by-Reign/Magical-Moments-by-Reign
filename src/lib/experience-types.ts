// ── Catalog of experience types ─────────────────────────────────
// One master application, many kinds of moments. Each type biases the
// design engine (palette families, fonts, mood, which sections matter)
// so a wedding never feels like a memorial — while two weddings still
// never look identical.

import type { SectionKind } from "@/types";

export interface ExperienceType {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  /** palette family keys the engine will prefer for this type */
  paletteFamilies: string[];
  /** font pairing keys the engine will prefer */
  fontKeys: string[];
  /** moods the engine may pick from */
  moods: string[];
  /** sections that should always appear for this type */
  requiredSections: SectionKind[];
  /** sections that may appear, engine decides + orders */
  optionalSections: SectionKind[];
}

export const EXPERIENCE_TYPES: ExperienceType[] = [
  {
    id: "wedding",
    label: "Wedding",
    emoji: "💍",
    tagline: "Two stories becoming one.",
    paletteFamilies: ["romantic", "champagne", "garden"],
    fontKeys: ["editorial", "romantic", "classic"],
    moods: ["romantic", "timeless", "ethereal"],
    requiredSections: ["hero", "story", "gallery", "footer"],
    optionalSections: ["timeline", "quote", "details", "guestbook"],
  },
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    tagline: "Another year worth celebrating.",
    paletteFamilies: ["joyful", "sunset", "champagne"],
    fontKeys: ["playful", "modern", "editorial"],
    moods: ["joyful", "vibrant", "warm"],
    requiredSections: ["hero", "gallery", "footer"],
    optionalSections: ["story", "timeline", "quote", "guestbook"],
  },
  {
    id: "baby",
    label: "Baby Journey",
    emoji: "👶",
    tagline: "The story of a brand-new life.",
    paletteFamilies: ["tender", "garden", "champagne"],
    fontKeys: ["romantic", "playful", "classic"],
    moods: ["tender", "hopeful", "gentle"],
    requiredSections: ["hero", "timeline", "gallery", "footer"],
    optionalSections: ["story", "quote", "guestbook"],
  },
  {
    id: "memorial",
    label: "Memorial",
    emoji: "🕊️",
    tagline: "A life remembered with love.",
    paletteFamilies: ["serene", "twilight", "garden"],
    fontKeys: ["classic", "editorial", "romantic"],
    moods: ["serene", "reverent", "peaceful"],
    requiredSections: ["hero", "story", "timeline", "footer"],
    optionalSections: ["gallery", "quote", "guestbook"],
  },
  {
    id: "vacation",
    label: "Vacation",
    emoji: "🌅",
    tagline: "The journey, kept forever.",
    paletteFamilies: ["sunset", "coastal", "joyful"],
    fontKeys: ["modern", "editorial", "playful"],
    moods: ["adventurous", "vivid", "warm"],
    requiredSections: ["hero", "gallery", "timeline", "footer"],
    optionalSections: ["story", "quote"],
  },
  {
    id: "anniversary",
    label: "Anniversary",
    emoji: "❤️",
    tagline: "Years of love, celebrated.",
    paletteFamilies: ["romantic", "champagne", "twilight"],
    fontKeys: ["editorial", "romantic", "classic"],
    moods: ["romantic", "timeless", "warm"],
    requiredSections: ["hero", "timeline", "gallery", "footer"],
    optionalSections: ["story", "quote", "guestbook"],
  },
  {
    id: "graduation",
    label: "Graduation",
    emoji: "🎓",
    tagline: "The milestone that started everything.",
    paletteFamilies: ["joyful", "coastal", "champagne"],
    fontKeys: ["modern", "editorial", "playful"],
    moods: ["proud", "vibrant", "hopeful"],
    requiredSections: ["hero", "story", "gallery", "footer"],
    optionalSections: ["timeline", "quote", "guestbook"],
  },
  {
    id: "proposal",
    label: "Proposal",
    emoji: "💐",
    tagline: "The moment everything changed.",
    paletteFamilies: ["romantic", "twilight", "champagne"],
    fontKeys: ["romantic", "editorial", "classic"],
    moods: ["romantic", "ethereal", "intimate"],
    requiredSections: ["hero", "story", "gallery", "footer"],
    optionalSections: ["quote", "timeline", "guestbook"],
  },
  {
    id: "business",
    label: "Business Launch",
    emoji: "🚀",
    tagline: "A new venture, unveiled.",
    paletteFamilies: ["modernluxe", "coastal", "twilight"],
    fontKeys: ["modern", "editorial", "classic"],
    moods: ["bold", "confident", "modern"],
    requiredSections: ["hero", "story", "details", "footer"],
    optionalSections: ["gallery", "timeline", "quote"],
  },
  {
    id: "reunion",
    label: "Family Reunion",
    emoji: "🌳",
    tagline: "Everyone, together again.",
    paletteFamilies: ["garden", "sunset", "joyful"],
    fontKeys: ["classic", "playful", "editorial"],
    moods: ["warm", "nostalgic", "joyful"],
    requiredSections: ["hero", "gallery", "guestbook", "footer"],
    optionalSections: ["story", "timeline", "quote"],
  },
];

export function getExperienceType(id: string): ExperienceType | undefined {
  return EXPERIENCE_TYPES.find((t) => t.id === id);
}
