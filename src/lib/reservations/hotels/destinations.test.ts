import { test } from "node:test";
import assert from "node:assert/strict";
import { mapDestination, matchDestinations, type HotelbedsDestination } from "./hotelbeds-destinations";

test("mapDestination maps real records and rejects incomplete ones", () => {
  const d = mapDestination({ code: "MIA", name: { content: "Miami, FL" }, countryCode: "US" })!;
  assert.equal(d.provider, "hotelbeds");
  assert.equal(d.code, "MIA");
  assert.equal(d.name, "Miami, FL");
  assert.equal(d.countryCode, "US");
  assert.equal(d.country, "United States"); // resolved from countryCode
  assert.equal(d.region, "FL"); // trailing token surfaced as a region hint
  assert.equal(mapDestination({ code: "X" }), null, "no name → rejected, never invented");
  assert.equal(mapDestination({ name: { content: "Nowhere" } }), null, "no code → rejected");
});

const CATALOG: HotelbedsDestination[] = [
  { provider: "hotelbeds", code: "MIA", name: "Miami, FL", countryCode: "US", country: "United States", region: "FL" },
  { provider: "hotelbeds", code: "MBH", name: "Miami Beach, FL", countryCode: "US", country: "United States", region: "FL" },
  { provider: "hotelbeds", code: "NYC", name: "New York, NY", countryCode: "US", country: "United States", region: "NY" },
  { provider: "hotelbeds", code: "LAS", name: "Las Vegas, NV", countryCode: "US", country: "United States", region: "NV" },
  { provider: "hotelbeds", code: "ORL", name: "Orlando, FL", countryCode: "US", country: "United States", region: "FL" },
  { provider: "hotelbeds", code: "PAR", name: "Paris", countryCode: "FR", country: "France" },
  { provider: "hotelbeds", code: "BHX", name: "Birmingham", countryCode: "GB", country: "United Kingdom" },
  { provider: "hotelbeds", code: "BHM", name: "Birmingham, AL", countryCode: "US", country: "United States", region: "AL" },
];

test("ambiguous 'Miami' returns BOTH Miami and Miami Beach (a choice, not a silent pick)", () => {
  const m = matchDestinations(CATALOG, "Miami");
  const codes = m.map((d) => d.code);
  assert.ok(codes.includes("MIA") && codes.includes("MBH"));
  assert.equal(m[0].code, "MIA", "exact city name ranks first");
});

test("single-city queries resolve to that city", () => {
  assert.equal(matchDestinations(CATALOG, "Las Vegas")[0].code, "LAS");
  assert.equal(matchDestinations(CATALOG, "Orlando")[0].code, "ORL");
  assert.equal(matchDestinations(CATALOG, "New York")[0].code, "NYC");
  assert.equal(matchDestinations(CATALOG, "Paris")[0].code, "PAR");
});

test("state/country tokens disambiguate — 'Birmingham, Alabama' prefers the US one", () => {
  const m = matchDestinations(CATALOG, "Birmingham, Alabama");
  assert.equal(m[0].code, "BHM", "the Alabama match ranks above Birmingham UK");
  assert.ok(m.some((d) => d.code === "BHX"), "the UK one is still offered as a choice");
});

test("no match returns an empty array — never a fabricated code", () => {
  assert.deepEqual(matchDestinations(CATALOG, "Zzxq Nowhereville"), []);
  assert.deepEqual(matchDestinations(CATALOG, ""), []);
});
