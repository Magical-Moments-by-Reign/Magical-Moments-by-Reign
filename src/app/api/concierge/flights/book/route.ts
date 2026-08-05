import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { getOffer, createTestOrder, duffelConfigured, duffelTestMode, DuffelError, type OrderPassenger } from "@/lib/duffel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Member-only flight booking. In TEST mode this creates a Duffel test order —
// NO real money, NO real ticket. We never claim a real booking; the response
// carries testMode so the UI can label it clearly.
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!duffelConfigured()) return NextResponse.json({ error: "Flights aren't connected yet.", comingSoon: true }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const offerId = String(body.offerId || "");
  const passengerIds: string[] = Array.isArray(body.passengerIds) ? body.passengerIds.map(String) : [];
  const details: any[] = Array.isArray(body.passengers) ? body.passengers : [];
  if (!offerId || passengerIds.length === 0 || details.length !== passengerIds.length) {
    return NextResponse.json({ error: "Missing offer or passenger details." }, { status: 400 });
  }

  const passengers: OrderPassenger[] = passengerIds.map((id, i) => ({
    id,
    title: String(details[i]?.title || "mr").toLowerCase(),
    given_name: String(details[i]?.given_name || "").trim(),
    family_name: String(details[i]?.family_name || "").trim(),
    born_on: String(details[i]?.born_on || "").trim(),
    gender: String(details[i]?.gender || "m").toLowerCase(),
    email: String(details[i]?.email || "").trim(),
    phone_number: String(details[i]?.phone_number || "").trim(),
  }));
  for (const p of passengers) {
    if (!p.given_name || !p.family_name || !/^\d{4}-\d{2}-\d{2}$/.test(p.born_on) || !p.email || !p.phone_number) {
      return NextResponse.json({ error: "Each traveler needs a name, date of birth, email, and phone." }, { status: 400 });
    }
  }

  try {
    const offer = await getOffer(offerId); // fresh price + currency
    const order = await createTestOrder(offer, passengers);
    return NextResponse.json({
      testMode: duffelTestMode(),
      bookingReference: order.bookingReference,
      orderId: order.id,
    });
  } catch (e) {
    const err = e as DuffelError;
    return NextResponse.json({ error: err?.message || "Booking could not be completed." }, { status: err?.status || 502 });
  }
}
