import { NextResponse } from "next/server";
import { askMagical, type ChatMessage, type AssistantMode } from "@/lib/ask-magical";
import { currentAccount } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  const messages: ChatMessage[] = raw
    .filter((m): m is ChatMessage =>
      !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12);

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages." }, { status: 400 });
  }

  // Concierge is a member-only service. If a caller requests concierge mode
  // without a valid session, fall back to the general Ask-Magical assistant —
  // the server never grants member-only behaviour to a signed-out visitor.
  const requested = (body as { mode?: unknown })?.mode;
  let mode: AssistantMode = requested === "concierge" ? "concierge" : "magical";
  if (mode === "concierge" && !(await currentAccount())) mode = "magical";

  const result = await askMagical(messages, mode);
  return NextResponse.json(result);
}
