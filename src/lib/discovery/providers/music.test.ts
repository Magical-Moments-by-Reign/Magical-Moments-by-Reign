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

test("mapSong rejects an entry missing a name or artist", () => {
  assert.equal(mapSong({ attributes: { name: "Only name" } }, 1), null);
});
