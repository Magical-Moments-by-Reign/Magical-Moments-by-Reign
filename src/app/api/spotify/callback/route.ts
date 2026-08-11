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
import { SPOTIFY_STATE_COOKIE } from "@/lib/spotify/config";
import { prisma } from "@/lib/db";

const RETURN_PATH = "/dashboard/discovery/music";
const PROFILE_DIAGNOSTIC_KEY = "spotify.profile.last_diagnostic";

async function persistProfileDiagnostic(value: unknown) {
  await prisma.systemConfig.upsert({
    where: { key: PROFILE_DIAGNOSTIC_KEY },
    create: { key: PROFILE_DIAGNOSTIC_KEY, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  }).catch(() => null);
}

function redirectTo(query: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";
  return NextResponse.redirect(new URL(`${RETURN_PATH}?${query}`, base));
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
  const hostname = url.hostname;
  const statePresent = Boolean(state);
  const stateCookiePresent = Boolean(expectedState);
  const stateMatches = Boolean(state && expectedState && state === expectedState);
  console.log(
    `[spotify callback] hostname=${hostname} state_present=${statePresent} state_cookie_present=${stateCookiePresent} state_matches=${stateMatches}`
  );

  if (error) return redirectTo(`spotify=denied`);
  if (!code || !state || !expectedState || state !== expectedState) return redirectTo(`spotify=invalid_state`);

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) return redirectTo(`spotify=exchange_failed`);

  const profileResult = await fetchSpotifyProfile(tokens.accessToken);
  const diagnostic = { ...profileResult.diagnostic, recordedAt: new Date().toISOString() };
  console.info(`[spotify profile] attempted=${diagnostic.attempted} status=${diagnostic.httpStatus ?? "network"} content_type=${diagnostic.contentType ?? "none"} json_parse=${diagnostic.jsonParse} safe_error_code=${diagnostic.safeErrorCode ?? "none"} safe_error_message=${diagnostic.safeErrorMessage ?? "none"} contains_id=${diagnostic.containsId}`);
  await persistProfileDiagnostic(diagnostic);
  if (!profileResult.profile) return redirectTo(`spotify=profile_failed`);

  const saved = await completeConnection(account.id, tokens, profileResult.profile);
  return redirectTo(saved ? `spotify=connected` : `spotify=save_failed`);
}
