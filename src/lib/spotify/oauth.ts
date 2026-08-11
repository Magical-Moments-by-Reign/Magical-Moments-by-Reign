// ── Spotify — OAuth Authorization Code flow (SERVER ONLY) ─────────
// Standard Spotify Web API OAuth: https://accounts.spotify.com/authorize
// for consent, https://accounts.spotify.com/api/token for the exchange.
// The client secret is read once per call from config.ts and used only in
// the server-side Authorization header below — it never touches a response
// body, a redirect URL, or client-side code.

import { spotifyClientId, spotifyClientSecret, spotifyRedirectUri, SPOTIFY_SCOPES } from "./config";
import { writeProfileDiagnostic, type ProfileDiagnostic, type ProfileErrorCategory, writeTokenDiagnostic } from "./diagnostics";

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
 *  carries the client secret in a Basic auth header, never in the URL.
 *  Records a safe token diagnostic (never the token itself) so the
 *  diagnostics page can confirm whether Spotify actually granted the
 *  scopes SPOTIFY_SCOPES requested. */
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
  if (!res || !res.ok) {
    await writeTokenDiagnostic({ accessTokenPresent: false, tokenType: null, expiresIn: null, scopeReturned: null, recordedAt: new Date().toISOString() });
    return null;
  }
  const json = (await res.json().catch(() => null)) as SpotifyTokenResponse | null;
  if (!json?.access_token) {
    await writeTokenDiagnostic({ accessTokenPresent: false, tokenType: json?.token_type ?? null, expiresIn: json?.expires_in ?? null, scopeReturned: json?.scope ?? null, recordedAt: new Date().toISOString() });
    return null;
  }
  await writeTokenDiagnostic({
    accessTokenPresent: true,
    tokenType: json.token_type ?? null,
    expiresIn: json.expires_in ?? null,
    scopeReturned: json.scope ?? null,
    recordedAt: new Date().toISOString(),
  });
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

/** GET /v1/me — Spotify's "Get Current User's Profile" endpoint. Requires no
 *  scope for the fields this app reads (id, display_name); user-read-private
 *  and user-read-email (both already requested — see SPOTIFY_SCOPES) only
 *  unlock additional fields (country, product, email) this app doesn't use.
 *  Makes exactly ONE request to Spotify. Records exactly one safe diagnostic
 *  (see ./diagnostics.ts) — HTTP status, content type, whether the body
 *  parsed as JSON, Spotify's {error.status, error.message} if present, and
 *  whether an id field came back — never the access token, the full
 *  response body, or any personal field (email, display name, images). */
export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile | null> {
  const diag: ProfileDiagnostic = {
    requestAttempted: true,
    httpStatus: null,
    contentType: null,
    jsonParsed: false,
    spotifyErrorCode: null,
    spotifyErrorMessage: null,
    category: "none",
    containsId: false,
    bodyPresent: false,
    bodyLength: 0,
    rawBodyPreview: null,
    recordedAt: new Date().toISOString(),
  };

  const res = await fetch(PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }).catch(() => null);
  if (!res) {
    diag.category = "network";
    await writeProfileDiagnostic(diag);
    return null;
  }

  diag.httpStatus = res.status;
  diag.contentType = res.headers.get("content-type");

  // Read the body as TEXT exactly once — a Response body stream can only be
  // consumed a single time, so calling res.json() directly (as before) would
  // silently discard the raw bytes whenever parsing failed, leaving no way
  // to tell an empty 403 body apart from a malformed one. Parse the text
  // ourselves instead, so both cases stay distinguishable.
  const bodyText = await res.text().catch(() => null);
  diag.bodyPresent = Boolean(bodyText && bodyText.length > 0);
  diag.bodyLength = bodyText?.length ?? 0;

  let json: unknown = null;
  if (bodyText) {
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
      // Not JSON — keep a short, safe preview. This is Spotify's own
      // platform-generated response text, never anything a member typed or
      // any personal profile data, so a short excerpt is safe to persist.
      diag.rawBodyPreview = bodyText.slice(0, 200);
    }
  }
  diag.jsonParsed = json !== null && typeof json === "object";

  if (!res.ok) {
    const errObj = diag.jsonParsed ? (json as { error?: unknown }).error : null;
    if (errObj && typeof errObj === "object") {
      const e = errObj as { status?: unknown; message?: unknown };
      diag.spotifyErrorCode = e.status != null ? String(e.status) : null;
      diag.spotifyErrorMessage = e.message != null ? String(e.message).slice(0, 200) : null;
    } else if (typeof errObj === "string") {
      diag.spotifyErrorCode = errObj.slice(0, 100);
    }
    // A truly empty body is categorized by status code, same as a body that
    // parsed as valid JSON — "invalid_json" is reserved for a body that HAD
    // bytes but wasn't parseable, a genuinely different, unexpected shape.
    const categoryByStatus: ProfileErrorCategory =
      res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : res.status === 429 ? "rate_limited" : "spotify_error";
    diag.category = diag.bodyPresent && !diag.jsonParsed ? "invalid_json" : categoryByStatus;
    await writeProfileDiagnostic(diag);
    return null;
  }

  if (!diag.jsonParsed) {
    diag.category = "invalid_json";
    await writeProfileDiagnostic(diag);
    return null;
  }

  diag.containsId = Boolean((json as { id?: unknown }).id);
  if (!diag.containsId) {
    diag.category = "missing_id";
    await writeProfileDiagnostic(diag);
    return null;
  }

  await writeProfileDiagnostic(diag);
  const profile = json as { id: string; display_name?: string | null };
  return { id: profile.id, displayName: profile.display_name ?? null };
}
