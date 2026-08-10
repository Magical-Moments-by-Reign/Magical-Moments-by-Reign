// GET /api/spotify/authorize
// Entry point for a member connecting their Spotify account. Builds the
// official Spotify authorize URL (client id + scopes + redirect_uri + a
// random CSRF state) and redirects to Spotify's own login/consent screen —
// Magical Moments never sees the member's Spotify password. The state is
// stashed in a short-lived, httpOnly cookie and checked back in the
// callback route before any token exchange happens.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { requireAccount } from "@/lib/guard";
import { spotifyConfigured, SPOTIFY_STATE_COOKIE } from "@/lib/spotify/config";
import { buildAuthorizeUrl } from "@/lib/spotify/oauth";

export async function GET(request: Request) {
  await requireAccount("/dashboard/discovery/music");

  if (!spotifyConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/discovery/music?spotify=not_configured", process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com"));
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set(SPOTIFY_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes — only needs to survive the round trip to Spotify and back
  });

  // Safe diagnostic only — never the state value itself.
  const hostname = new URL(request.url).hostname;
  const cookieSet = jar.get(SPOTIFY_STATE_COOKIE)?.value === state;
  console.log(`[spotify authorize] hostname=${hostname} state_cookie_set=${cookieSet}`);

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
