// ── Email verification (server) ─────────────────────────────────
// Single-use, hashed, expiring verification tokens + branded Resend email.
// SERVER ONLY.

import { prisma } from "@/lib/db";
import { newAuthToken, hashAuthToken, authTokenExpiry, checkAuthToken, AUTH_TOKEN_TTL_HOURS } from "@/lib/auth-support";
import { sendEmail, verifyEmailEmail } from "@/lib/email";
import { type SendResult, verificationAuditEntry } from "@/lib/email-delivery";
import { BASE_URL, accountByEmail } from "@/lib/auth-shared";

/**
 * Issue (or re-issue) an email-verification link. Returns the delivery result
 * so callers can tell the customer the truth. Account state is preserved even
 * when delivery fails: the token is persisted FIRST and is never rolled back on
 * a send failure, and the attempt is audit-logged (redacted, no secrets).
 */
export async function issueEmailVerification(accountId: string, email: string, firstName?: string): Promise<SendResult> {
  const token = newAuthToken();
  const now = new Date().toISOString();
  // 1) Persist the single-use token FIRST — the link must work even if the
  //    email provider is down. We never delete it because a send failed.
  await prisma.authToken.create({
    data: {
      accountId, purpose: "verify_email",
      tokenHash: hashAuthToken("verify_email", token),
      expiresAt: new Date(authTokenExpiry("verify_email", now)),
    },
  });
  const url = `${BASE_URL}/verify-email?token=${token}`;
  const { subject, html } = verifyEmailEmail({ name: firstName, url, hours: AUTH_TOKEN_TTL_HOURS.verify_email });
  // 2) Attempt delivery. sendEmail never throws; it returns a result.
  const result = await sendEmail({ to: email, subject, html });
  // 3) Record the outcome so failures are visible without exposing secrets.
  const entry = verificationAuditEntry(result);
  await prisma.customerAuditLog
    .create({ data: { accountId, actor: "system", action: entry.action, detail: entry.detail } })
    .catch(() => {}); // auditing must never break the request
  return result;
}

export type VerifyEmailResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "used" };

export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  if (!token) return { ok: false, reason: "invalid" };
  const rec = await prisma.authToken.findUnique({
    where: { tokenHash: hashAuthToken("verify_email", token) },
    select: { id: true, accountId: true, expiresAt: true, usedAt: true, purpose: true },
  });
  if (!rec || rec.purpose !== "verify_email") return { ok: false, reason: "invalid" };
  const check = checkAuthToken({ expiresAt: rec.expiresAt.toISOString(), usedAt: rec.usedAt?.toISOString() ?? null }, new Date().toISOString());
  if (check !== "ok") return { ok: false, reason: check };

  await prisma.$transaction([
    prisma.authToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.customerEmail.updateMany({ where: { accountId: rec.accountId, isPrimary: true }, data: { verified: true, verifiedAt: new Date() } }),
    prisma.customerAuditLog.create({ data: { accountId: rec.accountId, actor: "system", action: "email_verified" } }),
  ]);
  return { ok: true };
}

export type ResendResult = { ok: true } | { ok: false; reason: "unavailable" };

/**
 * Resend a verification link to the account's unverified primary email.
 * Enumeration-safe: a missing account or an already-verified address returns
 * `ok:true` (indistinguishable from a real send). Only a genuine delivery
 * failure for a real, unverified account returns `ok:false` — so the customer
 * staring at "please verify your email" learns the truth instead of a false
 * "it's on its way".
 */
export async function resendVerification(email: string): Promise<ResendResult> {
  const account = await accountByEmail(email);
  if (!account) return { ok: true }; // generic — never reveal existence
  const primary = account.emails[0];
  if (!primary || primary.verified) return { ok: true };
  const result = await issueEmailVerification(account.id, primary.email, account.firstName);
  return result.sent ? { ok: true } : { ok: false, reason: "unavailable" };
}
