import { NextResponse } from "next/server";
import { askMagical, type ChatMessage } from "@/lib/ask-magical";

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

  const result = await askMagical(messages);
  return NextResponse.json(result);
}
