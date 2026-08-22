import { test } from "node:test";
import assert from "node:assert/strict";
import { getPlayerKnowledge } from "./player-knowledge";

function mockAthleteResponses(opts: { qid: string; name: string; description: string; collegeQid: string; collegeLabel: string; teamQid: string; teamLabel: string; wikiExtract?: string }): typeof fetch {
  return (async (input: any) => {
    const url = new URL(String(input));
    if (url.hostname === "www.wikidata.org") {
      const action = url.searchParams.get("action");
      if (action === "wbsearchentities") {
        return new Response(JSON.stringify({ search: [{ id: opts.qid, label: opts.name, description: opts.description }] }), { status: 200 });
      }
      if (action === "wbgetentities") {
        const ids = (url.searchParams.get("ids") ?? "").split("|");
        const entities: Record<string, any> = {};
        if (ids.includes(opts.qid)) {
          entities[opts.qid] = {
            labels: { en: { value: opts.name } },
            claims: {
              P69: [{ mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: opts.collegeQid } } }, qualifiers: {} }],
              P54: [{ mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: opts.teamQid } } }, qualifiers: { P580: [{ datavalue: { value: { time: "+2020-01-01T00:00:00Z" } } }] } }],
            },
          };
        }
        if (ids.includes(opts.collegeQid)) entities[opts.collegeQid] = { labels: { en: { value: opts.collegeLabel } } };
        if (ids.includes(opts.teamQid)) entities[opts.teamQid] = { labels: { en: { value: opts.teamLabel } } };
        return new Response(JSON.stringify({ entities }), { status: 200 });
      }
    }
    if (url.hostname === "en.wikipedia.org") {
      return opts.wikiExtract
        ? new Response(JSON.stringify({ title: opts.name, extract: opts.wikiExtract }), { status: 200 })
        : new Response("{}", { status: 404 });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

test("getPlayerKnowledge: resolves real college and team-history facts for an NFL player, plus an attributed Wikipedia summary when present", async () => {
  const originalFetch = global.fetch;
  global.fetch = mockAthleteResponses({
    qid: "Q40128320", name: "Dante Pettis", description: "American football wide receiver",
    collegeQid: "Q756165", collegeLabel: "University of Washington",
    teamQid: "Q1216023", teamLabel: "San Francisco 49ers",
    wikiExtract: "Dante Pettis is an American football wide receiver.",
  });
  try {
    const knowledge = await getPlayerKnowledge("Dante Pettis", "nfl");
    assert.equal(knowledge?.college?.name, "University of Washington");
    assert.equal(knowledge?.teamHistory[0]?.teamLabel, "San Francisco 49ers");
    assert.equal(knowledge?.teamHistory[0]?.startYear, 2020);
    assert.match(knowledge?.bioSummary?.text ?? "", /wide receiver/);
    assert.match(knowledge?.bioSummary?.sourceUrl ?? "", /^https:\/\/en\.wikipedia\.org\/wiki\//);
  } finally {
    global.fetch = originalFetch;
  }
});

test("getPlayerKnowledge: a basketball player is never matched using football keywords — the disambiguation is sport-aware", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (input: any) => {
    const url = new URL(String(input));
    if (url.searchParams.get("action") === "wbsearchentities") {
      return new Response(JSON.stringify({ search: [{ id: "Q1", label: "Some Player", description: "basketball guard" }] }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  try {
    // Searching under "nfl" keywords should find nothing for a basketball description.
    assert.equal(await getPlayerKnowledge("Some Player", "nfl"), null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("getPlayerKnowledge: returns null when no real Wikidata match exists — never a guessed identity", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () => new Response(JSON.stringify({ search: [] }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await getPlayerKnowledge("Nobody Real", "nfl"), null);
  } finally {
    global.fetch = originalFetch;
  }
});
