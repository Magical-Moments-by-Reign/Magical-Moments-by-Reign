import { test } from "node:test";
import assert from "node:assert/strict";
import { mapTv, mapMovie } from "./tmdb";

test("mapTv maps a TMDB tv show", () => {
  const w = mapTv({ id: 1399, name: "Example Show", poster_path: "/p.jpg", first_air_date: "2011-04-17", vote_average: 9.3 });
  assert.ok(w);
  assert.equal(w!.id, "1399");
  assert.equal(w!.title, "Example Show");
  assert.equal(w!.posterUrl, "https://image.tmdb.org/t/p/w500/p.jpg");
  assert.equal(w!.voteAverage, 9.3);
});

test("mapTv rejects a record with no id or name", () => {
  assert.equal(mapTv({ name: "No id" }), null);
  assert.equal(mapTv({ id: 5 }), null);
});

test("mapMovie maps genres only when TMDB provides them", () => {
  const m = mapMovie({ id: 27205, title: "Example Movie", genres: [{ id: 1, name: "Sci-Fi" }, { id: 2, name: "Action" }] });
  assert.ok(m);
  assert.deepEqual(m!.genres, ["Sci-Fi", "Action"]);
});

test("mapMovie never invents a runtime or trailer", () => {
  const m = mapMovie({ id: 1, title: "Bare Movie" });
  assert.ok(m);
  assert.equal(m!.runtimeMinutes, undefined);
});
