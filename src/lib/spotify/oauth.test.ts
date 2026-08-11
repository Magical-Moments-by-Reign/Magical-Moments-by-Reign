import test from "node:test";
import assert from "node:assert/strict";
import { fetchSpotifyProfile } from "./oauth.ts";

test("profile diagnostics retain safe Spotify error details without profile data", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ error: { status: 401, message: "The access token expired" } }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  try {
    const result = await fetchSpotifyProfile("secret-token-not-exposed");
    assert.equal(result.profile, null);
    assert.deepEqual(result.diagnostic, {
      attempted: true,
      httpStatus: 401,
      contentType: "application/json; charset=utf-8",
      jsonParse: "PASS",
      safeErrorCode: "401",
      safeErrorMessage: "The access token expired",
      errorCategory: "unauthorized",
      containsId: false,
    });
    assert.equal(JSON.stringify(result).includes("secret-token-not-exposed"), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("profile parsing requires only id and treats other fields as optional", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ id: "spotify-user-id" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  try {
    const result = await fetchSpotifyProfile("token");
    assert.deepEqual(result.profile, { id: "spotify-user-id", displayName: null });
    assert.equal(result.diagnostic.containsId, true);
    assert.equal(result.diagnostic.jsonParse, "PASS");
  } finally {
    global.fetch = originalFetch;
  }
});
