// ── The Design Engine ───────────────────────────────────────────
// This is the heart of Magical by Reign's promise: one master markup,
// yet "no two customer experiences ever look identical."
//
// Given an experience type + a stable seed, it produces a complete,
// self-contained DesignSpec — palette, fonts, section order, layout
// variants, animation, background. The renderer needs nothing else.
//
// It is DETERMINISTIC (seed in → same spec out) so a page is stable
// and regenerable, yet VARIED across experiences so every page feels
// custom designed.
//
//   ┌─────────────────────────────────────────────────────────┐
//   │  AI HOOK: generateDesignSpec() is where a real LLM slots  │
//   │  in. Ask the model for palette/mood/order given the       │
//   │  customer's event + preferences, then validate & fall     │
//   │  back to this deterministic engine. The rest of the app   │
//   │  is agnostic to how the DesignSpec was produced.          │
//   └─────────────────────────────────────────────────────────┘

import type {
  AnimationStyle,
  BackgroundStyle,
  DesignSpec,
  FontPairing,
  Palette,
  SectionKind,
} from "@/types";
import { getExperienceType } from "@/lib/experience-types";

// ── Curated palette families ────────────────────────────────────
const PALETTES: Record<string, Palette[]> = {
  romantic: [
    { name: "Blush Reign", bg: "#fbf6f4", surface: "#fff", text: "#3a2730", muted: "#8a6f78", primary: "#a8455c", secondary: "#d98a97", accent: "#c9a34e", heroFrom: "#4a2233", heroTo: "#8a3b52", onDark: "#fbeef0" },
    { name: "Velvet Rose", bg: "#faf4f5", surface: "#fff", text: "#33212b", muted: "#7d6670", primary: "#8e2f4a", secondary: "#c67689", accent: "#d9b46a", heroFrom: "#2b1622", heroTo: "#6e2a41", onDark: "#f8e7eb" },
  ],
  champagne: [
    { name: "Champagne Toast", bg: "#faf6ee", surface: "#fff", text: "#39301f", muted: "#857a63", primary: "#b08d3f", secondary: "#d8c084", accent: "#8a6a86", heroFrom: "#2e2616", heroTo: "#6b5527", onDark: "#f7efdd" },
    { name: "Gilded Ivory", bg: "#fbf8f1", surface: "#fff", text: "#312a1c", muted: "#7f7660", primary: "#9c7c34", secondary: "#e0cd97", accent: "#5f6b57", heroFrom: "#26210f", heroTo: "#5c4c22", onDark: "#f8f1e0" },
  ],
  garden: [
    { name: "Botanic", bg: "#f5f8f2", surface: "#fff", text: "#25311f", muted: "#6b7a63", primary: "#4a6b3f", secondary: "#8fae7d", accent: "#c9a34e", heroFrom: "#1c2a17", heroTo: "#3f5b32", onDark: "#eef4e8" },
    { name: "Sage & Gold", bg: "#f6f7f2", surface: "#fff", text: "#2b3226", muted: "#6f7767", primary: "#5c7350", secondary: "#a3b892", accent: "#c79a54", heroFrom: "#20281b", heroTo: "#465a3b", onDark: "#f0f3ea" },
  ],
  tender: [
    { name: "First Light", bg: "#fbf7f4", surface: "#fff", text: "#33292b", muted: "#847074", primary: "#c98a7a", secondary: "#f0c9b8", accent: "#9db4c9", heroFrom: "#3a2c2e", heroTo: "#7a5a56", onDark: "#f9ece6" },
    { name: "Cloud Nursery", bg: "#f6f8fb", surface: "#fff", text: "#28303a", muted: "#6c7683", primary: "#7fa1c4", secondary: "#bcd2e6", accent: "#e0b6a2", heroFrom: "#26313f", heroTo: "#4f6b86", onDark: "#e9f1f8" },
  ],
  serene: [
    { name: "Still Water", bg: "#f5f7f8", surface: "#fff", text: "#26302f", muted: "#697675", primary: "#4a6d6a", secondary: "#93b3b0", accent: "#c9a34e", heroFrom: "#1d2726", heroTo: "#3d5654", onDark: "#eaf1f0" },
    { name: "Quiet Dawn", bg: "#f7f6f4", surface: "#fff", text: "#2d2a28", muted: "#75706b", primary: "#6a6f83", secondary: "#a9adbd", accent: "#b99a68", heroFrom: "#23222a", heroTo: "#484a5e", onDark: "#efeef1" },
  ],
  twilight: [
    { name: "Aubergine Reign", bg: "#f8f5f9", surface: "#fff", text: "#2b1f33", muted: "#786a80", primary: "#6b4a8f", secondary: "#a488c0", accent: "#d8bd7b", heroFrom: "#1e1226", heroTo: "#3d2957", onDark: "#f1e9f5" },
    { name: "Midnight Plum", bg: "#f6f5f8", surface: "#fff", text: "#241f2e", muted: "#6f687a", primary: "#4b3b78", secondary: "#8f83b6", accent: "#c9a34e", heroFrom: "#161022", heroTo: "#332658", onDark: "#ece7f3" },
  ],
  sunset: [
    { name: "Golden Hour", bg: "#fdf6f0", surface: "#fff", text: "#3a2820", muted: "#8a7064", primary: "#d1743a", secondary: "#f0b183", accent: "#8a4a6b", heroFrom: "#3d1f1a", heroTo: "#9c4a2e", onDark: "#fbe9dc" },
    { name: "Coral Dusk", bg: "#fdf5f3", surface: "#fff", text: "#3a262a", muted: "#8a6d72", primary: "#d1596a", secondary: "#f2a19f", accent: "#e0b15a", heroFrom: "#3a1c24", heroTo: "#a13a4c", onDark: "#fbe6e4" },
  ],
  coastal: [
    { name: "Sea Glass", bg: "#f2f8f8", surface: "#fff", text: "#213033", muted: "#647678", primary: "#2f8a8f", secondary: "#88c2c4", accent: "#e0b15a", heroFrom: "#152a2c", heroTo: "#2f6b6f", onDark: "#e2f2f2" },
    { name: "Deep Harbor", bg: "#f3f6f9", surface: "#fff", text: "#1f2a37", muted: "#657182", primary: "#2f5f8a", secondary: "#8fb0cc", accent: "#d9a441", heroFrom: "#132133", heroTo: "#2c4a6b", onDark: "#e5eef7" },
  ],
  joyful: [
    { name: "Confetti", bg: "#fdf7fb", surface: "#fff", text: "#33223a", muted: "#867080", primary: "#c14a94", secondary: "#f0a0cf", accent: "#f0b03a", heroFrom: "#3a1a3d", heroTo: "#9c3a7a", onDark: "#fbe7f4" },
    { name: "Sherbet", bg: "#fef8f2", surface: "#fff", text: "#3a2a1f", muted: "#8a7562", primary: "#e08a2f", secondary: "#f4c07f", accent: "#c14a94", heroFrom: "#3d2612", heroTo: "#a1602a", onDark: "#fcecda" },
  ],
  modernluxe: [
    { name: "Onyx & Gold", bg: "#f6f6f5", surface: "#fff", text: "#22221f", muted: "#6e6e69", primary: "#1f1f1d", secondary: "#6f6f6a", accent: "#c9a34e", heroFrom: "#111110", heroTo: "#33322e", onDark: "#f0efe9" },
    { name: "Slate Luxe", bg: "#f5f6f7", surface: "#fff", text: "#20242a", muted: "#6a6f77", primary: "#2b3038", secondary: "#7a808a", accent: "#c9a34e", heroFrom: "#14171c", heroTo: "#333a44", onDark: "#eceef1" },
  ],
};

// ── Curated font pairings (Google Fonts) ────────────────────────
function google(families: string[]): string {
  const q = families
    .map((f) => "family=" + f.replace(/ /g, "+") + ":wght@400;500;600;700")
    .join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const FONTS: Record<string, FontPairing> = {
  editorial: { name: "Editorial", display: "Playfair Display", body: "Inter", googleUrl: google(["Playfair Display", "Inter"]) },
  romantic: { name: "Romantic", display: "Cormorant Garamond", body: "Nunito Sans", googleUrl: google(["Cormorant Garamond", "Nunito Sans"]) },
  classic: { name: "Classic", display: "Libre Baskerville", body: "Source Sans 3", googleUrl: google(["Libre Baskerville", "Source Sans 3"]) },
  modern: { name: "Modern", display: "Fraunces", body: "Manrope", googleUrl: google(["Fraunces", "Manrope"]) },
  playful: { name: "Playful", display: "Poppins", body: "Karla", googleUrl: google(["Poppins", "Karla"]) },
};

const ANIMATIONS: AnimationStyle[] = ["elegant", "gentle", "lively", "cinematic"];
const BACKGROUNDS: BackgroundStyle[] = ["aurora", "gradient", "starfield", "linen", "spotlight"];

// ── Seeded pseudo-randomness (mulberry32) ───────────────────────
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function makeRng(seed: string): () => number {
  let a = hashSeed(seed);
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Layout variants available per section (the engine rearranges these).
const VARIANTS: Record<SectionKind, string[]> = {
  hero: ["centered", "split", "overlay", "minimal"],
  story: ["stacked", "alternating", "columns"],
  gallery: ["masonry", "grid", "carousel-strip", "mosaic"],
  timeline: ["vertical", "alternating", "spine"],
  quote: ["banner", "framed", "spotlight"],
  details: ["cards", "list", "split"],
  guestbook: ["cards", "wall"],
  footer: ["centered", "columns"],
};

/**
 * Deterministically compose a unique DesignSpec for an experience.
 * Same (type, seed) always yields the same spec.
 */
export function composeDesignSpec(typeId: string, seed: string): DesignSpec {
  const type = getExperienceType(typeId);
  const rng = makeRng(`${typeId}:${seed}`);

  // Palette: pick a family the type prefers, then a variant within it.
  const familyKey = type ? pick(rng, type.paletteFamilies) : pick(rng, Object.keys(PALETTES));
  const family = PALETTES[familyKey] ?? PALETTES.twilight;
  const palette = pick(rng, family);

  // Fonts: from the type's preferred pairings.
  const fontKey = type ? pick(rng, type.fontKeys) : pick(rng, Object.keys(FONTS));
  const fonts = FONTS[fontKey] ?? FONTS.editorial;

  const mood = type ? pick(rng, type.moods) : pick(rng, ["timeless", "warm", "ethereal"]);
  const animation = pick(rng, ANIMATIONS);
  const background = pick(rng, BACKGROUNDS);
  const radius = pick(rng, [6, 10, 14, 20, 28]);

  // Section order: keep hero first + footer last, shuffle the middle.
  const required = type?.requiredSections ?? (["hero", "story", "gallery", "footer"] as SectionKind[]);
  const optional = type?.optionalSections ?? [];
  // Include each optional section ~55% of the time for variety.
  const chosenOptional = optional.filter(() => rng() > 0.45);

  const middleSet = new Set<SectionKind>();
  for (const s of [...required, ...chosenOptional]) {
    if (s !== "hero" && s !== "footer") middleSet.add(s);
  }
  const middle = shuffle(rng, [...middleSet]);
  const sectionOrder: SectionKind[] = ["hero", ...middle, "footer"];

  // Per-section layout variant.
  const variants: Partial<Record<SectionKind, string>> = {};
  for (const s of sectionOrder) {
    variants[s] = pick(rng, VARIANTS[s]);
  }

  return { mood, palette, fonts, radius, animation, background, sectionOrder, variants };
}

/**
 * Public entry point. Today it delegates to the deterministic engine.
 * Tomorrow, when ANTHROPIC_API_KEY is set, this is where we ask the
 * model for a bespoke spec from the customer's preferences, validate
 * it against the DesignSpec shape, and fall back here on any failure.
 */
export async function generateDesignSpec(
  typeId: string,
  seed: string,
  _preferences?: Record<string, unknown>,
): Promise<DesignSpec> {
  // AI HOOK — future:
  //   if (process.env.ANTHROPIC_API_KEY) {
  //     const spec = await askModelForSpec(typeId, seed, _preferences);
  //     if (isValidDesignSpec(spec)) return spec;
  //   }
  return composeDesignSpec(typeId, seed);
}

// Exposed for tooling / previews.
export const _internals = { PALETTES, FONTS, makeRng, composeDesignSpec };
