import { test } from "node:test";
import assert from "node:assert/strict";
import { searchWikidataPerson, pickAthleteCandidate, getWikidataPersonFacts, getWikipediaSummary } from "./wikidata";

test("searchWikidataPerson: maps a real wbsearchentities response into candidates", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({
      search: [
        { id: "Q40128320", label: "Dante Pettis", description: "American football wide receiver" },
        { id: "Q999999", label: "Dante Pettis", description: "association football midfielder" },
      ],
    }), { status: 200 })) as typeof fetch;
  try {
    const results = await searchWikidataPerson("Dante Pettis");
    assert.equal(results.length, 2);
    assert.equal(results[0].qid, "Q40128320");
    assert.equal(results[0].description, "American football wide receiver");
  } finally {
    global.fetch = originalFetch;
  }
});

test("searchWikidataPerson: returns [] on a malformed/missing response, never throws", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () => new Response("not json", { status: 200 })) as typeof fetch;
  try {
    assert.deepEqual(await searchWikidataPerson("Anyone"), []);
  } finally {
    global.fetch = originalFetch;
  }
});

test("pickAthleteCandidate: matches by the candidate's own real description text, never by name alone", () => {
  const candidates = [
    { qid: "Q1", label: "Dante Pettis", description: "association football midfielder" },
    { qid: "Q2", label: "Dante Pettis", description: "American football wide receiver" },
  ];
  const match = pickAthleteCandidate(candidates, ["american football", "gridiron football"]);
  assert.equal(match?.qid, "Q2");
});

test("pickAthleteCandidate: returns null when no candidate's description matches — never a low-confidence guess", () => {
  const candidates = [{ qid: "Q1", label: "Someone", description: "politician" }];
  assert.equal(pickAthleteCandidate(candidates, ["basketball"]), null);
});

test("getWikidataPersonFacts: resolves educated-at and team-history claims, including real qualifier dates, via a second batched label lookup", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (input: any) => {
    const url = new URL(String(input));
    if (url.searchParams.get("ids") === "Q40128320") {
      return new Response(JSON.stringify({
        entities: {
          Q40128320: {
            labels: { en: { value: "Dante Pettis" } },
            claims: {
              P69: [{
                mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: "Q756165" } } },
                qualifiers: { P580: [{ datavalue: { value: { time: "+2014-08-01T00:00:00Z" } } }], P582: [{ datavalue: { value: { time: "+2017-05-01T00:00:00Z" } } }] },
              }],
              P54: [{
                mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: "Q1216023" } } },
                qualifiers: { P580: [{ datavalue: { value: { time: "+2018-01-01T00:00:00Z" } } }] },
              }],
              P569: [{ mainsnak: { datavalue: { type: "time", value: { time: "+1995-11-09T00:00:00Z" } } } }],
            },
          },
        },
      }), { status: 200 });
    }
    // batched label lookup for referenced entities
    return new Response(JSON.stringify({
      entities: {
        Q756165: { labels: { en: { value: "University of Washington" } } },
        Q1216023: { labels: { en: { value: "San Francisco 49ers" } } },
      },
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const facts = await getWikidataPersonFacts("Q40128320");
    assert.equal(facts?.name, "Dante Pettis");
    assert.equal(facts?.birthYear, 1995);
    assert.equal(facts?.educatedAt[0]?.label, "University of Washington");
    assert.equal(facts?.educatedAt[0]?.startYear, 2014);
    assert.equal(facts?.educatedAt[0]?.endYear, 2017);
    assert.equal(facts?.teamHistory[0]?.teamLabel, "San Francisco 49ers");
    assert.equal(facts?.teamHistory[0]?.startYear, 2018);
  } finally {
    global.fetch = originalFetch;
  }
});

test("getWikidataPersonFacts: returns null when the entity/claims are missing — never a guessed fact", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () => new Response(JSON.stringify({ entities: {} }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await getWikidataPersonFacts("Q0"), null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("getWikipediaSummary: maps a real page-summary response and rejects a malformed one", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({ title: "Dante Pettis", extract: "Dante Pettis is an American football wide receiver.", description: "American football player" }), { status: 200 })) as typeof fetch;
  try {
    const summary = await getWikipediaSummary("Dante Pettis");
    assert.equal(summary?.title, "Dante Pettis");
    assert.match(summary?.extract ?? "", /wide receiver/);
  } finally {
    global.fetch = originalFetch;
  }

  global.fetch = (async () => new Response(JSON.stringify({}), { status: 404 })) as typeof fetch;
  try {
    assert.equal(await getWikipediaSummary("Nonexistent Page"), null);
  } finally {
    global.fetch = originalFetch;
  }
});
