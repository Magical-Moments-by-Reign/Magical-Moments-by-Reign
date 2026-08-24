// GET /api/discovery/sports/live-scores
// Poll target for the client-side Live Scores panel on the schedule page
// (see src/app/dashboard/discovery/sports/schedule/page.tsx and
// LiveScoresPanel.tsx) — returns every currently-live game across every
// supported sport. requireAccount-gated like every other Discovery data
// route. Backed by getLiveScoresAcrossSports, which itself sits on
// getGamesByDate's existing 3-minute cache, so frequent client polling
// never translates into extra paid-provider calls.

import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/guard";
import { getLiveScoresAcrossSports, SPORT_CATALOG } from "@/lib/discovery/sports/service";

export async function GET() {
  await requireAccount("/dashboard/discovery/sports/schedule");
  try {
    const games = await getLiveScoresAcrossSports(SPORT_CATALOG.map((s) => s.slug));
    const shaped = games.map((g) => ({
      id: g.id,
      sport: g.sport,
      sportLabel: SPORT_CATALOG.find((s) => s.slug === g.sport)?.label ?? g.sport,
      status: g.status,
      period: g.period ?? null,
      homeTeamName: g.homeTeamName,
      homeTeamLogoUrl: g.homeTeamLogoUrl ?? null,
      awayTeamName: g.awayTeamName,
      awayTeamLogoUrl: g.awayTeamLogoUrl ?? null,
      homeScore: g.homeScore ?? null,
      awayScore: g.awayScore ?? null,
    }));
    return NextResponse.json({ games: shaped });
  } catch {
    // A failed poll should read as "try again next tick," never a broken
    // page — same honest-degrade contract as the single-game live route.
    return NextResponse.json({ games: [] });
  }
}
