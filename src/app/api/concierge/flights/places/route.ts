import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { suggestPlaces, duffelConfigured, DuffelError } from "@/lib/duffel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// City / airport / landmark → IATA suggestions (Duffel resolves the codes).
export async function GET(req: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!duffelConfigured()) return NextResponse.json({ places: [] });
  const q = new URL(req.url).searchParams.get("q") || "";
  try {
    return NextResponse.json({ places: await suggestPlaces(q) });
  } catch (e) {
    const err = e as DuffelError;
    return NextResponse.json({ error: err?.message || "Lookup failed.", places: [] }, { status: err?.status || 502 });
  }
}
