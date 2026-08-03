// ── Email delivery — pure decision core ─────────────────────────
// No network, no environment access, no Prisma. Everything here is a pure
// function of its inputs so it can be unit-tested exhaustively. `sendEmail`
// (src/lib/email.ts) wires these to `fetch` + `process.env`, and
// `issueEmailVerification` (src/lib/auth-verification.ts) uses the audit
// helper. Keeping the logic here is why we can test the missing-key,
// unverified-domain, rejection, and success paths without a live Resend.

export interface SendResult {
  sent: boolean;
  skipped?: boolean; // true when we deliberately didn't attempt (e.g. no API key)
  error?: string;    // human-readable, ALWAYS redacted of secrets
  id?: string;       // Resend message id on success
}

// Only used once the sending domain is verified in Resend.
export const DEFAULT_FROM = "Magical Moments by Reign <info@magicalmomentsbyreign.com>";

/** Resolve the From address. Prefers RESEND_FROM_EMAIL, then MAIL_FROM, then default. */
export function resolveFrom(env: { RESEND_FROM_EMAIL?: string; MAIL_FROM?: string }): {
  from: string;
  source: "RESEND_FROM_EMAIL" | "MAIL_FROM" | "default";
} {
  const rfe = env.RESEND_FROM_EMAIL?.trim();
  if (rfe) return { from: rfe, source: "RESEND_FROM_EMAIL" };
  const mf = env.MAIL_FROM?.trim();
  if (mf) return { from: mf, source: "MAIL_FROM" };
  return { from: DEFAULT_FROM, source: "default" };
}

/** Can we even attempt a send? Missing key ⇒ no (and we say why). */
export function preflight(env: { RESEND_API_KEY?: string }): { canSend: boolean; reason?: "missing_api_key" } {
  if (!env.RESEND_API_KEY?.trim()) return { canSend: false, reason: "missing_api_key" };
  return { canSend: true };
}

/**
 * Redact anything that looks like a secret before it reaches a log line, an
 * audit-log row, or a customer-facing message. Belt-and-suspenders: we never
 * put the key in a message on purpose, but a provider error could echo it back.
 */
export function redact(input: string): string {
  if (!input) return input;
  return input
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***") // any bearer token (runs first)
    .replace(/re_[A-Za-z0-9_-]{3,}/g, "re_***");         // Resend API keys
}

/** Turn a raw Resend HTTP response into a SendResult. Errors are redacted. */
export function interpretResendResponse(input: { ok: boolean; status: number; body: unknown }): SendResult {
  const body = (input.body ?? {}) as Record<string, unknown>;
  if (input.ok) {
    return { sent: true, id: typeof body.id === "string" ? body.id : undefined };
  }
  const raw =
    (typeof body.message === "string" && body.message) ||
    (typeof body.name === "string" && body.name) ||
    `send failed (HTTP ${input.status})`;
  return { sent: false, error: redact(String(raw)) };
}

/** True when Resend rejected the send because the sending domain isn't verified. */
export function isUnverifiedDomainError(result: SendResult): boolean {
  return !!result.error && /not verified/i.test(result.error);
}

/**
 * The audit-log entry to write after attempting a verification email. Detail is
 * always redacted and NEVER contains a rollback signal — the token stays stored
 * even when delivery fails (see issueEmailVerification).
 */
export function verificationAuditEntry(result: SendResult): {
  action: "verification_email_sent" | "verification_email_failed";
  detail: string;
} {
  if (result.sent) {
    return { action: "verification_email_sent", detail: redact(`resend id=${result.id ?? "unknown"}`) };
  }
  if (result.skipped) {
    return { action: "verification_email_failed", detail: redact(`skipped: ${result.error ?? "email not configured"}`) };
  }
  return { action: "verification_email_failed", detail: redact(`error: ${result.error ?? "unknown send error"}`) };
}
