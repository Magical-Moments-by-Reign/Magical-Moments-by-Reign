// ── Apple Music — developer token (SERVER ONLY) ──────────────────
// Apple Music API auth is a short-lived JWT (ES256) signed with the team's
// MusicKit private key — NOT a static API key. We hand-roll the signer with
// Node's built-in `crypto` (no new dependency): the token only needs three
// claims (iss, iat, exp) and one header (kid), so a full JWT library would be
// overkill for a single, fixed token shape. Verified against Apple's current
// Music/MusicKit documentation: ES256, `kid` = the MusicKit key's Key ID,
// `iss` = Team ID, token lifetime capped at 6 months (we use 12h and refresh
// automatically, well under that ceiling).
//
// Required env vars (from Apple Developer → Certificates, Identifiers &
// Profiles → Keys → a MusicKit-enabled key):
//   APPLE_MUSIC_TEAM_ID     — your 10-character Team ID
//   APPLE_MUSIC_KEY_ID      — the Key ID for the MusicKit private key
//   APPLE_MUSIC_PRIVATE_KEY — the full contents of the downloaded .p8 file
//                             (PEM, including BEGIN/END lines; \n-escaped if
//                             set via a single-line env var)
//
// This is the single canonical signer for Apple Music developer tokens —
// both the public chart provider (src/lib/discovery/providers/music.ts, via
// a thin re-export) and the catalog search module in this directory
// (catalog.ts) call through here, so there is exactly one signing
// implementation in the codebase, not two that could drift apart.
//
// Kept entirely separate from src/lib/spotify — different credentials,
// different auth model (signed JWT vs OAuth), no shared code or state.

import { createSign } from "node:crypto";
import { appleMusicTeamId, appleMusicKeyId, appleMusicPrivateKeyRaw } from "./config";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function creds(): { teamId: string; keyId: string; privateKey: string } | null {
  const teamId = appleMusicTeamId();
  const keyId = appleMusicKeyId();
  const rawKey = appleMusicPrivateKeyRaw();
  if (!teamId || !keyId || !rawKey) return null;
  // Env vars often carry literal "\n" instead of real newlines — normalize.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  return { teamId, keyId, privateKey };
}

let cached: { token: string; expiresAt: number } | null = null;

/** A valid Apple Music developer token, or null when unconfigured/signing fails. */
export function appleMusicDeveloperToken(): string | null {
  const c = creds();
  if (!c) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 300 > now) return cached.token; // 5-min safety margin

  const exp = now + 60 * 60 * 12; // 12h — well under Apple's 6-month max, rotated often
  const header = { alg: "ES256", kid: c.keyId };
  const payload = { iss: c.teamId, iat: now, exp };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  try {
    const signer = createSign("SHA256");
    signer.update(signingInput);
    signer.end();
    // ES256 wants the raw (r || s) signature, not DER — Node gives us that
    // directly via dsaEncoding, no manual ASN.1 parsing needed.
    const signature = signer.sign({ key: c.privateKey, dsaEncoding: "ieee-p1363" });
    const token = `${signingInput}.${b64url(signature)}`;
    cached = { token, expiresAt: exp };
    return token;
  } catch {
    return null; // malformed key, wrong algorithm, etc. — honest failure, never a fake token
  }
}

export function appleMusicConfigured(): boolean {
  return creds() !== null;
}
