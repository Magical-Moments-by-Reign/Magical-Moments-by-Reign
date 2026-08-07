import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicRecommend } from "./heuristics.ts";
import { runJourneyStudio } from "./index.ts";
import type { StudioMediaItem, StudioRequest } from "./types.ts";

const MEDIA: StudioMediaItem[] = [
  { id: "a", kind: "photo", url: "https://x/a.jpg", filename: "IMG_1.jpg", width: 4000, height: 3000, takenAt: "2026-06-14T10:00:00Z" },
  { id: "b", kind: "photo", url: "https://x/b.jpg", filename: "IMG_2.jpg", width: 2000, height: 3000, takenAt: "2026-06-14T12:00:00Z" },
  { id: "c", kind: "video", url: "https://x/c.mp4", filename: "clip.mp4", takenAt: "2026-06-15T09:00:00Z" },
  { id: "d", kind: "photo", url: "https://x/d.jpg", filename: "IMG_1.jpg", width: 4000, height: 3000 }, // dup of "a" by name+dims
];

test("enhance produces a full, honest recommendation", () => {
  const rec = heuristicRecommend({ task: "enhance", occasionType: "wedding", media: MEDIA });
  assert.equal(rec.source, "heuristic");
  assert.ok(rec.layout, "should recommend a layout");
  assert.ok(rec.coverSuggestion, "should suggest a cover");
  assert.ok(Array.isArray(rec.galleryOrder), "should order the gallery");
  assert.ok(rec.timeline && rec.timeline.length > 0, "should build a timeline");
  assert.ok(rec.duplicates && rec.duplicates.length > 0, "should flag duplicates");
});

test("cover is the widest, highest-resolution landscape photo", () => {
  const rec = heuristicRecommend({ task: "suggest_cover", media: MEDIA });
  // "a" is 4000x3000 landscape; "b" is portrait; "d" has no takenAt but same dims as a.
  assert.ok(rec.coverSuggestion);
  assert.ok(["a", "d"].includes(rec.coverSuggestion!.mediaId), "landscape 4000x3000 wins");
});

test("layout comes from the occasion catalog (wedding requires hero+story+gallery+footer)", () => {
  const rec = heuristicRecommend({ task: "recommend_layout", occasionType: "wedding" });
  const order = rec.layout!.sectionOrder;
  assert.equal(order[0], "hero", "hero is first");
  assert.equal(order[order.length - 1], "footer", "footer is last");
  for (const s of ["hero", "story", "gallery", "footer"]) {
    assert.ok(order.includes(s as never), `wedding layout includes ${s}`);
  }
});

test("timeline groups dated media by day, in order", () => {
  const rec = heuristicRecommend({ task: "build_timeline", media: MEDIA });
  const days = rec.timeline!.map((t) => t.date);
  assert.deepEqual(days, ["2026-06-14", "2026-06-15"], "two chronological days");
});

test("duplicates cluster by filename + dimensions", () => {
  const rec = heuristicRecommend({ task: "dedupe_media", media: MEDIA });
  const group = rec.duplicates!.find((g) => g.mediaIds.includes("a") && g.mediaIds.includes("d"));
  assert.ok(group, "a and d are flagged as the same shot");
});

test("missing sections are the catalog-required ones not yet present", () => {
  // No media, no existing sections → wedding still requires story + gallery.
  const rec = heuristicRecommend({ task: "detect_sections", occasionType: "wedding" });
  assert.ok(rec.missingSections, "reports missing sections");
  assert.ok(rec.missingSections!.includes("story"), "story is missing");
  assert.ok(rec.missingSections!.includes("gallery"), "gallery is missing");
});

test("enhance explains WHY with an encouraging, grounded rationale", () => {
  const rec = heuristicRecommend({ task: "enhance", occasionType: "wedding", media: MEDIA });
  assert.ok(rec.rationale, "provides rationale");
  assert.ok(rec.rationale!.cover && rec.rationale!.cover.length > 0, "explains the cover");
  assert.ok(rec.rationale!.gallery && rec.rationale!.gallery.length > 0, "explains the gallery order");
  assert.ok(rec.rationale!.timeline && /2 different days|2 natural chapters|unfolding/.test(rec.rationale!.timeline), "timeline why is grounded in real day count");
  // Encouraging tone: never criticizes quantity or quality.
  const all = Object.values(rec.rationale!).join(" ").toLowerCase();
  for (const bad of ["poor", "low quality", "not enough", "too few", "blurry", "bad"]) {
    assert.ok(!all.includes(bad), `rationale never says "${bad}"`);
  }
});

test("enhance offers occasion-specific Missing Memories as inspiration", () => {
  const rec = heuristicRecommend({ task: "enhance", occasionType: "wedding", media: MEDIA });
  assert.ok(rec.memoryIdeas && rec.memoryIdeas.length > 0, "suggests memory moments");
  assert.ok(rec.memoryIdeas!.some((m) => /ceremony/i.test(m)), "wedding ideas include the ceremony");
});

test("reflection is generated from the occasion when real content exists", () => {
  const rec = heuristicRecommend({ task: "enhance", occasionType: "wedding", title: "Reign & Jordan", media: MEDIA });
  assert.ok(rec.reflection && rec.reflection.includes("Reign & Jordan"), "uses the family's own title, never invented names");
});

test("reflection is OMITTED (honesty) when there's no content to reflect on", () => {
  const noMedia = heuristicRecommend({ task: "enhance", occasionType: "wedding", media: [] });
  assert.equal(noMedia.reflection, undefined, "no media → no reflection");
  const noType = heuristicRecommend({ task: "enhance", media: MEDIA });
  assert.equal(noType.reflection, undefined, "unknown occasion → no reflection");
});

test("deterministic: same request → identical result", () => {
  const req: StudioRequest = { task: "enhance", occasionType: "baby", media: MEDIA };
  const a = JSON.stringify(heuristicRecommend(req));
  const b = JSON.stringify(heuristicRecommend(req));
  assert.equal(a, b, "pure function, stable output");
});

test("runJourneyStudio degrades honestly when no OPENAI_API_KEY", async () => {
  const had = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const rec = await runJourneyStudio({ task: "enhance", occasionType: "wedding", media: MEDIA });
    assert.equal(rec.source, "heuristic", "falls back to deterministic curation");
    assert.ok(rec.notes.some((n) => /isn't connected|not connected|OPENAI_API_KEY/i.test(n)), "honest 'not connected' note");
  } finally {
    if (had !== undefined) process.env.OPENAI_API_KEY = had;
  }
});

test("safety: the Studio never invents media ids the caller didn't provide", () => {
  const rec = heuristicRecommend({ task: "enhance", occasionType: "wedding", media: MEDIA });
  const allowed = new Set(MEDIA.map((m) => m.id));
  for (const id of rec.galleryOrder ?? []) assert.ok(allowed.has(id), `gallery id ${id} is real`);
  for (const t of rec.timeline ?? []) for (const id of t.mediaIds) assert.ok(allowed.has(id), `timeline id ${id} is real`);
  if (rec.coverSuggestion) assert.ok(allowed.has(rec.coverSuggestion.mediaId), "cover id is real");
});
