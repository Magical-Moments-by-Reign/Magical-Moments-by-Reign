import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { searchOffers, summarizeOffer, duffelConfigured, duffelTestMode, DuffelError, type Cabin } from "@/lib/duffel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Member-only flight search. Server-side; the Duffel token never reaches the
// browser. Returns trimmed offer summaries + the ids needed to book later.
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!duffelConfigured()) {
    return NextResponse.json({ error: "Flights aren't connected yet.", comingSoon: true }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const origin = String(body.origin || "").trim().toUpperCase();
  const destination = String(body.destination || "").trim().toUpperCase();
  const departureDate = String(body.departureDate || "").trim();
  const returnDate = body.returnDate ? String(body.returnDate).trim() : undefined;
  const adults = Math.max(1, Math.min(9, Number(body.adults) || 1));
  const cabin = (["economy", "premium_economy", "business", "first"].includes(body.cabin) ? body.cabin : "economy") as Cabin;

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return NextResponse.json({ error: "Use 3-letter airport codes (e.g. JFK, LHR)." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    return NextResponse.json({ error: "Choose a departure date." }, { status: 400 });
  }

  try {
    const { requestId, passengerIds, offers } = await searchOffers({ origin, destination, departureDate, returnDate, adults, cabin });
    return NextResponse.json({
      testMode: duffelTestMode(),
      requestId,
      passengerIds,
      offers: offers.slice(0, 30).map(summarizeOffer),
    });
  } catch (e) {
    const err = e as DuffelError;
    return NextResponse.json({ error: err?.message || "Flight search failed." }, { status: err?.status || 502 });
  }
}
