// ── Durable rate limiting (server, PostgreSQL-backed) ───────────
// A shared login/abuse limiter that works across serverless instances by
// storing hits in PostgreSQL (we already run Postgres — no Redis or paid add-on
// unless it becomes a measured bottleneck). Each hit row belongs to a *bucket*
// that is a SHA-256 hash of (action + IP + hashed email + accountId) — we NEVER
// store a raw email just to rate-limit. Windows expire; expired rows are cleaned
// opportunistically. The verdict itself uses the tested pure `evaluateWindow`.
//
// Guardrails:
//   • Server-side only; generic messaging is the caller's job (no enumeration).
//   • Fail-OPEN: if the datastore is briefly unavailable we allow the request
//     rather than lock everyone out — availability over a hard throttle.
//   • Repeated abuse is audit-logged (no PII, no passwords, no tokens).
//   • Thresholds are configurable via env.
//
// SERVER ONLY.

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { evaluateWindow } from "@/lib/auth-support";
import { limitFor, rateBucket, type RateAction, type BucketParts } from "@/lib/rate-limit-core";

export { limitFor, rateBucket, type RateAction, type BucketParts } from "@/lib/rate-limit-core";

export interface RateCheck { limited: boolean; retryAfterMs: number }

/**
 * Read-only check: is this bucket currently over its threshold? Fails OPEN if
 * the datastore is unavailable. Does not record an attempt.
 */
export async function checkRateLimit(action: RateAction, parts: BucketParts): Promise<RateCheck> {
  try {
    const cfg = limitFor(action);
    const bucket = rateBucket(action, parts);
    const now = new Date();
    // Opportunistic cleanup of anything expired (cheap, keeps the table small).
    prisma.rateLimitHit.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {});
    const rows = await prisma.rateLimitHit.findMany({
      where: { bucket, createdAt: { gt: new Date(now.getTime() - cfg.windowMs) } },
      select: { createdAt: true },
    });
    const res = evaluateWindow(rows.map((r) => r.createdAt.getTime()), now.getTime(), cfg);
    if (res.locked) await auditAbuse(action, parts, rows.length);
    return { limited: res.locked, retryAfterMs: res.retryAfterMs };
  } catch {
    return { limited: false, retryAfterMs: 0 }; // fail-open
  }
}

/** Record one attempt for this bucket. Best-effort — never blocks the request. */
export async function recordAttempt(action: RateAction, parts: BucketParts): Promise<void> {
  try {
    const cfg = limitFor(action);
    const now = new Date();
    await prisma.rateLimitHit.create({
      data: { bucket: rateBucket(action, parts), action, expiresAt: new Date(now.getTime() + cfg.windowMs) },
    });
  } catch {
    /* fail-open: a logging failure must not break auth */
  }
}

/** Check then, if allowed, record. Convenience for request-style limits. */
export async function consume(action: RateAction, parts: BucketParts): Promise<RateCheck> {
  const check = await checkRateLimit(action, parts);
  if (!check.limited) await recordAttempt(action, parts);
  return check;
}

async function auditAbuse(action: RateAction, parts: BucketParts, count: number): Promise<void> {
  // No PII: log the action + a short bucket fingerprint only.
  const fp = rateBucket(action, parts).slice(0, 10);
  console.warn(`[rate-limit] threshold exceeded action=${action} bucket=${fp} count=${count}`);
  if (parts.accountId) {
    await prisma.customerAuditLog.create({
      data: { accountId: parts.accountId, actor: "system", action: "rate_limit_exceeded", detail: action },
    }).catch(() => {});
  }
}

/** Best-effort client IP from proxy headers (for bucketing). */
export async function clientIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim();
    return h.get("x-real-ip")?.trim() || undefined;
  } catch {
    return undefined;
  }
}
