import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assetToStudioItem,
  buildStudioRequest,
  availableApplyKinds,
  applyCover,
  applyGallery,
  applyTimeline,
  applySections,
  applyStudioSelections,
  type StudioAsset,
} from "./studio-apply";
import type { DesignSpec, ExperienceContent } from "@/types";
import type { StudioRecommendation } from "@/lib/studio";

const assets: StudioAsset[] = [
  { id: "a1", url: "https://cdn/a1.jpg", kind: "IMAGE", caption: "Arrival" },
  { id: "a2", url: "https://cdn/a2.jpg", kind: "IMAGE", caption: "Ceremony" },
  { id: "a3", url: "https://cdn/a3.mp4", kind: "VIDEO", caption: "Toast" },
];

function baseContent(): ExperienceContent {
  return {
    hero: { eyebrow: "e", headline: "h", subhead: "s", posterUrl: "https://cdn/old.jpg" },
    story: [],
    gallery: [{ url: "https://cdn/placeholder.jpg", caption: "" }],
    timeline: [],
    navLinks: [],
  };
}

function baseDesign(): DesignSpec {
  return {
    mood: "warm", palette: {} as never, fonts: {} as never, radius: 12,
    animation: "elegant", background: "linen",
    sectionOrder: ["hero", "story", "gallery", "footer"],
    variants: { hero: "centered" },
  };
}

const rec: StudioRecommendation = {
  task: "enhance",
  source: "heuristic",
  summary: "ok",
  coverSuggestion: { mediaId: "a2", reason: "brightest" },
  galleryOrder: ["a2", "a1"],
  timeline: [{ date: "Morning", title: "Arrival", mediaIds: ["a1"] }],
  layout: { sectionOrder: ["hero", "gallery", "story", "timeline", "footer"], variants: { gallery: "grid" } },
  missingSections: ["quote"],
  notes: [],
};

test("assetToStudioItem maps VIDEO→video and IMAGE→photo", () => {
  assert.equal(assetToStudioItem(assets[0]).kind, "photo");
  assert.equal(assetToStudioItem(assets[2]).kind, "video");
});

test("buildStudioRequest carries type/title and all media", () => {
  const req = buildStudioRequest({ occasionType: "wedding", title: "Smith", assets });
  assert.equal(req.task, "enhance");
  assert.equal(req.occasionType, "wedding");
  assert.equal(req.media?.length, 3);
});

test("availableApplyKinds reflects what the recommendation offers", () => {
  assert.deepEqual(availableApplyKinds(rec, assets).sort(), ["cover", "gallery", "sections", "timeline"]);
  // Cover referencing a non-existent asset is not offered.
  const bad = { ...rec, coverSuggestion: { mediaId: "zzz", reason: "" }, galleryOrder: [], timeline: [], layout: undefined, missingSections: [] };
  assert.deepEqual(availableApplyKinds(bad, assets), []);
});

test("applyCover sets hero.posterUrl to the chosen asset URL", () => {
  const out = applyCover(baseContent(), rec, assets);
  assert.equal(out.hero.posterUrl, "https://cdn/a2.jpg");
});

test("applyCover is a no-op when the media id is unknown", () => {
  const out = applyCover(baseContent(), { ...rec, coverSuggestion: { mediaId: "nope", reason: "" } }, assets);
  assert.equal(out.hero.posterUrl, "https://cdn/old.jpg");
});

test("applyGallery orders by recommendation, images only, keeps every upload", () => {
  const out = applyGallery(baseContent(), rec, assets);
  // a3 is a video → excluded; a2 then a1 per galleryOrder.
  assert.deepEqual(out.gallery.map((g) => g.url), ["https://cdn/a2.jpg", "https://cdn/a1.jpg"]);
});

test("applyGallery appends uploads not named in the order (nothing lost)", () => {
  const out = applyGallery(baseContent(), { ...rec, galleryOrder: ["a1"] }, assets);
  assert.deepEqual(out.gallery.map((g) => g.url), ["https://cdn/a1.jpg", "https://cdn/a2.jpg"]);
});

test("applyTimeline composes body from captions, never invents text", () => {
  const out = applyTimeline(baseContent(), rec, assets);
  assert.equal(out.timeline.length, 1);
  assert.equal(out.timeline[0].title, "Arrival");
  assert.equal(out.timeline[0].date, "Morning");
  assert.equal(out.timeline[0].body, "Arrival"); // caption of a1
});

test("applySections merges, keeps hero first + footer last, adds missing", () => {
  const out = applySections(baseDesign(), rec);
  assert.equal(out.sectionOrder[0], "hero");
  assert.equal(out.sectionOrder[out.sectionOrder.length - 1], "footer");
  assert.ok(out.sectionOrder.includes("quote")); // missing section appended
  assert.equal(out.variants.gallery, "grid"); // variant merged
  assert.equal(out.variants.hero, "centered"); // existing variant preserved
});

test("applyStudioSelections applies only selected+offered kinds", () => {
  const out = applyStudioSelections({
    content: baseContent(), designSpec: baseDesign(), recommendation: rec, assets,
    kinds: ["cover", "sections"],
  });
  assert.deepEqual(out.applied.sort(), ["cover", "sections"]);
  assert.equal(out.content.hero.posterUrl, "https://cdn/a2.jpg"); // cover applied
  assert.deepEqual(out.content.gallery.map((g) => g.url), ["https://cdn/placeholder.jpg"]); // gallery untouched
  assert.equal(out.designSpec.sectionOrder[0], "hero"); // sections applied
});

test("applyStudioSelections ignores kinds the recommendation doesn't offer", () => {
  const bare = { ...rec, timeline: [] };
  const out = applyStudioSelections({
    content: baseContent(), designSpec: baseDesign(), recommendation: bare, assets,
    kinds: ["timeline"],
  });
  assert.deepEqual(out.applied, []);
});
