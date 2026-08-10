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

/** The exact production redirect URI registered in the Spotify Developer
 *  Dashboard. Spotify rejects the entire authorize request if the
 *  redirect_uri it receives isn't byte-for-byte identical to this — so in
 *  production this is a fixed constant, NOT derived from NEXT_PUBLIC_BASE_URL,
 *  a request hostname, or any Netlify-provided value (URL/DEPLOY_URL/etc).
 *  Those can be misconfigured (e.g. NEXT_PUBLIC_BASE_URL pointed at the
 *  Netlify default subdomain) without breaking anything else in the app, but
 *  Spotify OAuth would silently break — this constant makes that class of
 *  misconfiguration impossible for Spotify specifically. */
const PRODUCTION_SPOTIFY_CALLBACK = "https://magicalmomentsbyreign.com/api/spotify/callback";

export function spotifyRedirectUri(): string {
  if (process.env.NODE_ENV === "production") return PRODUCTION_SPOTIFY_CALLBACK;
  // Local development only — never reached in a deployed environment, since
  // Next.js production builds (including every Netlify context) set
  // NODE_ENV=production.
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/spotify/callback`;
}

/** Scopes requested for the member-facing Spotify connection. Kept minimal —
 *  read-only profile + listening data, no playback/library-modifying scopes. */
export const SPOTIFY_SCOPES = ["user-read-email", "user-read-private", "user-top-read"];

/** CSRF state cookie name, shared between the authorize and callback routes.
 *  Lives here (not in either route.ts) — a Next.js Route Handler file should
 *  only export its HTTP method handlers and route-segment config. */
export const SPOTIFY_STATE_COOKIE = "mmr_spotify_state";
