// ── Journey Operations Engine — audit trail ─────────────────────
//
// Records every meaningful action so support investigations are simple:
// the client request, Journey's recommendation, which tool was requested,
// whether it was approved, its result, any confirmation shown/accepted, the
// booking/purchase result, notifications sent, and human handoffs.
//
// Sink: today this writes a single structured JSON line to the server log
// (captures tool, provider, request/trace id, timestamp, and the
// user-facing message — everything the spec asks to store). A durable
// DB-backed audit table is a clean, additive follow-up (a new Prisma model
// + one db:deploy); recordJourneyEvent is the seam it will plug into with
// no caller changes.
//
// Privacy: callers pass only the minimum needed. Never log secrets, API
// keys, passwords, or full payment-card numbers — see redact() below.

export type JourneyAuditKind =
  | "client_request"
  | "recommendation"
  | "tool_requested"
  | "tool_approved"
  | "tool_result"
  | "confirmation_shown"
  | "confirmation_accepted"
  | "purchase_result"
  | "booking_result"
  | "notification_sent"
  | "handoff"
  | "error";

export interface JourneyAuditEntry {
  kind: JourneyAuditKind;
  /** The signed-in account this action belongs to (ownership scope). */
  accountId: string;
  /** ISO timestamp — the caller supplies it (this module stays pure/testable). */
  at: string;
  /** Tool name when the event is about a tool. */
  tool?: string;
  /** External provider involved (e.g. "duffel", "openai"), when any. */
  provider?: string;
  /** Provider/model request id + our internal trace id, for troubleshooting. */
  requestId?: string;
  traceId?: string;
  /** Internal error code when kind === "error". */
  errorCode?: string;
  /** The exact message the client saw — never a fabricated success. */
  userMessage?: string;
  /** Small, non-sensitive structured detail. Redacted before it leaves. */
  detail?: Record<string, unknown>;
}

// Keys that must never be logged, even if a caller passes them by mistake.
const SECRET_KEYS = /pass(word)?|secret|token|apikey|api_key|authorization|card|cardnumber|cvv|cvc|ssn/i;

/** Shallow-redact obviously sensitive fields from a detail object. */
export function redact(detail?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    out[k] = SECRET_KEYS.test(k) ? "[redacted]" : v;
  }
  return out;
}

/** Normalize an entry into the exact record shape a sink should persist. */
export function toAuditRecord(entry: JourneyAuditEntry): Record<string, unknown> {
  return {
    channel: "journey.audit",
    kind: entry.kind,
    accountId: entry.accountId,
    at: entry.at,
    tool: entry.tool,
    provider: entry.provider,
    requestId: entry.requestId,
    traceId: entry.traceId,
    errorCode: entry.errorCode,
    userMessage: entry.userMessage,
    detail: redact(entry.detail),
  };
}

/**
 * Record one audit event. Never throws — auditing must not break a request.
 * Returns the normalized record (also handy for tests and future DB sinks).
 */
export function recordJourneyEvent(entry: JourneyAuditEntry): Record<string, unknown> {
  const record = toAuditRecord(entry);
  try {
    // Single structured line → easy to grep/ship to a log drain in production.
    console.info(JSON.stringify(record));
  } catch {
    /* logging must never take down a request */
  }
  return record;
}
