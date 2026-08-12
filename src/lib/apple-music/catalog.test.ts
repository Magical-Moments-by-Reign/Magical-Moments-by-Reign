import { test } from "node:test";
import assert from "node:assert/strict";
import { mapArtist, mapAlbum, mapCatalogSong } from "./catalog";

test("mapArtist maps a catalog artist", () => {
  const a = mapArtist({ id: "123", attributes: { name: "Beyoncé", genreNames: ["R&B/Soul"], url: "https://music.apple.com/us/artist/beyonce/123" } });
  assert.ok(a);
  assert.equal(a!.id, "123");
  assert.equal(a!.name, "Beyoncé");
  assert.deepEqual(a!.genreNames, ["R&B/Soul"]);
  assert.equal(a!.url, "https://music.apple.com/us/artist/beyonce/123");
});

test("mapArtist rejects a resource missing an id or name", () => {
  assert.equal(mapArtist({ attributes: { name: "No id" } }), null);
  assert.equal(mapArtist({ id: "1", attributes: {} }), null);
});

test("mapAlbum maps a catalog album and resolves artwork template", () => {
  const a = mapAlbum({
    id: "456",
    attributes: { name: "Renaissance", artistName: "Beyoncé", artwork: { url: "https://a/{w}x{h}bb.jpg" }, url: "https://music.apple.com/x", releaseDate: "2022-07-29", trackCount: 16 },
  });
  assert.ok(a);
  assert.equal(a!.name, "Renaissance");
  assert.equal(a!.artistName, "Beyoncé");
  assert.equal(a!.artworkUrl, "https://a/300x300bb.jpg");
  assert.equal(a!.trackCount, 16);
});

test("mapAlbum rejects a resource missing artistName", () => {
  assert.equal(mapAlbum({ id: "1", attributes: { name: "Only title" } }), null);
});

test("mapCatalogSong maps a catalog song", () => {
  const s = mapCatalogSong({
    id: "789",
    attributes: { name: "Cuff It", artistName: "Beyoncé", albumName: "Renaissance", artwork: { url: "https://a/{w}x{h}bb.jpg" }, url: "https://music.apple.com/x", durationInMillis: 225388 },
  });
  assert.ok(s);
  assert.equal(s!.name, "Cuff It");
  assert.equal(s!.albumName, "Renaissance");
  assert.equal(s!.artworkUrl, "https://a/300x300bb.jpg");
  assert.equal(s!.durationMs, 225388);
});

test("mapCatalogSong rejects a resource missing a name or artist", () => {
  assert.equal(mapCatalogSong({ id: "1", attributes: { artistName: "Only artist" } }), null);
});
