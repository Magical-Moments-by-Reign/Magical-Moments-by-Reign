// ── Experience gallery media ────────────────────────────────────
// Per-experience curated gallery images. Like hero-media, this is a
// code-based override for the seeded demo experiences so the imagery
// ships with a deploy (no dependency on re-seeding an existing
// production database). When an experience has its own uploaded
// gallery, that takes precedence.

export interface GalleryItem {
  url: string;
  caption?: string;
}

const DEMO_GALLERY: Record<string, GalleryItem[]> = {
  smithwedding: [
    { url: "/gallery/smith/01-ceremony.jpg", caption: "The ceremony, at golden hour" },
    { url: "/gallery/smith/02-foreheads.jpg", caption: "Forehead to forehead" },
    { url: "/gallery/smith/03-sparklers.jpg", caption: "A sparkler send-off" },
    { url: "/gallery/smith/04-bouquet.jpg", caption: "The bridal bouquet" },
    { url: "/gallery/smith/05-cake.jpg", caption: "The cake" },
    { url: "/gallery/smith/06-party.jpg", caption: "The bridal party" },
    { url: "/gallery/smith/07-sunset.jpg", caption: "Sunset by the water" },
    { url: "/gallery/smith/08-portrait.jpg", caption: "The bride" },
    { url: "/gallery/smith/09-rings.jpg", caption: "The rings" },
    { url: "/gallery/smith/10-kiss.jpg", caption: "The first kiss" },
    { url: "/gallery/smith/11-tablescape.jpg", caption: "The reception, aglow" },
    { url: "/gallery/smith/12-cake.jpg", caption: "The wedding cake" },
  ],
  italy2026: [
    { url: "/gallery/italy/01.jpg", caption: "The Colosseum at sunrise" },
    { url: "/gallery/italy/02.jpg", caption: "A walk above the Amalfi Coast" },
    { url: "/gallery/italy/03.jpg", caption: "Positano through the blooms" },
    { url: "/gallery/italy/04.jpg", caption: "The Trevi Fountain" },
    { url: "/gallery/italy/05.jpg", caption: "Cobblestone mornings" },
    { url: "/gallery/italy/06.jpg", caption: "Espresso with a view" },
    { url: "/gallery/italy/07.jpg", caption: "A Venetian gondola ride" },
    { url: "/gallery/italy/08.jpg", caption: "Florence in wisteria season" },
    { url: "/gallery/italy/09.jpg", caption: "La dolce vita" },
    { url: "/gallery/italy/10.jpg", caption: "Pasta, made fresh" },
    { url: "/gallery/italy/11.jpg", caption: "Lemons on the coast" },
    { url: "/gallery/italy/12.jpg", caption: "A little trattoria" },
    { url: "/gallery/italy/13.jpg", caption: "Sunset over Tuscany" },
  ],
  babyolivia: [
    { url: "/gallery/baby/01.jpg", caption: "Hello, world" },
    { url: "/gallery/baby/02.jpg", caption: "Tiny and new" },
    { url: "/gallery/baby/03.jpg", caption: "First giggles" },
    { url: "/gallery/baby/04.jpg", caption: "Sweet as can be" },
    { url: "/gallery/baby/05.jpg", caption: "Surrounded by love" },
    { url: "/gallery/baby/06.jpg", caption: "Growing every day" },
    { url: "/gallery/baby/07.jpg", caption: "Cherished" },
    { url: "/gallery/baby/08.jpg", caption: "Half a year of joy" },
    { url: "/gallery/baby/09.jpg", caption: "Cheek to cheek" },
    { url: "/gallery/baby/10.jpg", caption: "Bright eyes" },
    { url: "/gallery/baby/11.jpg", caption: "Pure sunshine" },
    { url: "/gallery/baby/12.jpg", caption: "Loved beyond measure" },
    { url: "/gallery/baby/13.jpg", caption: "One whole year" },
    { url: "/gallery/baby/14.jpg", caption: "Our little star" },
    { url: "/gallery/baby/15.jpg", caption: "Together" },
    { url: "/gallery/baby/16.jpg", caption: "Celebrating one" },
    { url: "/gallery/baby/17.jpg", caption: "All smiles" },
    { url: "/gallery/baby/18.jpg", caption: "Adventures begin" },
    { url: "/gallery/baby/19.jpg", caption: "In the garden" },
    { url: "/gallery/baby/20.jpg", caption: "Our whole world" },
    { url: "/gallery/baby/21.jpg", caption: "Forever our baby" },
    { url: "/gallery/baby/22-journey.jpg", caption: "Our Baby Journey" },
  ],
  karlie2027: [
    { url: "/gallery/karlie/01.jpg", caption: "Make a wish" },
    { url: "/gallery/karlie/02.jpg", caption: "Opening gifts" },
    { url: "/gallery/karlie/03.jpg", caption: "Family" },
    { url: "/gallery/karlie/04.jpg", caption: "Game night" },
    { url: "/gallery/karlie/05.jpg", caption: "Sweet treats" },
    { url: "/gallery/karlie/06.jpg", caption: "Turning ten" },
    { url: "/gallery/karlie/07.jpg", caption: "Say cheese!" },
    { url: "/gallery/karlie/08.jpg", caption: "Pizza party" },
    { url: "/gallery/karlie/09.jpg", caption: "The whole crew" },
    { url: "/gallery/karlie/10.jpg", caption: "Sparkler magic" },
    { url: "/gallery/karlie/11.jpg", caption: "Best friends forever" },
    { url: "/gallery/karlie/12-celebration.jpg", caption: "Blowing out the candles" },
  ],
  rememberinggrandpajoe: [
    { url: "/gallery/grandpa/01.jpg", caption: "Golden years by the water" },
    { url: "/gallery/grandpa/02.jpg", caption: "A boy from the start" },
    { url: "/gallery/grandpa/03.jpg", caption: "A young man with dreams" },
    { url: "/gallery/grandpa/04.jpg", caption: "The open road" },
    { url: "/gallery/grandpa/05.jpg", caption: "City days" },
    { url: "/gallery/grandpa/06.jpg", caption: "The love of his life" },
    { url: "/gallery/grandpa/07.jpg", caption: "An honest day's work" },
    { url: "/gallery/grandpa/08.jpg", caption: "Story time" },
    { url: "/gallery/grandpa/09.jpg", caption: "Their wedding day" },
    { url: "/gallery/grandpa/10.jpg", caption: "Grandpa's girl" },
    { url: "/gallery/grandpa/11.jpg", caption: "His favorite chair" },
    { url: "/gallery/grandpa/12.jpg", caption: "A new generation" },
    { url: "/gallery/grandpa/13.jpg", caption: "The morning paper" },
    { url: "/gallery/grandpa/14.jpg", caption: "Father and son" },
    { url: "/gallery/grandpa/15.jpg", caption: "The whole family" },
    { url: "/gallery/grandpa/16.jpg", caption: "Generations" },
    { url: "/gallery/grandpa/17.jpg", caption: "Forever in our hearts" },
  ],
};

export function galleryFor(slug: string): GalleryItem[] | undefined {
  return DEMO_GALLERY[slug];
}
