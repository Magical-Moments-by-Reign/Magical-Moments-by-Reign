// ── Square server client ────────────────────────────────────────
// Thin fetch wrapper over Square's Payments API. The access token is
// SERVER-ONLY and never sent to the browser. The browser only ever gets
// the public NEXT_PUBLIC_SQUARE_* values (App ID + Location ID) used by
// the Web Payments SDK to tokenize the card into a one-time `sourceId`.
//
// Configure via env (see .env.example / docs/COMMERCE.md):
//   SQUARE_ENVIRONMENT = sandbox | production
//   SQUARE_ACCESS_TOKEN            (secret, server-only)
//   NEXT_PUBLIC_SQUARE_APPLICATION_ID
//   NEXT_PUBLIC_SQUARE_LOCATION_ID
//   SQUARE_WEBHOOK_SIGNATURE_KEY   (secret, server-only)

const SQUARE_VERSION = "2025-01-23";

export function squareEnv(): "sandbox" | "production" {
  return process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function squareApiBase(): string {
  return squareEnv() === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

/** True only when the server can actually create payments. */
export function squareServerConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID);
}

/** True when the browser can render the card form. */
export function squareClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID && process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID);
}

export interface CreatePaymentResult {
  ok: boolean;
  squarePaymentId?: string;
  status?: string;
  error?: string;
}

/**
 * Create a Square payment from a tokenized card `sourceId`. Amount is in
 * cents. `idempotencyKey` prevents duplicate charges on retries.
 */
export async function createSquarePayment(params: {
  sourceId: string;
  amountCents: number;
  idempotencyKey: string;
  referenceId?: string;
  note?: string;
}): Promise<CreatePaymentResult> {
  if (!squareServerConfigured()) {
    return { ok: false, error: "Square is not configured on the server." };
  }
  try {
    const res = await fetch(`${squareApiBase()}/v2/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        source_id: params.sourceId,
        idempotency_key: params.idempotencyKey,
        amount_money: { amount: params.amountCents, currency: "USD" },
        location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
        reference_id: params.referenceId,
        note: params.note,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.errors?.[0]?.detail || "Payment failed.";
      return { ok: false, error: msg };
    }
    return { ok: true, squarePaymentId: data?.payment?.id, status: data?.payment?.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
