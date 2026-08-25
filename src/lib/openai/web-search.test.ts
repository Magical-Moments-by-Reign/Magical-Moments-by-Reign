import { test } from "node:test";
import assert from "node:assert/strict";
import { runWebSearchEvidence } from "./web-search";

function withKey<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  return fn().finally(() => {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  });
}

function withFetch<T>(handler: (input: any, init: any) => Response, fn: () => Promise<T>): Promise<T> {
  const originalFetch = global.fetch;
  global.fetch = (async (input: any, init: any) => handler(input, init)) as typeof fetch;
  return fn().finally(() => {
    global.fetch = originalFetch;
  });
}

const SEARCH_RESPONSE_OK = {
  output: [
    { type: "web_search_call" },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "Player One, Player Two, Player Three",
          annotations: [{ type: "url_citation", url: "https://www.nba.com/team/x/roster", title: "Official Roster" }],
        },
      ],
    },
  ],
};

test("runWebSearchEvidence: returns text + citations on a valid, cited, on-domain search", () =>
  withKey(() =>
    withFetch(
      () => new Response(JSON.stringify(SEARCH_RESPONSE_OK), { status: 200 }),
      async () => {
        const result = await runWebSearchEvidence("search prompt", { model: "gpt-4o", allowedDomains: ["nba.com"] });
        assert.ok(result);
        assert.equal(result!.text, "Player One, Player Two, Player Three");
        assert.equal(result!.citations.length, 1);
        assert.equal(result!.citations[0].url, "https://www.nba.com/team/x/roster");
      },
    ),
  ));

test("runWebSearchEvidence: rejects when no web_search_call actually executed", () =>
  withKey(() =>
    withFetch(
      () =>
        new Response(
          JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "made up from memory", annotations: [] }] }] }),
          { status: 200 },
        ),
      async () => {
        const result = await runWebSearchEvidence("search prompt", { model: "gpt-4o", allowedDomains: ["nba.com"] });
        assert.equal(result, null);
      },
    ),
  ));

test("runWebSearchEvidence: rejects when there are no retained citations", () =>
  withKey(() =>
    withFetch(
      () =>
        new Response(
          JSON.stringify({ output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "uncited text", annotations: [] }] }] }),
          { status: 200 },
        ),
      async () => {
        const result = await runWebSearchEvidence("search prompt", { model: "gpt-4o", allowedDomains: ["nba.com"] });
        assert.equal(result, null);
      },
    ),
  ));

test("runWebSearchEvidence: rejects when ANY citation is outside the approved domain policy", () =>
  withKey(() =>
    withFetch(
      () =>
        new Response(
          JSON.stringify({
            output: [
              { type: "web_search_call" },
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: "mixed sources",
                    annotations: [
                      { type: "url_citation", url: "https://www.nba.com/team/x/roster" },
                      { type: "url_citation", url: "https://some-fan-blog.example/roster" },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      async () => {
        const result = await runWebSearchEvidence("search prompt", { model: "gpt-4o", allowedDomains: ["nba.com"] });
        assert.equal(result, null);
      },
    ),
  ));

test("runWebSearchEvidence: an HTTP failure returns null, never throws", () =>
  withKey(() =>
    withFetch(
      () => new Response("error", { status: 500 }),
      async () => {
        const result = await runWebSearchEvidence("search prompt", { model: "gpt-4o", allowedDomains: ["nba.com"] });
        assert.equal(result, null);
      },
    ),
  ));

test("runWebSearchEvidence: sends the allowed_domains filter on the request", () =>
  withKey(() => {
    let sentBody: any = null;
    return withFetch(
      (_url, init) => {
        sentBody = JSON.parse(init.body);
        return new Response(JSON.stringify(SEARCH_RESPONSE_OK), { status: 200 });
      },
      async () => {
        await runWebSearchEvidence("search prompt", { model: "gpt-4o", allowedDomains: ["nba.com"] });
        assert.deepEqual(sentBody.tools, [{ type: "web_search", filters: { allowed_domains: ["nba.com"] } }]);
      },
    );
  }));
