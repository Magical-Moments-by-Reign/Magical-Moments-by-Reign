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

/** The one production origin every Spotify redirect — outbound to Spotify
 *  AND the return trip back to the Music page, success or failure — must
 *  use. Deliberately NOT derived from NEXT_PUBLIC_BASE_URL: that variable
 *  has repeatedly been found set to the Netlify default subdomain
 *  (magical-m.netlify.app) in this app's actual Netlify environment, which
 *  broke Spotify OAuth in more than one place before this was hardcoded —
 *  the redirect_uri sent to Spotify, and separately the callback route's
 *  own outgoing redirect back to /dashboard/discovery/music. A single
 *  shared constant closes both at once, and any future Spotify redirect
 *  should be built from spotifyCanonicalBase() rather than reading
 *  NEXT_PUBLIC_BASE_URL directly. Local development still falls back to
 *  NEXT_PUBLIC_BASE_URL/localhost, since that path never talks to the real
 *  Spotify API and isn't registered with Spotify at all. */
const PRODUCTION_ORIGIN = "https://magicalmomentsbyreign.com";

export function spotifyCanonicalBase(): string {
  if (process.env.NODE_ENV === "production") return PRODUCTION_ORIGIN;
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

/** The exact redirect URI registered in the Spotify Developer Dashboard —
 *  Spotify rejects the entire authorize request if the value it receives
 *  isn't byte-for-byte identical to this. */
export function spotifyRedirectUri(): string {
  return `${spotifyCanonicalBase()}/api/spotify/callback`;
}

/** Scopes requested for the member-facing Spotify connection. Kept minimal —
 *  read-only profile + listening data, no playback/library-modifying scopes. */
export const SPOTIFY_SCOPES = ["user-read-email", "user-read-private", "user-top-read"];

/** CSRF state cookie name, shared between the authorize and callback routes.
 *  Lives here (not in either route.ts) — a Next.js Route Handler file should
 *  only export its HTTP method handlers and route-segment config. */
export const SPOTIFY_STATE_COOKIE = "mmr_spotify_state";
