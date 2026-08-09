import { test } from "node:test";
import assert from "node:assert/strict";
import { mapArticle } from "./news";

test("mapArticle maps only real fields from a NewsAPI article", () => {
  const s = mapArticle({
    title: "Markets rally on rate news",
    url: "https://example.com/a/1",
    source: { id: "example", name: "Example Times" },
    urlToImage: "https://example.com/img.jpg",
    description: "Stocks rose after the announcement.",
    publishedAt: "2026-08-09T12:00:00Z",
  });
  assert.ok(s);
  assert.equal(s!.headline, "Markets rally on rate news");
  assert.equal(s!.source, "Example Times");
  assert.equal(s!.imageUrl, "https://example.com/img.jpg");
  assert.equal(s!.url, "https://example.com/a/1");
});

test("mapArticle rejects a story with no url or headline", () => {
  assert.equal(mapArticle({ title: "No url here" }), null);
  assert.equal(mapArticle({ url: "https://example.com" }), null);
});

test("mapArticle never invents an image or snippet", () => {
  const s = mapArticle({ title: "Bare story", url: "https://example.com/bare" });
  assert.ok(s);
  assert.equal(s!.imageUrl, undefined);
  assert.equal(s!.snippet, undefined);
});
