// ── Shared types for the master application ─────────────────────

/** The reusable building blocks of the "master markup". Every
 *  experience is composed by ordering and theming these sections. */
export type SectionKind =
  | "hero"
  | "story"
  | "gallery"
  | "timeline"
  | "quote"
  | "details"
  | "guestbook"
  | "footer";

export type AnimationStyle = "elegant" | "gentle" | "lively" | "cinematic";

export type BackgroundStyle =
  | "aurora"
  | "gradient"
  | "starfield"
  | "linen"
  | "spotlight";

/** The palette the design engine assigns to an experience. */
export interface Palette {
  name: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  heroFrom: string;
  heroTo: string;
  onDark: string; // readable text color on the hero/dark areas
}

export interface FontPairing {
  name: string;
  display: string; // Google Fonts family name for headings
  body: string; // Google Fonts family name for copy
  googleUrl: string; // ready-to-use stylesheet href
}

/** The complete, self-contained design decision for one experience.
 *  Produced by the design engine (deterministically now, AI-augmented
 *  later). The renderer needs nothing else to paint a unique page. */
export interface DesignSpec {
  mood: string;
  palette: Palette;
  fonts: FontPairing;
  radius: number; // corner rounding in px
  animation: AnimationStyle;
  background: BackgroundStyle;
  sectionOrder: SectionKind[];
  /** layout variant name per section, e.g. hero: "centered" | "split" */
  variants: Partial<Record<SectionKind, string>>;
}

// ── Content shapes (the customer's story) ──────────────────────

export interface TimelineEntry {
  date: string;
  title: string;
  body: string;
}

export interface StoryChapter {
  heading: string;
  body: string;
}

export interface GalleryItem {
  url: string;
  caption?: string;
}

export interface ExperienceContent {
  hero: {
    eyebrow: string;
    headline: string;
    subhead: string;
    ctaLabel?: string;
    /** optional cinematic hero background video + still poster */
    videoUrl?: string;
    posterUrl?: string;
  };
  story: StoryChapter[];
  gallery: GalleryItem[];
  timeline: TimelineEntry[];
  quote?: { text: string; attribution?: string };
  details?: { label: string; value: string }[];
  navLinks: { label: string; href: string }[];
}
