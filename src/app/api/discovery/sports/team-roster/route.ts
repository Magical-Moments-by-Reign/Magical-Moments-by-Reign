// GET /api/discovery/sports/team-roster?sport=nba&teamId=132&teamName=Boston%20Celtics
// Lazy per-team roster fetch for the Team Directory panel (fetched only
// when a member actually opens a team's card, not eagerly for the whole
// league) — protects the paid API-Sports/SportsDataIO quota. requireAccount
// gates it the same as every other Discovery data route.

import { NextRequest, NextResponse } from "next/server";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { getTeamRoster, sdioLeagueFor, SPORT_CATALOG } from "@/lib/discovery/sports/service";
import { findPlayerIdByName } from "@/lib/discovery/sports/player-profile";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import type { SportSlug } from "@/lib/discovery/providers/sports";

export async function GET(req: NextRequest) {
  const account = await requireAccount("/dashboard/discovery/sports");

  const sportParam = req.nextUrl.searchParams.get("sport") ?? "";
  const teamId = req.nextUrl.searchParams.get("teamId")?.trim() ?? "";
  const teamName = req.nextUrl.searchParams.get("teamName")?.trim() ?? "";
  const sport = SPORT_CATALOG.find((s) => s.slug === sportParam)?.slug as SportSlug | undefined;
  if (!sport || !teamId) return NextResponse.json({ roster: [], status: "not_supported" });

  const isOwner = await isOwnerAccount(account.id);
  const allowSdio = Boolean(sdioLeagueFor(sport)) && sdioConfigured() && (sdioCommercialMode() || isOwner);

  const result = await getTeamRoster(sport, teamId, { teamName: teamName || undefined, allowSecondarySource: allowSdio });
  if (!result.players.length) {
    // status is a fixed, safe-to-show enum (never the raw provider message,
    // an internal error string, or anything that could hint at API keys /
    // provider internals). The real plan/subscription text API-Sports
    // reported is only ever included for the owner, as an admin diagnostic —
    // never sent to a regular member.
    return NextResponse.json({
      roster: [],
      status: result.status,
      ...(isOwner && result.planRestrictedReason ? { ownerDiagnostic: result.planRestrictedReason } : {}),
    });
  }

  const sdioLeague = allowSdio ? sdioLeagueFor(sport) : null;
  const withLinks = await Promise.all(result.players.map(async (p) => {
    const profilePlayerId = sdioLeague ? await findPlayerIdByName(sdioLeague, p.name) : null;
    return { ...p, profileHref: profilePlayerId ? `/dashboard/discovery/sports/player/${sdioLeague}/${profilePlayerId}` : null };
  }));

  return NextResponse.json({ roster: withLinks, status: "hit" });
}
