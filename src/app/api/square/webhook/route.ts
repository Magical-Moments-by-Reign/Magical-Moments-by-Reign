// POST /api/square/webhook — receive verified Square webhooks.
// Verifies the HMAC signature (when the signature key is configured),
// records the event idempotently, and updates order/payment status.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

function verifySignature(body: string, signature: string | null, notificationUrl: string): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) return false;
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(notificationUrl + body);
  const expected = hmac.digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/square/webhook`;

  if (!verifySignature(raw, signature, notificationUrl)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: { event_id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventId = event.event_id || crypto.randomUUID();
  // Idempotent record.
  const seen = await prisma.webhookEvent.findUnique({ where: { squareEventId: eventId } });
  if (seen) return NextResponse.json({ ok: true, duplicate: true });

  await prisma.webhookEvent.create({
    data: { squareEventId: eventId, type: event.type || "unknown", payload: raw, processed: true },
  });

  // Reconcile payment status where possible.
  if (event.type?.startsWith("payment")) {
    const payment = event.data?.object?.payment as { id?: string; status?: string } | undefined;
    if (payment?.id && payment.status) {
      const status = payment.status === "COMPLETED" ? "PAID" : payment.status === "FAILED" ? "FAILED" : undefined;
      if (status) {
        await prisma.order.updateMany({ where: { squarePaymentId: payment.id }, data: { paymentStatus: status } });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
