// ── Experience hero media ───────────────────────────────────────
// Resolves the cinematic hero video + still poster for an experience.
// Prefers media stored on the experience's content; falls back to a
// small map for the seeded demo experiences (a bridge until per-
// experience media upload lands).

export interface HeroMedia {
  video?: string;
  poster?: string;
}

const DEMO_HERO_MEDIA: Record<string, HeroMedia> = {
  italy2026: { video: "/hero/italy.mp4", poster: "/hero/italy-poster.jpg" },
  thejohnsonhome: { video: "/hero/home.mp4", poster: "/hero/home-poster.jpg" },
  rememberinggrandpajoe: { video: "/hero/grandpa.mp4", poster: "/hero/grandpa-poster.jpg" },
  babyolivia: { video: "/hero/baby.mp4", poster: "/hero/baby-poster.jpg" },
  karlie2027: { video: "/hero/karlie.mp4", poster: "/hero/karlie-poster.jpg" },
  smithwedding: { video: "/hero/wedding.mp4", poster: "/hero/wedding-poster.jpg" },
};

export function heroMediaFor(
  slug: string,
  content?: { hero?: { videoUrl?: string; posterUrl?: string } },
): HeroMedia {
  if (content?.hero?.videoUrl) {
    return { video: content.hero.videoUrl, poster: content.hero.posterUrl };
  }
  return DEMO_HERO_MEDIA[slug] ?? {};
}
