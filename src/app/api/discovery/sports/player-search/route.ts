// GET /api/discovery/sports/player-search?q=&league=nfl|cfb|nba|wnba
// Runs server-side only — SPORTSDATAIO_API_KEY never reaches the browser.
// requireAccount gates it the same as every other Discovery data route.
// Also owner/admin-gated while SportsDataIO is still on its free trial (see
// sdioCommercialMode's doc comment) — a member hitting this route directly
// gets an empty result, same as if the feature didn't exist for them.

import { NextRequest, NextResponse } from "next/server";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { searchPlayers } from "@/lib/discovery/sports/awards";
import { sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import type { SdioLeague } from "@/lib/discovery/providers/sportsdata";

const LEAGUES: SdioLeague[] = ["nfl", "cfb", "nba", "wnba"];

export async function GET(req: NextRequest) {
  const account = await requireAccount("/dashboard/discovery/sports");
  if (!sdioCommercialMode() && !(await isOwnerAccount(account.id))) {
    return NextResponse.json({ results: [] });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const leagueParam = req.nextUrl.searchParams.get("league") ?? "";
  const league = LEAGUES.includes(leagueParam as SdioLeague) ? (leagueParam as SdioLeague) : "nfl";

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const results = await searchPlayers(q, league);
  return NextResponse.json({ results });
}
