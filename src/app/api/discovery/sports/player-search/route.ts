// GET /api/discovery/sports/player-search?q=&league=nfl|cfb|nba|wnba
// Runs server-side only — SPORTSDATAIO_API_KEY never reaches the browser.
// requireAccount gates it the same as every other Discovery data route.

import { NextRequest, NextResponse } from "next/server";
import { requireAccount } from "@/lib/guard";
import { searchPlayers } from "@/lib/discovery/sports/awards";
import type { SdioLeague } from "@/lib/discovery/providers/sportsdata";

const LEAGUES: SdioLeague[] = ["nfl", "cfb", "nba", "wnba"];

export async function GET(req: NextRequest) {
  await requireAccount("/dashboard/discovery/sports");

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const leagueParam = req.nextUrl.searchParams.get("league") ?? "";
  const league = LEAGUES.includes(leagueParam as SdioLeague) ? (leagueParam as SdioLeague) : "nfl";

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const results = await searchPlayers(q, league);
  return NextResponse.json({ results });
}
