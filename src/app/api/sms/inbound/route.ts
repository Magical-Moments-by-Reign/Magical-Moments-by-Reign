import { NextResponse } from "next/server";
import { parseSmsKeyword } from "@/lib/live/invite-core";
import { optOut, optIn } from "@/lib/live/sms-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio inbound-SMS webhook. A guest texting STOP is suppressed; START
// re-subscribes. Gated by a shared secret (?s=) so it's inert until the
// webhook URL is configured with the secret in the provider console.
function authorized(req: Request): boolean {
  const secret = process.env.LIVE_WEBHOOK_SECRET;
  if (!secret) return false;
  return new URL(req.url).searchParams.get("s") === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "not configured" }, { status: 503 });
  let from = "", body = "";
  try {
    const form = await req.formData();
    from = String(form.get("From") || "");
    body = String(form.get("Body") || "");
  } catch { /* ignore */ }

  const kw = parseSmsKeyword(body);
  if (kw === "stop") await optOut(from).catch(() => {});
  if (kw === "start") await optIn(from).catch(() => {});

  // Empty TwiML — we don't auto-reply (carriers send the standard confirmation).
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });
}
