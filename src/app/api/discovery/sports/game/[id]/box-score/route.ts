// GET /api/discovery/sports/game/[id]/box-score
// Lazy-loaded by the Live Game Center's Team Stats / Box Score / Player
// Stats tabs — only fetched once a member actually opens one, not on every
// page load. requireAccount-gated like every other Discovery data route.
// Returns real team + player stat lines when this provider has a verified
// mapping for the game's sport (NFL/NCAAF today — see fetchGameTeamStats /
// fetchGamePlayerStats), or empty arrays otherwise — never a fabricated line.

import { NextRequest, NextResponse } from "next/server";
import { requireAccount } from "@/lib/guard";
import { getGameTeamStats, getGamePlayerStats } from "@/lib/discovery/sports/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAccount("/dashboard/discovery/sports");
  const { id } = await params;
  const [teamStats, playerStats] = await Promise.all([getGameTeamStats(id), getGamePlayerStats(id)]);
  return NextResponse.json({ teamStats: teamStats ?? [], playerStats: playerStats ?? [] });
}
