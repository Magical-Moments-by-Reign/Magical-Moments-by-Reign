import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { suggestSearch } from "@/lib/discovery/providers/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live typeahead for the Near You search box — Ticketmaster's own /suggest
// endpoint, the same real data behind Ticketmaster's own search box. The
// API key stays server-side; the browser only ever sees resolved real
// attraction/venue records. Gated to signed-in accounts.
export async function GET(req: Request) {
  const account = await currentAccount().catch(() => null);
  if (!account) return NextResponse.json({ matches: [] }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ matches: [] });

  const matches = await suggestSearch(q).catch(() => []);
  return NextResponse.json({ matches });
}
