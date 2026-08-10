import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheKeyFor } from "./cache";

test("cacheKeyFor is order-independent", () => {
  assert.equal(cacheKeyFor({ a: 1, b: 2 }), cacheKeyFor({ b: 2, a: 1 }));
});

test("cacheKeyFor ignores undefined/null/empty-string params", () => {
  assert.equal(cacheKeyFor({ a: 1, b: undefined }), cacheKeyFor({ a: 1 }));
  assert.equal(cacheKeyFor({ a: 1, b: null }), cacheKeyFor({ a: 1 }));
  assert.equal(cacheKeyFor({ a: 1, b: "" }), cacheKeyFor({ a: 1 }));
});

test("cacheKeyFor distinguishes different values", () => {
  assert.notEqual(cacheKeyFor({ a: 1 }), cacheKeyFor({ a: 2 }));
});
