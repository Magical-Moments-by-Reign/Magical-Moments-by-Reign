// GET /api/apple-music/developer-token
// Hands the current Apple Music developer token to the signed-in member's
// own browser so MusicKit JS can configure() there. This is Apple's own
// design for MusicKit JS — the developer token is meant to reach the
// client (that's how every MusicKit-powered website authenticates its
// player); the private key that SIGNS it never leaves the server. Gated
// behind requireAccount as defense in depth even though the token itself
// carries no member-specific data.

import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/guard";
import { appleMusicDeveloperToken } from "@/lib/apple-music/token";

export async function GET() {
  await requireAccount("/dashboard/discovery/music");

  const token = appleMusicDeveloperToken();
  if (!token) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  return NextResponse.json({ token });
}
