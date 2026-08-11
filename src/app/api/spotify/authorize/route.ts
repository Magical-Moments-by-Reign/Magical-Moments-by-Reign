// GET /api/spotify/authorize
// Entry point for a member connecting their Spotify account. Builds the
// official Spotify authorize URL (client id + scopes + redirect_uri + a
// random CSRF state) and redirects to Spotify's own login/consent screen —
// Magical Moments never sees the member's Spotify password. The state is
// stashed in a short-lived, httpOnly cookie and checked back in the
// callback route before any token exchange happens.
//
// The cookie is set directly on the NextResponse object this handler
// returns (response.cookies.set), NOT via the next/headers cookies() jar.
// That distinction matters: every other cookie-setting call in this
// codebase (auth-session.ts, admin-auth.ts) runs inside a Server Action,
// where Next.js constructs the outgoing response itself and merges the
// cookies() jar into it automatically. A Route Handler that also builds
// and returns its OWN NextResponse — as this one must, to redirect to
// Spotify — bypasses that automatic merge in some runtimes (this app's
// Netlify Next.js runtime included), so a cookies().set() call here can
// silently produce no Set-Cookie header at all. Setting it on the response
// object directly removes that ambiguity entirely.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAccount } from "@/lib/guard";
import { spotifyConfigured, SPOTIFY_STATE_COOKIE } from "@/lib/spotify/config";
import { buildAuthorizeUrl } from "@/lib/spotify/oauth";

export async function GET(request: Request) {
  // Outside the try/catch below: requireAccount() redirects an unauthenticated
  // visitor to /login by throwing Next's internal NEXT_REDIRECT signal — that
  // must propagate untouched, not get caught and reinterpreted as a Spotify
  // configuration error.
  await requireAccount("/dashboard/discovery/music");

  const fallbackBase = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";

  try {
    if (!spotifyConfigured()) {
      return NextResponse.redirect(new URL("/dashboard/discovery/music?spotify=not_configured", fallbackBase));
    }

    const state = crypto.randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(buildAuthorizeUrl(state));
    response.cookies.set(SPOTIFY_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600, // 10 minutes — only needs to survive the round trip to Spotify and back
    });

    // Safe diagnostic only — never the state value itself.
    const hostname = new URL(request.url).hostname;
    const cookieSet = response.cookies.get(SPOTIFY_STATE_COOKIE)?.value === state;
    console.log(`[spotify authorize] hostname=${hostname} state_cookie_set=${cookieSet}`);

    return response;
  } catch (err) {
    // Never let a Spotify config/URL-construction failure surface as a raw
    // 500 or crash — degrade to a safe, honest redirect instead. Never logs
    // the error object's message/stack in case it ever contained anything
    // sensitive; the operation name is enough to locate this in the logs.
    console.error("[spotify authorize] unexpected error building the authorize redirect — degrading to a safe fallback");
    return NextResponse.redirect(new URL("/dashboard/discovery/music?spotify=configuration_error", fallbackBase));
  }
}
