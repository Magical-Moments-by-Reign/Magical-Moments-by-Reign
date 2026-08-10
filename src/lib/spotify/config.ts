// ── Spotify — configuration (SERVER ONLY) ─────────────────────────
// Reads SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from the environment only.
// Neither is ever hardcoded, logged, or exported for client-side use — the
// secret in particular never leaves this module tree (only oauth.ts's
// server-side token-exchange functions read it). Never import this file
// from a "use client" component.

export function spotifyClientId(): string | undefined {
  return process.env.SPOTIFY_CLIENT_ID?.trim() || undefined;
}

export function spotifyClientSecret(): string | undefined {
  return process.env.SPOTIFY_CLIENT_SECRET?.trim() || undefined;
}

export function spotifyConfigured(): boolean {
  return Boolean(spotifyClientId() && spotifyClientSecret());
}

/** The exact redirect URI to register in the Spotify Developer Dashboard —
 *  derived from NEXT_PUBLIC_BASE_URL, the same base-URL convention every
 *  other absolute link in this app uses (see src/lib/auth-shared.ts). */
export function spotifyRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";
  return `${base.replace(/\/$/, "")}/api/spotify/callback`;
}

/** Scopes requested for the member-facing Spotify connection. Kept minimal —
 *  read-only profile + listening data, no playback/library-modifying scopes. */
export const SPOTIFY_SCOPES = ["user-read-email", "user-read-private", "user-top-read"];
