import { test } from "node:test";
import assert from "node:assert/strict";
import { SERVICES, getService, resolveStatus, STATUS_LABEL } from "./registry.ts";
import { summarizeOffer, type DuffelOffer } from "../duffel.ts";

test("service registry has unique ids and required fields", () => {
  assert.ok(SERVICES.length >= 12);
  const ids = new Set<string>();
  for (const s of SERVICES) {
    assert.ok(s.id && s.label && s.emoji && s.blurb && s.group, `incomplete service ${s.id}`);
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
  }
});

test("flights is the connected-capable service with a page", () => {
  const f = getService("flights");
  assert.equal(f?.provider, "Duffel");
  assert.equal(f?.href, "/dashboard/concierge/flights");
  assert.equal(f?.capability, "search_book");
});

test("services are coming_soon until their provider env is set", () => {
  // No DUFFEL_API_TOKEN in the test env → flights (and all) are coming_soon.
  for (const s of SERVICES) assert.equal(resolveStatus(s), "coming_soon");
  assert.equal(STATUS_LABEL.coming_soon, "Coming Soon");
});

test("summarizeOffer trims a Duffel offer into the UI shape", () => {
  const offer: DuffelOffer = {
    id: "off_1", total_amount: "482.30", total_currency: "USD",
    owner: { name: "Test Air", iata_code: "TA" },
    slices: [{
      duration: "PT7H30M",
      segments: [
        { origin: { iata_code: "JFK" }, destination: { iata_code: "BOS" }, departing_at: "2027-06-01T08:00:00", arriving_at: "2027-06-01T09:00:00", marketing_carrier: { name: "Test Air", iata_code: "TA" } },
        { origin: { iata_code: "BOS" }, destination: { iata_code: "LHR" }, departing_at: "2027-06-01T11:00:00", arriving_at: "2027-06-01T20:30:00", marketing_carrier: { name: "Test Air", iata_code: "TA" } },
      ],
    }],
  };
  const s = summarizeOffer(offer);
  assert.equal(s.airline, "Test Air");
  assert.equal(s.slices[0].from, "JFK");
  assert.equal(s.slices[0].to, "LHR");
  assert.equal(s.slices[0].stops, 1);
  assert.equal(s.slices[0].durationMins, 450); // 7h30m
  assert.ok(s.price.includes("482"));
});
