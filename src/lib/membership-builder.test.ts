import { test } from "node:test";
import assert from "node:assert/strict";
import { priceFor, lifetimeTierFor, OCCASIONS, TERMS } from "./membership-builder.ts";

test("fixed terms use the real approved prices", () => {
  assert.equal(priceFor("free", 1).price, 0);
  assert.equal(priceFor("annual", 1).price, 249);
  assert.equal(priceFor("5yr", 1).price, 799);
  assert.equal(priceFor("10yr", 1).price, 1499);
});

test("Monthly price is not fabricated — it is null (ask concierge)", () => {
  assert.equal(priceFor("monthly", 3).price, null);
});

test("Lifetime picks the tier by occasion count", () => {
  assert.equal(priceFor("lifetime", 3).price, 2499);
  assert.equal(priceFor("lifetime", 5).price, 2499);
  assert.equal(priceFor("lifetime", 6).price, 4999);
  assert.equal(priceFor("lifetime", 10).price, 4999);
  assert.equal(priceFor("lifetime", 11).price, 9999);
  assert.equal(priceFor("lifetime", 20).price, 9999);
  assert.equal(priceFor("lifetime", 99).price, 9999); // clamps to top tier
});

test("lifetimeTierFor clamps sensibly at the edges", () => {
  assert.equal(lifetimeTierFor(0).price, 2499);
  assert.equal(lifetimeTierFor(1000).price, 9999);
});

test("catalog has the full set of occasions and terms", () => {
  assert.equal(OCCASIONS.length, 20);
  assert.equal(TERMS.length, 6);
});
