import { test } from "node:test";
import assert from "node:assert/strict";
import { callOpenAIResponses, openaiResponsesConfigured, responseIncludesWebSearchCall, extractResponseTextAndCitations } from "./responses";

function withKey<T>(fn: () => T): T {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  }
}

test("openaiResponsesConfigured: false without a key", () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(openaiResponsesConfigured(), false);
  } finally {
    if (original !== undefined) process.env.OPENAI_API_KEY = original;
  }
});

test("callOpenAIResponses: unconfigured without a key — never attempts a network call", async () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = (async () => { called = true; return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const result = await callOpenAIResponses({ model: "gpt-4o" });
    assert.deepEqual(result, { ok: false, reason: "unconfigured" });
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
    if (original !== undefined) process.env.OPENAI_API_KEY = original;
  }
});

test("callOpenAIResponses: a non-2xx response is a typed http_error failure, never a throw", async () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => new Response("server error", { status: 500 })) as typeof fetch;
    try {
      const result = await callOpenAIResponses({ model: "gpt-4o" });
      assert.deepEqual(result, { ok: false, reason: "http_error", status: 500 });
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("callOpenAIResponses: unparseable body is invalid_json, never a throw", async () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch;
    try {
      const result = await callOpenAIResponses({ model: "gpt-4o" });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "invalid_json");
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("callOpenAIResponses: a network failure (fetch rejects) is a typed network failure", async () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => { throw new Error("ECONNRESET"); }) as typeof fetch;
    try {
      const result = await callOpenAIResponses({ model: "gpt-4o" });
      assert.deepEqual(result, { ok: false, reason: "network" });
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("callOpenAIResponses: a real 200 JSON response is returned as-is", async () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => new Response(JSON.stringify({ output: [] }), { status: 200 })) as typeof fetch;
    try {
      const result = await callOpenAIResponses({ model: "gpt-4o" });
      assert.equal(result.ok, true);
      if (result.ok) assert.deepEqual(result.body, { output: [] });
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("callOpenAIResponses: a request that never resolves is aborted at the timeout and reported as a timeout failure", async () =>
  withKey(async () => {
    const originalFetch = global.fetch;
    global.fetch = ((_url: any, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      })) as typeof fetch;
    try {
      const result = await callOpenAIResponses({ model: "gpt-4o" }, { timeoutMs: 20 });
      assert.deepEqual(result, { ok: false, reason: "timeout" });
    } finally {
      global.fetch = originalFetch;
    }
  }));

test("responseIncludesWebSearchCall: true only when a web_search_call item is present", () => {
  assert.equal(responseIncludesWebSearchCall({ output: [{ type: "web_search_call" }, { type: "message" }] }), true);
  assert.equal(responseIncludesWebSearchCall({ output: [{ type: "message" }] }), false);
  assert.equal(responseIncludesWebSearchCall({ output: [] }), false);
  assert.equal(responseIncludesWebSearchCall({}), false);
  assert.equal(responseIncludesWebSearchCall(null), false);
});

test("extractResponseTextAndCitations: pulls text and url_citation annotations from a message item", () => {
  const body = {
    output: [
      { type: "web_search_call" },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: "Some real roster text.",
            annotations: [{ type: "url_citation", url: "https://www.nba.com/team/x/roster", title: "Roster" }],
          },
        ],
      },
    ],
  };
  const { text, citations } = extractResponseTextAndCitations(body);
  assert.equal(text, "Some real roster text.");
  assert.deepEqual(citations, [{ title: "Roster", url: "https://www.nba.com/team/x/roster" }]);
});

test("extractResponseTextAndCitations: an unexpected shape yields an empty result, never a throw", () => {
  assert.deepEqual(extractResponseTextAndCitations(null), { text: "", citations: [] });
  assert.deepEqual(extractResponseTextAndCitations({}), { text: "", citations: [] });
  assert.deepEqual(extractResponseTextAndCitations({ output: "not-an-array" }), { text: "", citations: [] });
});
