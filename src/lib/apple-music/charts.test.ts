import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPlaylist } from "./charts";

test("mapPlaylist maps a catalog playlist", () => {
  const p = mapPlaylist({
    id: "pl.abc123",
    attributes: {
      name: "Today's Hits",
      curatorName: "Apple Music",
      description: { standard: "The songs everyone's playing right now." },
      artwork: { url: "https://a/{w}x{h}bb.jpg" },
      url: "https://music.apple.com/us/playlist/todays-hits/pl.abc123",
    },
  });
  assert.ok(p);
  assert.equal(p!.name, "Today's Hits");
  assert.equal(p!.curatorName, "Apple Music");
  assert.equal(p!.artworkUrl, "https://a/300x300bb.jpg");
});

test("mapPlaylist rejects a resource missing an id or name", () => {
  assert.equal(mapPlaylist({ attributes: { name: "No id" } }), null);
  assert.equal(mapPlaylist({ id: "pl.1", attributes: {} }), null);
});
