import { test } from "node:test";
import assert from "node:assert/strict";

test("appleMusicDeveloperToken returns null when unconfigured", async () => {
  delete process.env.APPLE_MUSIC_TEAM_ID;
  delete process.env.APPLE_MUSIC_KEY_ID;
  delete process.env.APPLE_MUSIC_PRIVATE_KEY;
  const { appleMusicDeveloperToken, appleMusicConfigured } = await import("./apple-music-token");
  assert.equal(appleMusicConfigured(), false);
  assert.equal(appleMusicDeveloperToken(), null);
});

test("appleMusicDeveloperToken returns null (not a fake token) for a malformed key", async () => {
  process.env.APPLE_MUSIC_TEAM_ID = "TEAM123456";
  process.env.APPLE_MUSIC_KEY_ID = "KEY1234567";
  process.env.APPLE_MUSIC_PRIVATE_KEY = "not-a-real-pem-key";
  const { appleMusicDeveloperToken, appleMusicConfigured } = await import("./apple-music-token");
  assert.equal(appleMusicConfigured(), true, "creds present, even if the key content is bad");
  assert.equal(appleMusicDeveloperToken(), null, "signing must fail closed, never fabricate a token");
  delete process.env.APPLE_MUSIC_TEAM_ID;
  delete process.env.APPLE_MUSIC_KEY_ID;
  delete process.env.APPLE_MUSIC_PRIVATE_KEY;
});
