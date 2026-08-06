// ── /api/journey — Journey Operations Engine endpoint ───────────
//
// Protected: requires a valid signed-in session. The OpenAI key is read
// server-side inside the runtime and is NEVER exposed to the browser, a
// prompt, or a response. All actions run through the approved tool registry
// with the caller's ownership context.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentAccount } from "@/lib/auth-session";
import { runJourney, type JourneyChatMessage } from "@/lib/journey/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth gate — Journey operates only for a signed-in client.
  const account = await currentAccount();
  if (!account) {
    return NextResponse.json({ error: "Please sign in to use Journey." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 });
  }

  const messages: JourneyChatMessage[] = raw
    .filter((m): m is JourneyChatMessage =>
      !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12);

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages." }, { status: 400 });
  }

  const result = await runJourney(messages, account, {
    now: new Date().toISOString(),
    traceId: randomUUID(),
  });

  // Return only client-safe fields (no keys, no secrets).
  return NextResponse.json({
    reply: result.reply,
    source: result.source,
    toolEvents: result.toolEvents,
    pendingConfirmation: result.pendingConfirmation ?? null,
  });
}
