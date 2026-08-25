import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveNbaRosterViaOpenAI, resolveRosterViaOpenAI, TRUSTED_NBA_DOMAINS } from "./openai-resolver";

function withKey<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  return fn().finally(() => {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  });
}

/** Distinguishes step 1 (web_search) from step 2 (normalize) requests by
 *  the request body shape, since both hit the same /responses endpoint. */
function withTwoStepFetch<T>(searchBody: unknown, normalizeBody: unknown, fn: () => Promise<T>): Promise<T> {
  const originalFetch = global.fetch;
  global.fetch = (async (_url: any, init: any) => {
    const req = JSON.parse(init.body);
    if (req.tools) return new Response(JSON.stringify(searchBody), { status: 200 });
    return new Response(JSON.stringify(normalizeBody), { status: 200 });
  }) as typeof fetch;
  return fn().finally(() => {
    global.fetch = originalFetch;
  });
}

function searchOk(text = "Player One, Player Two, Player Three, Player Four, Player Five") {
  return {
    output: [
      { type: "web_search_call" },
      { type: "message", content: [{ type: "output_text", text, annotations: [{ type: "url_citation", url: "https://www.nba.com/team/x/roster", title: "Official Roster" }] }] },
    ],
  };
}

function normalizeWith(players: unknown) {
  return { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ players }) }] }] };
}

const FIVE_VALID_PLAYERS = [
  { name: "Player One", position: "G", number: 1 },
  { name: "Player Two", position: "F", number: 2 },
  { name: "Player Three", position: "C", number: 3 },
  { name: "Player Four", position: null, number: null },
  { name: "Player Five", position: "G", number: 5 },
];

test("TRUSTED_NBA_DOMAINS: nba.com only for this phase — no per-team domain guesses", () => {
  assert.deepEqual(TRUSTED_NBA_DOMAINS, ["nba.com"]);
});

test("resolveNbaRosterViaOpenAI: unconfigured (no key) returns null, never attempts a call", async () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = (async () => { called = true; return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const result = await resolveNbaRosterViaOpenAI("Brooklyn Nets");
    assert.equal(result, null);
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
    if (original !== undefined) process.env.OPENAI_API_KEY = original;
  }
});

test("resolveNbaRosterViaOpenAI: happy path — cited nba.com search + valid normalized roster returns players + provenance", () =>
  withKey(() =>
    withTwoStepFetch(searchOk(), normalizeWith(FIVE_VALID_PLAYERS), async () => {
      const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
      assert.ok(result);
      assert.equal(result!.players.length, 5);
      assert.equal(result!.players[0].name, "Player One");
      assert.equal(result!.provenance.resolver, "openai_web_search");
      assert.equal(result!.provenance.sourceType, "official_web");
      assert.equal(result!.provenance.sources[0].url, "https://www.nba.com/team/x/roster");
    }),
  ));

test("resolveNbaRosterViaOpenAI: rejects when web_search never actually executed (no web_search_call in output)", () =>
  withKey(() =>
    withTwoStepFetch(
      { output: [{ type: "message", content: [{ type: "output_text", text: "from memory", annotations: [] }] }] },
      normalizeWith(FIVE_VALID_PLAYERS),
      async () => {
        const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
        assert.equal(result, null);
      },
    ),
  ));

test("resolveNbaRosterViaOpenAI: rejects a citation outside nba.com", () =>
  withKey(() =>
    withTwoStepFetch(
      {
        output: [
          { type: "web_search_call" },
          { type: "message", content: [{ type: "output_text", text: "roster text", annotations: [{ type: "url_citation", url: "https://fan-blog.example/roster" }] }] },
        ],
      },
      normalizeWith(FIVE_VALID_PLAYERS),
      async () => {
        const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
        assert.equal(result, null);
      },
    ),
  ));

test("resolveNbaRosterViaOpenAI: rejects malformed normalize-step JSON", () =>
  withKey(() =>
    withTwoStepFetch(searchOk(), { output: [{ type: "message", content: [{ type: "output_text", text: "not valid json{{{" }] }] }, async () => {
      const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
      assert.equal(result, null);
    }),
  ));

test("resolveNbaRosterViaOpenAI: rejects a roster with duplicate player names — signals unreliable extraction", () =>
  withKey(() =>
    withTwoStepFetch(
      searchOk(),
      normalizeWith([...FIVE_VALID_PLAYERS, { name: "Player One", position: "G", number: 1 }]),
      async () => {
        const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
        assert.equal(result, null);
      },
    ),
  ));

test("resolveNbaRosterViaOpenAI: rejects a suspiciously empty roster (below the minimum size)", () =>
  withKey(() =>
    withTwoStepFetch(searchOk(), normalizeWith([{ name: "Only Player", position: "G", number: 1 }]), async () => {
      const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
      assert.equal(result, null);
    }),
  ));

test("resolveNbaRosterViaOpenAI: rejects an entry with no name at all", () =>
  withKey(() =>
    withTwoStepFetch(searchOk(), normalizeWith([...FIVE_VALID_PLAYERS.slice(0, 4), { name: "", position: "G", number: 9 }]), async () => {
      const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
      assert.equal(result, null);
    }),
  ));

test("resolveNbaRosterViaOpenAI: an outage at the search step returns null (ladder continues, never throws)", () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => new Response("error", { status: 500 })) as typeof fetch;
    try {
      const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
      assert.equal(result, null);
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("resolveNbaRosterViaOpenAI: never populates a photoUrl in this phase", () =>
  withKey(() =>
    withTwoStepFetch(searchOk(), normalizeWith(FIVE_VALID_PLAYERS), async () => {
      const result = await resolveNbaRosterViaOpenAI(`Test Team ${Date.now()}`);
      assert.ok(result);
      for (const p of result!.players) assert.equal("photoUrl" in p, false);
    }),
  ));

// ── resolveRosterViaOpenAI: the generalized, sport-parameterized entry
// point behind resolveNbaRosterViaOpenAI (shared roster architecture fix).
// resolveNbaRosterViaOpenAI("nba") is now a thin wrapper over this — these
// tests cover the leagues it added (WNBA, NFL) and the leagues it must NOT
// cover (ncaaf, and any sport with no SportsDataIO/roster product at all).

test("resolveRosterViaOpenAI: WNBA — same evidence-validation discipline, restricted to wnba.com", () =>
  withKey(() =>
    withTwoStepFetch(
      { output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "five real players", annotations: [{ type: "url_citation", url: "https://www.wnba.com/team/x/roster", title: "Official Roster" }] }] }] },
      normalizeWith(FIVE_VALID_PLAYERS),
      async () => {
        const result = await resolveRosterViaOpenAI("wnba", `Test Team ${Date.now()}`);
        assert.ok(result);
        assert.equal(result!.players.length, 5);
      },
    ),
  ));

test("resolveRosterViaOpenAI: WNBA rejects a citation outside wnba.com (e.g. nba.com) — leagues never share each other's trust", () =>
  withKey(() =>
    withTwoStepFetch(
      { output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "five real players", annotations: [{ type: "url_citation", url: "https://www.nba.com/team/x/roster" }] }] }] },
      normalizeWith(FIVE_VALID_PLAYERS),
      async () => {
        const result = await resolveRosterViaOpenAI("wnba", `Test Team ${Date.now()}`);
        assert.equal(result, null);
      },
    ),
  ));

test("resolveRosterViaOpenAI: NFL — same evidence-validation discipline, restricted to nfl.com", () =>
  withKey(() =>
    withTwoStepFetch(
      { output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "five real players", annotations: [{ type: "url_citation", url: "https://www.nfl.com/team/x/roster", title: "Official Roster" }] }] }] },
      normalizeWith(FIVE_VALID_PLAYERS),
      async () => {
        const result = await resolveRosterViaOpenAI("nfl", `Test Team ${Date.now()}`);
        assert.ok(result);
        assert.equal(result!.players.length, 5);
      },
    ),
  ));

test("resolveRosterViaOpenAI: ncaaf has no trusted-domain policy — returns null immediately, never attempts a call", () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    let called = false;
    global.fetch = (async () => { called = true; return new Response("{}", { status: 200 }); }) as typeof fetch;
    try {
      const result = await resolveRosterViaOpenAI("ncaaf", "Some Team");
      assert.equal(result, null);
      assert.equal(called, false);
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("resolveRosterViaOpenAI: an unrecognized/unsupported sport also returns null immediately, never attempts a call", () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    let called = false;
    global.fetch = (async () => { called = true; return new Response("{}", { status: 200 }); }) as typeof fetch;
    try {
      const result = await resolveRosterViaOpenAI("mlb", "Some Team");
      assert.equal(result, null);
      assert.equal(called, false);
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("resolveNbaRosterViaOpenAI stays a byte-compatible wrapper: identical result shape to resolveRosterViaOpenAI(\"nba\", ...)", () =>
  withKey(() =>
    withTwoStepFetch(searchOk(), normalizeWith(FIVE_VALID_PLAYERS), async () => {
      const viaWrapper = await resolveNbaRosterViaOpenAI("Same Team");
      assert.ok(viaWrapper);
      assert.equal(viaWrapper!.players.length, 5);
      assert.equal(viaWrapper!.provenance.resolver, "openai_web_search");
    }),
  ));
