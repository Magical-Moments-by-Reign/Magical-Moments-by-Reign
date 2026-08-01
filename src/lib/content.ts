// ── Default content scaffolding ─────────────────────────────────
// When a customer creates an experience, we seed it with tasteful,
// type-appropriate starter content they can then edit. Gallery images
// use a seeded placeholder service so a brand-new page already looks
// alive before any uploads. Replace with real media in the editor.

import type { ExperienceContent } from "@/types";
import { getExperienceType } from "@/lib/experience-types";

function placeholderImages(seed: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${encodeURIComponent(seed)}-${i}/900/1100`,
    caption: "",
  }));
}

interface ContentInput {
  type: string;
  title: string;
  subtitle?: string;
  seed: string;
}

export function buildDefaultContent({ type, title, subtitle, seed }: ContentInput): ExperienceContent {
  const t = getExperienceType(type);
  const eyebrow = t ? t.tagline : "A moment worth keeping";

  const navLinks = [
    { label: "The Story", href: "#story" },
    { label: "Gallery", href: "#gallery" },
    { label: "Timeline", href: "#timeline" },
  ];

  const base: ExperienceContent = {
    hero: {
      eyebrow,
      headline: title,
      subhead: subtitle || "Handcrafted with love by Magical Moments by Reign.",
      ctaLabel: "Explore the story",
    },
    story: [
      { heading: "How it began", body: "Every great story has a beginning. This is where yours starts — the small moments that grew into something unforgettable." },
      { heading: "The moment", body: "Some days change everything. This is the day worth remembering, told the way it deserves to be told." },
      { heading: "What comes next", body: "This experience will grow over time — new memories, new chapters, all kept together in one beautiful place." },
    ],
    gallery: placeholderImages(seed, 6),
    timeline: [
      { date: "Chapter one", title: "The first spark", body: "Where it all started." },
      { date: "Chapter two", title: "Growing together", body: "The moments in between that mattered most." },
      { date: "Chapter three", title: "Today", body: "Celebrating how far this journey has come." },
    ],
    quote: { text: "The goal is not to build webpages. The goal is to preserve memories.", attribution: "Magical Moments by Reign" },
    details: [
      { label: "Occasion", value: t?.label ?? "Celebration" },
      { label: "Created with", value: "Magical Moments by Reign" },
    ],
    navLinks,
  };

  // Light per-type tailoring of the opening chapter.
  switch (type) {
    case "wedding":
      base.story[0] = { heading: "Two lives, one story", body: "Before the vows, before the aisle — there were two people whose paths were always meant to cross." };
      break;
    case "baby":
      base.story[0] = { heading: "A brand-new life", body: "From the very first heartbeat, the world became a little more magical." };
      break;
    case "memorial":
      base.story[0] = { heading: "A life well loved", body: "Some people leave a light behind that never fades. This is a place to keep that light shining." };
      base.quote = { text: "To live in hearts we leave behind is not to die.", attribution: "" };
      break;
    case "vacation":
      base.story[0] = { heading: "The journey", body: "New places, new faces, and the kind of memories that stay long after the tan fades." };
      break;
    case "newhome":
      base.story[0] = { heading: "From the ground up", body: "Every wall, every window, every dream taking shape — the story of a place to call home." };
      break;
    case "military":
      base.story[0] = { heading: "The homecoming", body: "Counting down the days until the moment we'd been waiting for — together again at last." };
      break;
  }

  return base;
}
