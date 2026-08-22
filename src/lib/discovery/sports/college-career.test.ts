import { test } from "node:test";
import assert from "node:assert/strict";
import { getCollegeCareerProfile } from "./college-career";

// Real, documented MediaWiki/Wikidata API response shapes — wbsearchentities
// returns {search: [{id, label, description}]}; wbgetentities returns
// {entities: {<QID>: {labels, claims}}}. No test here makes a real network
// call — every fetch is mocked to this real, stable, public contract.
function mockNoWikidataMatch(): typeof fetch {
  return (async (input: any) => {
    const url = new URL(String(input));
    if (url.hostname === "www.wikidata.org" && url.searchParams.get("action") === "wbsearchentities") {
      return new Response(JSON.stringify({ search: [] }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

function mockWikidataAthlete(opts: { qid: string; name: string; description: string; collegeQid: string; collegeLabel: string; startYear?: number; endYear?: number }): typeof fetch {
  const claims: any = {
    P69: [
      {
        mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: opts.collegeQid } } },
        qualifiers: {
          ...(opts.startYear ? { P580: [{ datavalue: { value: { time: `+${opts.startYear}-08-01T00:00:00Z` } } }] } : {}),
          ...(opts.endYear ? { P582: [{ datavalue: { value: { time: `+${opts.endYear}-05-01T00:00:00Z` } } }] } : {}),
        },
      },
    ],
  };
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
        if (ids.includes(opts.qid)) entities[opts.qid] = { labels: { en: { value: opts.name } }, claims };
        if (ids.includes(opts.collegeQid)) entities[opts.collegeQid] = { labels: { en: { value: opts.collegeLabel } } };
        return new Response(JSON.stringify({ entities }), { status: 200 });
      }
    }
    if (url.hostname === "en.wikipedia.org") return new Response(JSON.stringify({ title: opts.name, extract: "" }), { status: 404 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

test("getCollegeCareerProfile: Geno Stone resolves the curated, real Iowa career (2017-2019) when SportsDataIO CFB and Wikidata have nothing", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY; // unconfigured -> tier 1 returns nothing
  global.fetch = mockNoWikidataMatch(); // tier 3 returns nothing -> falls to curated
  try {
    const profile = await getCollegeCareerProfile("Geno Stone", "nfl", "Iowa");
    assert.equal(profile?.college, "Iowa");
    assert.equal(profile?.source, "curated");
    assert.equal(profile?.seasonsAttended, "2017–2019");
    assert.equal(profile?.seasons.length, 3);
    const y2019 = profile?.seasons.find((s) => s.season === 2019);
    assert.equal(y2019?.stats.Tackles, 70);
    assert.equal(y2019?.stats.Interceptions, 1);
    assert.deepEqual(y2019?.honors, ["Second-Team All-Big Ten"]);
    assert.equal(profile?.careerTotals?.Tackles, 17 + 39 + 70);
    assert.equal(profile?.careerTotals?.Interceptions, 1 + 4 + 1);
  } finally {
    global.fetch = originalFetch;
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: name match is case/whitespace insensitive for the curated override tier", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  global.fetch = mockNoWikidataMatch();
  try {
    const profile = await getCollegeCareerProfile("  geno   STONE  ", "nfl", "Iowa");
    assert.equal(profile?.college, "Iowa");
  } finally {
    global.fetch = originalFetch;
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: a curated entry doesn't match when the given college doesn't agree — never a wrong-player mix-up", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  global.fetch = mockNoWikidataMatch();
  try {
    const profile = await getCollegeCareerProfile("Geno Stone", "nfl", "Ohio State");
    assert.equal(profile, null);
  } finally {
    global.fetch = originalFetch;
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: returns null for a real player with no curated entry and no automated-tier match", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  global.fetch = mockNoWikidataMatch();
  try {
    assert.equal(await getCollegeCareerProfile("Nobody Uncurated", "nfl", "Some College"), null);
  } finally {
    global.fetch = originalFetch;
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: prefers a real SportsDataIO CFB record over Wikidata/curated when the provider actually has real season data", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  process.env.SPORTSDATAIO_API_KEY = "test-key";
  global.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes("/scores/json/Players")) {
      return new Response(JSON.stringify([{ PlayerID: 501, Name: "Geno Stone", Team: "IOWA", Position: "S", College: "Iowa" }]), { status: 200 });
    }
    if (url.includes("/stats/json/PlayerSeasonStatsByPlayerID/") && url.includes("/501")) {
      const year = new Date().getUTCFullYear();
      if (url.includes(`/${year}/`)) {
        return new Response(JSON.stringify([{ Games: 12, Started: 12, Tackles: 55, Interceptions: 2 }]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  }) as typeof fetch;
  try {
    const profile = await getCollegeCareerProfile("Geno Stone", "nfl", "Iowa");
    assert.equal(profile?.source, "sportsdataio");
    assert.equal(profile?.seasons.length, 1);
    assert.equal(profile?.seasons[0]?.stats.Tackles, 55);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: a real Wikidata match (no SportsDataIO CFB record, no curated entry) resolves the real college and real attended years automatically — the general Dante Pettis case", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  global.fetch = mockWikidataAthlete({
    qid: "Q40128320",
    name: "Dante Pettis",
    description: "American football wide receiver",
    collegeQid: "Q756165",
    collegeLabel: "University of Washington",
    startYear: 2014,
    endYear: 2017,
  });
  try {
    const profile = await getCollegeCareerProfile("Dante Pettis", "nfl");
    assert.equal(profile?.source, "wikidata");
    assert.equal(profile?.college, "University of Washington");
    assert.equal(profile?.seasonsAttended, "2014–2017");
    assert.deepEqual(profile?.seasons, []); // no season-level stats from this tier — honest, not an error
  } finally {
    global.fetch = originalFetch;
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: a Wikidata search candidate whose description doesn't match the sport is never trusted", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  global.fetch = mockWikidataAthlete({
    qid: "Q999",
    name: "Dante Pettis",
    description: "association football midfielder", // a same-named soccer player, not our NFL wide receiver
    collegeQid: "Q1",
    collegeLabel: "Wrong College",
  });
  try {
    const profile = await getCollegeCareerProfile("Dante Pettis", "nfl");
    assert.equal(profile, null); // no curated entry either, so the whole chain is honestly empty
  } finally {
    global.fetch = originalFetch;
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});
