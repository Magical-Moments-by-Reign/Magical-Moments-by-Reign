// POST /api/checkout — create a PENDING order from the cart.
// Totals are recomputed server-side from approved prices; the browser
// total is ignored. No payment is taken here.

import { NextResponse } from "next/server";
import { createOrder, type CheckoutDetails } from "@/lib/orders";
import { hasPurchase, type CartState } from "@/lib/commerce";

export async function POST(request: Request) {
  let body: { cart?: CartState; details?: CheckoutDetails };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cart = body.cart;
  const details = body.details;
  // Accept a membership OR a legacy plan — both flow through the same order path.
  if (!cart || !hasPurchase(cart)) {
    return NextResponse.json({ error: "Please select a membership or preservation plan." }, { status: 400 });
  }
  if (!details?.name || !details?.email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  try {
    // Pass the whole cart (membership + plan + addons); createOrder re-prices
    // authoritatively via computeTotals / pricing-engine — client totals are ignored.
    const order = await createOrder(
      { membership: cart.membership ?? null, planId: cart.planId ?? null, addons: cart.addons ?? {} },
      details,
    );
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
