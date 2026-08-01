// POST /api/checkout — create a PENDING order from the cart.
// Totals are recomputed server-side from approved prices; the browser
// total is ignored. No payment is taken here.

import { NextResponse } from "next/server";
import { createOrder, type CheckoutDetails } from "@/lib/orders";
import type { CartState } from "@/lib/commerce";
import { getPlan } from "@/lib/plans";

export async function POST(request: Request) {
  let body: { cart?: CartState; details?: CheckoutDetails };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cart = body.cart;
  const details = body.details;
  if (!cart?.planId || !getPlan(cart.planId)) {
    return NextResponse.json({ error: "Please select a preservation plan." }, { status: 400 });
  }
  if (!details?.name || !details?.email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  try {
    const order = await createOrder(
      { planId: cart.planId, addons: cart.addons ?? {} },
      details,
    );
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
