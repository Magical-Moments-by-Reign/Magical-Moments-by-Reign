import { test } from "node:test";
import assert from "node:assert/strict";
import { OCCASIONS } from "./membership-builder.ts";

test("occasion catalog has the full set of 20 occasions with ids + labels", () => {
  assert.equal(OCCASIONS.length, 20);
  for (const o of OCCASIONS) {
    assert.ok(o.id.length > 0 && o.label.length > 0);
  }
  // ids are unique
  assert.equal(new Set(OCCASIONS.map((o) => o.id)).size, OCCASIONS.length);
});
