// ── Journey Operations Engine — server-side runtime ─────────────
//
// The tool-calling loop that powers Journey (OpenAI). Runs SERVER-SIDE ONLY:
// the OpenAI key is read from process.env here and never returned to the
// browser, never placed in a prompt, never logged.
//
// The model may act only through the approved tool registry (tools.ts).
// Every tool call is dispatched with the signed-in client's ownership
// context and recorded in the audit trail. Financial/booking tools are
// confirmation-gated inside their handlers, so the loop cannot charge from
// chat alone.
//
// Honest degradation: with no OPENAI_API_KEY the runtime returns a clear
// "not connected yet" reply (source: "offline") — it never fabricates an
// answer or a tool result. If the model errors mid-loop, we surface it
// rather than pretending success.
//
// Env (optional; the engine degrades without it):
//   OPENAI_API_KEY       — required to go live
//   OPENAI_BASE_URL      — default https://api.openai.com/v1
//   OPENAI_JOURNEY_MODEL — default gpt-4o-mini

import type { CurrentAccount } from "@/lib/auth-session";
import { dispatchTool, toolSchemasForOpenAI, TOOL_BY_NAME, type ToolContext, type ToolResult } from "./tools";
import { recordJourneyEvent } from "./audit";

export interface JourneyChatMessage { role: "user" | "assistant"; content: string; }

export interface JourneyToolEvent {
  tool: string;
  status: ToolResult["status"];
  message: string;
  provider?: string;
  /** Only structured, non-secret data is surfaced to the client. */
  data?: unknown;
}

export interface JourneyRunResult {
  reply: string;
  source: "openai" | "offline";
  toolEvents: JourneyToolEvent[];
  /** Set when a tool asked for an explicit CONFIRM PURCHASE from the client. */
  pendingConfirmation?: { tool: string; message: string; data?: unknown };
}

const SYSTEM = `You are Journey, the operations assistant for "Magical Moments by Reign" — a warm luxury platform where families build one permanent website of life's biggest moments and can arrange the celebrations around them.

You guide the SIGNED-IN client: navigating the dashboard, setting up occasions, uploading and organizing media, invitations, guest messages, notifications, and coordinating flights, restaurants, vendors, gifts, and purchases.

HARD RULES:
- You act ONLY through the provided tools. Never claim to have done something a tool didn't return as successful.
- Never complete a purchase, booking, reservation, or payment from conversation alone. Prepare a review with createPurchaseReview and require the client to press CONFIRM PURCHASE.
- Never invent flight availability, prices, confirmation numbers, tickets, reservations, or receipts. If a tool returns "not connected" or an error, tell the client plainly and say nothing was booked or charged.
- Keep the client's data private; only ever act on occasions this client owns.
- Hand off to the Concierge (handoffToConcierge) when a person is requested, a refund is disputed, a purchase fails repeatedly, a specialist is needed, or the client is distressed.
- Be brief, warm, and useful. Offer clear next actions.`;

const OFFLINE_REPLY =
  "✦ I'm Journey. My live operations assistant isn't switched on for this site just yet — so I can't take live actions right now. " +
  "You can still set up occasions, upload photos, and organize your Journeys from the dashboard, and our Concierge or Contact page reaches a real person. " +
  "Nothing was booked or charged.";

/** True when a live OpenAI key is configured for the operations engine. */
export function journeyEngineConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface OpenAIToolCall { id: string; type: "function"; function: { name: string; arguments: string }; }

/** Surface only non-secret parts of a tool result to the client. */
function toEvent(name: string, r: ToolResult): JourneyToolEvent {
  return { tool: name, status: r.status, message: r.message, provider: r.provider, data: r.data };
}

/**
 * Run one Journey turn. `now`/`traceId` are injected so the runtime stays
 * deterministic and testable; callers pass real values.
 */
export async function runJourney(
  messages: JourneyChatMessage[],
  account: CurrentAccount,
  opts: { now: string; traceId: string },
): Promise<JourneyRunResult> {
  const ctx: ToolContext = { account, traceId: opts.traceId, now: opts.now };
  recordJourneyEvent({ kind: "client_request", accountId: account.id, at: opts.now, traceId: opts.traceId, detail: { lastMessage: messages[messages.length - 1]?.content?.slice(0, 500) } });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { reply: OFFLINE_REPLY, source: "offline", toolEvents: [] };
  }

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_JOURNEY_MODEL || "gpt-4o-mini";

  // Build the running conversation. Trim to recent turns and cap length.
  const convo: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM },
    ...messages.slice(-12).map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 4000) })),
  ];

  const toolEvents: JourneyToolEvent[] = [];
  let pendingConfirmation: JourneyRunResult["pendingConfirmation"];

  // Bounded tool-calling loop — never unbounded (protects the endpoint + cost).
  const MAX_ROUNDS = 5;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let data: {
      choices?: { message?: { content?: string | null; tool_calls?: OpenAIToolCall[] } }[];
      id?: string;
    };
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: convo,
          tools: toolSchemasForOpenAI(),
          tool_choice: "auto",
          temperature: 0.4,
          max_tokens: 700,
        }),
      });
      if (!res.ok) {
        recordJourneyEvent({ kind: "error", accountId: account.id, at: opts.now, traceId: opts.traceId, provider: "openai", errorCode: `http_${res.status}`, userMessage: "Journey is temporarily unavailable." });
        return { reply: "Journey is temporarily unavailable right now. Nothing was booked or charged — please try again shortly.", source: "offline", toolEvents };
      }
      data = await res.json();
    } catch {
      recordJourneyEvent({ kind: "error", accountId: account.id, at: opts.now, traceId: opts.traceId, provider: "openai", errorCode: "network", userMessage: "Journey is temporarily unavailable." });
      return { reply: "Journey is temporarily unavailable right now. Nothing was booked or charged — please try again shortly.", source: "offline", toolEvents };
    }

    const choice = data.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls ?? [];

    // No tool calls → this is the final assistant message.
    if (toolCalls.length === 0) {
      const reply = (choice?.content || "").trim() || "Done.";
      return { reply, source: "openai", toolEvents, pendingConfirmation };
    }

    // Record the assistant's tool-call turn, then execute each call.
    convo.push({ role: "assistant", content: choice?.content ?? "", tool_calls: toolCalls });

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { args = {}; }

      const result = await dispatchTool(call.function.name, args, ctx);
      toolEvents.push(toEvent(call.function.name, result));

      // A confirmation-gated tool that wasn't confirmed pauses the flow so the
      // UI can render its CONFIRM PURCHASE button — the model can't push past it.
      const tool = TOOL_BY_NAME.get(call.function.name);
      if (tool?.requiresConfirmation && result.status === "needs_confirmation") {
        pendingConfirmation = { tool: call.function.name, message: result.message, data: result.data };
      }

      // Feed the tool's result back to the model as a tool message.
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ status: result.status, message: result.message, data: result.data ?? null }),
      });
    }

    // If a purchase is awaiting confirmation, stop and let the client decide.
    if (pendingConfirmation) {
      return {
        reply: pendingConfirmation.message,
        source: "openai",
        toolEvents,
        pendingConfirmation,
      };
    }
  }

  // Hit the round cap — return honestly rather than looping forever.
  return {
    reply: "I've done what I can for now. Tell me the next step and I'll continue.",
    source: "openai",
    toolEvents,
    pendingConfirmation,
  };
}
