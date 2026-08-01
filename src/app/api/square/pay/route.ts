// POST /api/square/pay — charge a tokenized card for an existing order.
// Body: { orderId, sourceId, idempotencyKey }
// The amount is taken from the ORDER in the database (never the client).
// Marks the order PAID only when Square confirms the payment.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSquarePayment, squareServerConfigured } from "@/lib/square";

export async function POST(request: Request) {
  if (!squareServerConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Add Square credentials to enable checkout.", code: "SQUARE_NOT_CONFIGURED" },
      { status: 501 },
    );
  }

  let body: { orderId?: string; sourceId?: string; idempotencyKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { orderId, sourceId, idempotencyKey } = body;
  if (!orderId || !sourceId || !idempotencyKey) {
    return NextResponse.json({ error: "orderId, sourceId and idempotencyKey are required." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, number: order.number, alreadyPaid: true });
  }

  // Idempotency: reuse a prior payment attempt with this key if present.
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing?.status === "COMPLETED") {
    return NextResponse.json({ ok: true, number: order.number });
  }

  const result = await createSquarePayment({
    sourceId,
    amountCents: order.total, // authoritative amount from the DB
    idempotencyKey,
    referenceId: order.number,
    note: `Magical Moments by Reign — ${order.number}`,
  });

  await prisma.payment.upsert({
    where: { idempotencyKey },
    update: { status: result.ok ? "COMPLETED" : "FAILED", squarePaymentId: result.squarePaymentId, error: result.error },
    create: {
      orderId: order.id,
      amount: order.total,
      status: result.ok ? "COMPLETED" : "FAILED",
      squarePaymentId: result.squarePaymentId,
      idempotencyKey,
      error: result.error,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Payment failed." }, { status: 402 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", fulfillmentStatus: "IN_PROGRESS", squarePaymentId: result.squarePaymentId },
  });

  return NextResponse.json({ ok: true, number: order.number });
}
