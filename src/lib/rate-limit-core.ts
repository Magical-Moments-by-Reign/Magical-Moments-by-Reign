// ── Rate limiting — pure core (no I/O) ──────────────────────────
// The action config, env-configurable thresholds, and the privacy-preserving
// bucket-key hashing. Kept free of prisma / next so it is fully unit-testable.
// The durable store + request wiring live in src/lib/rate-limit.ts.

import { createHash } from "node:crypto";
import { canonicalEmail } from "@/lib/account-identity";
import { type WindowOpts } from "@/lib/auth-support";

export type RateAction =
  | "login" | "password_reset" | "verify_resend" | "invite_attempt"
  | "guardian_attempt" | "account_create" | "sensitive";

const MIN = 60 * 1000;

// Defaults; each is overridable via env (RATE_LIMIT_<ACTION>_MAX / _WINDOW_MIN).
export const RATE_DEFAULTS: Record<RateAction, WindowOpts> = {
  login:            { max: 5,  windowMs: 15 * MIN },
  password_reset:   { max: 5,  windowMs: 60 * MIN },
  verify_resend:    { max: 5,  windowMs: 60 * MIN },
  invite_attempt:   { max: 10, windowMs: 60 * MIN },
  guardian_attempt: { max: 10, windowMs: 60 * MIN },
  account_create:   { max: 5,  windowMs: 60 * MIN },
  sensitive:        { max: 10, windowMs: 15 * MIN },
};

function envNum(name: string): number | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function limitFor(action: RateAction): WindowOpts {
  const base = RATE_DEFAULTS[action];
  const key = action.toUpperCase();
  return {
    max: envNum(`RATE_LIMIT_${key}_MAX`) ?? base.max,
    windowMs: (envNum(`RATE_LIMIT_${key}_WINDOW_MIN`) ?? base.windowMs / MIN) * MIN,
  };
}

export interface BucketParts { ip?: string; email?: string; accountId?: string }

/**
 * A privacy-preserving bucket key: a raw email is never stored or logged — only
 * a salted SHA-256. Different action types produce different buckets, so limits
 * are isolated per action.
 */
export function rateBucket(action: RateAction, parts: BucketParts): string {
  const emailHash = parts.email
    ? createHash("sha256").update(`mmr-rl-email:${canonicalEmail(parts.email)}`).digest("hex")
    : "";
  const raw = [action, parts.ip || "", emailHash, parts.accountId || ""].join("|");
  return createHash("sha256").update(`mmr-rl:${raw}`).digest("hex");
}
