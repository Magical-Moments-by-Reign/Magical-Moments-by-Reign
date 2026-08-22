import { test } from "node:test";
import assert from "node:assert/strict";
import { generateJourneyNarrative, journeyNarrativeConfigured, type JourneyFacts } from "./journey-narrative";

const FACTS: JourneyFacts = {
  name: "Geno Stone",
  highSchool: "Waynesburg Central",
  college: "Iowa",
  collegeSeasonsAttended: "2017–2019",
  collegeHonors: ["Second-Team All-Big Ten"],
  draftYear: 2020,
  draftRound: 7,
  draftPick: 219,
  draftTeam: "Baltimore Ravens",
  careerStops: ["2020–2023 — Baltimore Ravens", "2024 — Buffalo Bills"],
  currentTeam: "Buffalo Bills",
};

test("journeyNarrativeConfigured: false without an OpenAI key", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(journeyNarrativeConfigured(), false);
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});

test("generateJourneyNarrative: returns null when unconfigured — never blocks the page on a missing key", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(await generateJourneyNarrative(FACTS), null);
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});

test("generateJourneyNarrative: returns the model's real narrative string from a well-formed response", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ narrative: "Geno Stone starred at Iowa before being drafted by the Ravens in 2020." }) } }] }), { status: 200 })) as typeof fetch;
  try {
    const narrative = await generateJourneyNarrative(FACTS);
    assert.match(narrative ?? "", /Iowa/);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("generateJourneyNarrative: sends only the given facts to the model, never fetches or fabricates extra ones", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let sentBody: any = null;
  global.fetch = (async (_input: any, init: any) => {
    sentBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ narrative: "ok" }) } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    await generateJourneyNarrative(FACTS);
    const userMessage = JSON.parse(sentBody.messages.find((m: any) => m.role === "user").content);
    assert.deepEqual(userMessage.FACTS, FACTS);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("generateJourneyNarrative: returns null on a non-OK response, invalid JSON, or a missing narrative field — never a broken page", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    global.fetch = (async () => new Response("error", { status: 500 })) as typeof fetch;
    assert.equal(await generateJourneyNarrative({ ...FACTS, name: "A" }), null);

    global.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), { status: 200 })) as typeof fetch;
    assert.equal(await generateJourneyNarrative({ ...FACTS, name: "B" }), null);

    global.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ somethingElse: true }) } }] }), { status: 200 })) as typeof fetch;
    assert.equal(await generateJourneyNarrative({ ...FACTS, name: "C" }), null);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
