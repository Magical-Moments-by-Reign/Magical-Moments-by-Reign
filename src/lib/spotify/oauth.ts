// ── Spotify — OAuth Authorization Code flow (SERVER ONLY) ─────────
// Standard Spotify Web API OAuth: https://accounts.spotify.com/authorize
// for consent, https://accounts.spotify.com/api/token for the exchange.
// The client secret is read once per call from config.ts and used only in
// the server-side Authorization header below — it never touches a response
// body, a redirect URL, or client-side code.

import { spotifyClientId, spotifyClientSecret, spotifyRedirectUri, SPOTIFY_SCOPES } from "./config";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const PROFILE_URL = "https://api.spotify.com/v1/me";

export function buildAuthorizeUrl(state: string): string {
  const clientId = spotifyClientId();
  if (!clientId) throw new Error("SPOTIFY_CLIENT_ID is not configured");
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", spotifyRedirectUri());
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

function basicAuthHeader(): string {
  const clientId = spotifyClientId();
  const clientSecret = spotifyClientSecret();
  if (!clientId || !clientSecret) throw new Error("Spotify credentials are not configured");
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export interface AppTokenResult {
  status: number | null;
  ok: boolean;
  accessToken: string | null;
  /** Spotify's own {error, error_description} body on failure — safe to
   *  display, contains no credential material. */
  errorBody: unknown;
}

/**
 * Client Credentials Flow (grant_type=client_credentials) — validates
 * SPOTIFY_CLIENT_ID/SECRET directly against Spotify with NO user consent
 * required. This is the cleanest live proof that the credentials themselves
 * are correct: a 200 here means Spotify recognizes the app; a 400/401 means
 * the id/secret pair itself is wrong, independent of anything about the
 * OAuth Authorization Code flow or any member's connection.
 */
export async function getAppAccessToken(): Promise<AppTokenResult> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuthHeader() },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  }).catch(() => null);
  if (!res) return { status: null, ok: false, accessToken: null, errorBody: { error: "network_error", error_description: "Could not reach accounts.spotify.com" } };
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) return { status: res.status, ok: false, accessToken: null, errorBody: json };
  return { status: res.status, ok: true, accessToken: json.access_token, errorBody: null };
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  expiresAt: Date;
}

/** Exchanges an authorization code for tokens. Server-only — the request
 *  carries the client secret in a Basic auth header, never in the URL. */
export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(),
    }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = (await res.json().catch(() => null)) as SpotifyTokenResponse | null;
  if (!json?.access_token) return null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    scope: json.scope,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = (await res.json().catch(() => null)) as SpotifyTokenResponse | null;
  if (!json?.access_token) return null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken, // Spotify may omit it — the old one stays valid
    scope: json.scope,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  };
}

export interface SpotifyProfile {
  id: string;
  displayName: string | null;
}

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile | null> {
  const res = await fetch(PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json?.id) return null;
  return { id: json.id, displayName: json.display_name ?? null };
}
