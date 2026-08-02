// ── Inspiration Gallery ─────────────────────────────────────────
// A curated showcase of real experiences — their cinematic hero films
// and stills. Code-based (no DB dependency) so it ships with a deploy.

export interface InspirationItem {
  slug: string;
  title: string;
  kind: string; // display label, e.g. "Wedding"
  emoji: string;
  video?: string;
  poster: string;
  blurb: string;
}

export const INSPIRATION: InspirationItem[] = [
  {
    slug: "smithwedding", title: "The Smith Wedding", kind: "Wedding", emoji: "💍",
    video: "/hero/wedding.mp4", poster: "/hero/wedding-poster.jpg",
    blurb: "Two stories becoming one, at golden hour.",
  },
  {
    slug: "rememberinggrandpajoe", title: "Remembering Grandpa Joe", kind: "Celebration of Life", emoji: "🕊️",
    video: "/hero/grandpa.mp4", poster: "/hero/grandpa-poster.jpg",
    blurb: "A life beautifully lived, lovingly kept.",
  },
  {
    slug: "babyolivia", title: "Baby Olivia", kind: "Baby Journey", emoji: "👶",
    video: "/hero/baby.mp4", poster: "/hero/baby-poster.jpg",
    blurb: "The story of a brand-new life.",
  },
  {
    slug: "karlie2027", title: "Karlie Turns Ten", kind: "Birthday", emoji: "🎂",
    video: "/hero/karlie.mp4", poster: "/hero/karlie-poster.jpg",
    blurb: "Ten years of love, laughter & magic.",
  },
  {
    slug: "italy2026", title: "Italy, 2026", kind: "Vacation", emoji: "✈️",
    video: "/hero/italy.mp4", poster: "/hero/italy-poster.jpg",
    blurb: "Two weeks along the Amalfi Coast.",
  },
  {
    slug: "thejohnsonhome", title: "The Johnson Family", kind: "New Home", emoji: "🏡",
    video: "/hero/johnson.mp4", poster: "/hero/johnson-poster.jpg",
    blurb: "Built from the ground up — groundbreaking to move-in day.",
  },
];

// A ribbon of real photography (from the Smith wedding gallery) to
// show the level of imagery every experience can hold.
export const INSPIRATION_PHOTOS: { url: string; caption: string }[] = [
  { url: "/gallery/smith/01-ceremony.jpg", caption: "The ceremony, at golden hour" },
  { url: "/gallery/smith/07-sunset.jpg", caption: "Sunset by the water" },
  { url: "/gallery/smith/06-party.jpg", caption: "The bridal party" },
  { url: "/gallery/smith/10-kiss.jpg", caption: "The first kiss" },
  { url: "/gallery/smith/04-bouquet.jpg", caption: "The bridal bouquet" },
  { url: "/gallery/smith/03-sparklers.jpg", caption: "A sparkler send-off" },
  { url: "/gallery/smith/05-cake.jpg", caption: "The cake" },
  { url: "/gallery/smith/11-tablescape.jpg", caption: "The reception, aglow" },
];
