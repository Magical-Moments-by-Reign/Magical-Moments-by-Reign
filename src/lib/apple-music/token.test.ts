import { test } from "node:test";
import assert from "node:assert/strict";

test("appleMusicDeveloperToken returns null when unconfigured", async () => {
  delete process.env.APPLE_MUSIC_TEAM_ID;
  delete process.env.APPLE_MUSIC_KEY_ID;
  delete process.env.APPLE_MUSIC_PRIVATE_KEY;
  const { appleMusicDeveloperToken, appleMusicConfigured } = await import("./token");
  assert.equal(appleMusicConfigured(), false);
  assert.equal(appleMusicDeveloperToken(), null);
});

test("appleMusicDeveloperToken returns null (not a fake token) for a malformed key", async () => {
  process.env.APPLE_MUSIC_TEAM_ID = "TEAM123456";
  process.env.APPLE_MUSIC_KEY_ID = "KEY1234567";
  process.env.APPLE_MUSIC_PRIVATE_KEY = "not-a-real-pem-key";
  const { appleMusicDeveloperToken, appleMusicConfigured } = await import("./token");
  assert.equal(appleMusicConfigured(), true, "creds present, even if the key content is bad");
  assert.equal(appleMusicDeveloperToken(), null, "signing must fail closed, never fabricate a token");
  delete process.env.APPLE_MUSIC_TEAM_ID;
  delete process.env.APPLE_MUSIC_KEY_ID;
  delete process.env.APPLE_MUSIC_PRIVATE_KEY;
});

test("appleMusicDeveloperToken signs a well-formed ES256 JWT with a real test key", async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const { publicKey: _pub, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  process.env.APPLE_MUSIC_TEAM_ID = "TEAM123456";
  process.env.APPLE_MUSIC_KEY_ID = "KEY1234567";
  process.env.APPLE_MUSIC_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  const { appleMusicDeveloperToken } = await import("./token");
  const token = appleMusicDeveloperToken();
  assert.ok(token, "signing must succeed with a real EC P-256 key");

  const [headerB64, payloadB64, sigB64] = token!.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  assert.equal(header.alg, "ES256");
  assert.equal(header.kid, "KEY1234567");
  assert.equal(payload.iss, "TEAM123456");
  assert.ok(typeof payload.iat === "number");
  assert.ok(typeof payload.exp === "number" && payload.exp > payload.iat);
  assert.ok(sigB64.length > 0);

  const { verify } = await import("node:crypto");
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(sigB64, "base64url");
  const ok = verify("SHA256", Buffer.from(signingInput), { key: privateKey, dsaEncoding: "ieee-p1363" }, signature);
  assert.equal(ok, true, "the signature must actually verify against the signing key");

  delete process.env.APPLE_MUSIC_TEAM_ID;
  delete process.env.APPLE_MUSIC_KEY_ID;
  delete process.env.APPLE_MUSIC_PRIVATE_KEY;
});
