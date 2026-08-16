// ── Apple Music — configuration (SERVER ONLY) ─────────────────────
// Reads the four Apple Music env vars and nothing else. Never logs, exports,
// or otherwise surfaces a raw credential value — only present/absent
// booleans leave this module, which is what diagnostics UIs are allowed to
// show. This module is intentionally separate from src/lib/spotify — Apple
// Music and Spotify are independent providers with independent credentials,
// and neither should import from the other.

export function appleMusicTeamId(): string | undefined {
  return process.env.APPLE_MUSIC_TEAM_ID?.trim() || undefined;
}

export function appleMusicKeyId(): string | undefined {
  return process.env.APPLE_MUSIC_KEY_ID?.trim() || undefined;
}

export function appleMusicPrivateKeyRaw(): string | undefined {
  return process.env.APPLE_MUSIC_PRIVATE_KEY?.trim() || undefined;
}

// Apple Developer → Identifiers → Media IDs. This identifies the MusicKit
// key/app pairing on Apple's side; it is not a claim in the developer token
// and not a request parameter for server-to-server catalog calls (those only
// need the signed JWT). We still read and report its presence for honest
// diagnostics, and it becomes required if a future MusicKit JS (client-side,
// user-authorized) flow is added.
export function appleMusicMediaId(): string | undefined {
  return process.env.APPLE_MUSIC_MEDIA_ID?.trim() || undefined;
}

export interface AppleMusicCredentialPresence {
  teamId: boolean;
  keyId: boolean;
  privateKey: boolean;
  mediaId: boolean;
}

/** Presence-only booleans, safe to render in any diagnostics UI. */
export function appleMusicCredentialPresence(): AppleMusicCredentialPresence {
  return {
    teamId: Boolean(appleMusicTeamId()),
    keyId: Boolean(appleMusicKeyId()),
    privateKey: Boolean(appleMusicPrivateKeyRaw()),
    mediaId: Boolean(appleMusicMediaId()),
  };
}
