import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { searchDestinations } from "@/lib/reservations/hotels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side destination autocomplete. The Hotelbeds credentials stay on the
// server (inside the destinations loader); the browser only ever sees resolved,
// real destination records. Gated to signed-in accounts.
export async function GET(req: Request) {
  const account = await currentAccount().catch(() => null);
  if (!account) return NextResponse.json({ matches: [] }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ matches: [] });

  const matches = await searchDestinations(q, 8).catch(() => []);
  // Return only what the UI needs — code + labels (all real Hotelbeds records).
  return NextResponse.json({
    matches: matches.map((d) => ({
      code: d.code,
      name: d.name,
      country: d.country,
      region: d.region,
      provider: d.provider,
    })),
  });
}
