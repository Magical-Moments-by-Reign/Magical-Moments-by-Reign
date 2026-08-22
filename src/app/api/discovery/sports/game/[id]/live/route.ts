// GET /api/discovery/sports/game/[id]/live
// Poll target for the client-side Live Game Center — returns the real,
// freshly-resolved state of one game (see getLiveGameState's tiered cache
// policy: no live call at all for a FINAL game or one far from kickoff,
// a short-cached live call otherwise). requireAccount-gated like every
// other Discovery data route.

import { NextRequest, NextResponse } from "next/server";
import { requireAccount } from "@/lib/guard";
import { getLiveGameState } from "@/lib/discovery/sports/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAccount("/dashboard/discovery/sports");
  const { id } = await params;
  const state = await getLiveGameState(id);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(state);
}
