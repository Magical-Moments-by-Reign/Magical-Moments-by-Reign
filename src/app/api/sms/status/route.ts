import { NextResponse } from "next/server";
import { advanceInviteByProviderId } from "@/lib/live/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio status-callback webhook → advances an invite's delivery state from
// the real provider signal. Gated by a shared secret (?s=).
function authorized(req: Request): boolean {
  const secret = process.env.LIVE_WEBHOOK_SECRET;
  if (!secret) return false;
  return new URL(req.url).searchParams.get("s") === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "not configured" }, { status: 503 });
  try {
    const form = await req.formData();
    const sid = String(form.get("MessageSid") || "");
    const status = String(form.get("MessageStatus") || "").toLowerCase();
    if (sid) {
      if (status === "delivered") await advanceInviteByProviderId(sid, "DELIVERED");
      else if (status === "failed" || status === "undelivered") await advanceInviteByProviderId(sid, "FAILED");
    }
  } catch { /* ignore malformed */ }
  return NextResponse.json({ ok: true });
}
