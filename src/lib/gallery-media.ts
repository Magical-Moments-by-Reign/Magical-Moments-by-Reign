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
  ],
};

export function galleryFor(slug: string): GalleryItem[] | undefined {
  return DEMO_GALLERY[slug];
}
