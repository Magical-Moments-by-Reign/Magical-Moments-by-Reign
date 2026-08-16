import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSong } from "./music";

test("mapSong maps a catalog song with its rank", () => {
  const e = mapSong({ attributes: { name: "Example Song", artistName: "Example Artist", url: "https://music.apple.com/x", artwork: { url: "https://a/{w}x{h}bb.jpg" } } }, 3);
  assert.ok(e);
  assert.equal(e!.rank, 3);
  assert.equal(e!.song, "Example Song");
  assert.equal(e!.artist, "Example Artist");
  assert.equal(e!.artworkUrl, "https://a/300x300bb.jpg");
});

test("mapSong captures the catalog id and preview URL for playback", () => {
  const e = mapSong({ id: "1450695739", attributes: { name: "Example Song", artistName: "Example Artist", previews: [{ url: "https://audio-ssl.itunes.apple.com/preview.m4a" }] } }, 1);
  assert.ok(e);
  assert.equal(e!.catalogId, "1450695739");
  assert.equal(e!.previewUrl, "https://audio-ssl.itunes.apple.com/preview.m4a");
});

test("mapSong leaves catalogId/previewUrl undefined when Apple doesn't return them", () => {
  const e = mapSong({ attributes: { name: "Example Song", artistName: "Example Artist" } }, 1);
  assert.ok(e);
  assert.equal(e!.catalogId, undefined);
  assert.equal(e!.previewUrl, undefined);
});

test("mapSong rejects an entry missing a name or artist", () => {
  assert.equal(mapSong({ attributes: { name: "Only name" } }, 1), null);
});
