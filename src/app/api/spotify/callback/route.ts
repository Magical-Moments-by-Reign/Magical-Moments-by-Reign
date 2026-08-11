// GET /api/spotify/callback
// The registered Spotify redirect URI — must match spotifyRedirectUri()
// (src/lib/spotify/config.ts) and whatever's entered in the Spotify
// Developer Dashboard's "Redirect URIs" field EXACTLY, including scheme and
// trailing-slash. Verifies the CSRF state cookie, exchanges the code for
// tokens server-side (client secret never leaves oauth.ts), fetches the
// member's Spotify profile id/display name, and stores the connection.
// Never returns a token to the browser — only a redirect.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAccount } from "@/lib/guard";
import { exchangeCodeForTokens, fetchSpotifyProfile } from "@/lib/spotify/oauth";
import { completeConnection } from "@/lib/spotify/connection";
import { SPOTIFY_STATE_COOKIE, spotifyCanonicalBase } from "@/lib/spotify/config";

const RETURN_PATH = "/dashboard/discovery/music";

// Every outcome — success or any failure code — returns to the SAME
// canonical origin the authorize route used to build redirect_uri
// (spotifyCanonicalBase(), never NEXT_PUBLIC_BASE_URL directly). Building
// this from request.url or NEXT_PUBLIC_BASE_URL would let the return trip
// land on whatever host happened to receive the request, or on a
// misconfigured env var — either way, potentially not
// magicalmomentsbyreign.com.
function redirectTo(query: string) {
  const target = new URL(`${RETURN_PATH}?${query}`, spotifyCanonicalBase());
  console.log(`[spotify] final redirect host: ${target.host}`);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const account = await requireAccount(RETURN_PATH);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get(SPOTIFY_STATE_COOKIE)?.value;
  jar.delete(SPOTIFY_STATE_COOKIE);

  // Safe diagnostic only — never the state values themselves, just presence
  // and whether they match. Helps confirm/rule out a host mismatch between
  // where the flow started (state cookie set) and where it's completing.
  const statePresent = Boolean(state);
  const stateCookiePresent = Boolean(expectedState);
  const stateMatches = Boolean(state && expectedState && state === expectedState);
  console.log(`[spotify] callback incoming host: ${url.hostname}`);
  console.log(`[spotify] state query present: ${statePresent ? "yes" : "no"}`);
  console.log(`[spotify] state cookie present: ${stateCookiePresent ? "yes" : "no"}`);
  console.log(`[spotify] state match: ${stateMatches ? "yes" : "no"}`);

  if (error) return redirectTo(`spotify=denied`);
  if (!code || !state || !expectedState || state !== expectedState) return redirectTo(`spotify=invalid_state`);

  const tokens = await exchangeCodeForTokens(code);
  console.log(`[spotify] token exchange: ${tokens ? "success" : "failure"}`);
  console.log(`[spotify] access token present: ${tokens?.accessToken ? "yes" : "no"}`);
  if (!tokens) return redirectTo(`spotify=exchange_failed`);

  const profile = await fetchSpotifyProfile(tokens.accessToken);
  if (!profile) return redirectTo(`spotify=profile_failed`);

  const saved = await completeConnection(account.id, tokens, profile);
  return redirectTo(saved ? `spotify=connected` : `spotify=save_failed`);
}
