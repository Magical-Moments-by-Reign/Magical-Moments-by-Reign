import { NextResponse } from "next/server";
import { advanceInviteByProviderId } from "@/lib/live/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resend event webhook → advances an invite to DELIVERED / OPENED from the
// real provider signal. Gated by a shared secret (?s=). Until the webhook
// is configured with the secret, Delivered/Opened simply stay unset — we
// never guess them.
function authorized(req: Request): boolean {
  const secret = process.env.LIVE_WEBHOOK_SECRET;
  if (!secret) return false;
  return new URL(req.url).searchParams.get("s") === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "not configured" }, { status: 503 });
  try {
    const body = (await req.json()) as { type?: string; data?: { email_id?: string } };
    const id = body.data?.email_id;
    if (id) {
      if (body.type === "email.delivered") await advanceInviteByProviderId(id, "DELIVERED");
      else if (body.type === "email.opened") await advanceInviteByProviderId(id, "OPENED");
    }
  } catch { /* ignore malformed */ }
  return NextResponse.json({ ok: true });
}
