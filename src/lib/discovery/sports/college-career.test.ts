import { test } from "node:test";
import assert from "node:assert/strict";
import { getCollegeCareerProfile } from "./college-career";

test("getCollegeCareerProfile: Geno Stone resolves the curated, real Iowa career (2017-2019) when SportsDataIO CFB has nothing", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY; // unconfigured -> tier 1 returns nothing, falls to curated tier
  try {
    const profile = await getCollegeCareerProfile("Geno Stone", "Iowa");
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
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: name match is case/whitespace insensitive", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    const profile = await getCollegeCareerProfile("  geno   STONE  ", "Iowa");
    assert.equal(profile?.college, "Iowa");
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: a curated entry doesn't match when the given college doesn't agree — never a wrong-player mix-up", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    const profile = await getCollegeCareerProfile("Geno Stone", "Ohio State");
    assert.equal(profile, null);
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: returns null for a real player with no curated entry and no SportsDataIO CFB record", async () => {
  const originalKey = process.env.SPORTSDATAIO_API_KEY;
  delete process.env.SPORTSDATAIO_API_KEY;
  try {
    assert.equal(await getCollegeCareerProfile("Nobody Uncurated", "Some College"), null);
  } finally {
    if (originalKey !== undefined) process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});

test("getCollegeCareerProfile: prefers a real SportsDataIO CFB record over the curated cache when the provider actually has real season data", async () => {
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
    const profile = await getCollegeCareerProfile("Geno Stone", "Iowa");
    assert.equal(profile?.source, "sportsdataio");
    assert.equal(profile?.seasons.length, 1);
    assert.equal(profile?.seasons[0]?.stats.Tackles, 55);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SPORTSDATAIO_API_KEY;
    else process.env.SPORTSDATAIO_API_KEY = originalKey;
  }
});
