// ── Email verification (server) ─────────────────────────────────
// Single-use, hashed, expiring verification tokens + branded Resend email.
// SERVER ONLY.

import { prisma } from "@/lib/db";
import { newAuthToken, hashAuthToken, authTokenExpiry, checkAuthToken, AUTH_TOKEN_TTL_HOURS } from "@/lib/auth-support";
import { sendEmail, verifyEmailEmail } from "@/lib/email";
import { BASE_URL, accountByEmail } from "@/lib/auth-shared";

export async function issueEmailVerification(accountId: string, email: string, firstName?: string): Promise<void> {
  const token = newAuthToken();
  const now = new Date().toISOString();
  await prisma.authToken.create({
    data: {
      accountId, purpose: "verify_email",
      tokenHash: hashAuthToken("verify_email", token),
      expiresAt: new Date(authTokenExpiry("verify_email", now)),
    },
  });
  const url = `${BASE_URL}/verify-email?token=${token}`;
  const { subject, html } = verifyEmailEmail({ name: firstName, url, hours: AUTH_TOKEN_TTL_HOURS.verify_email });
  await sendEmail({ to: email, subject, html });
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

/** Resend a verification link to the account's unverified primary email. */
export async function resendVerification(email: string): Promise<void> {
  const account = await accountByEmail(email);
  if (!account) return; // generic — never reveal existence
  const primary = account.emails[0];
  if (!primary || primary.verified) return;
  await issueEmailVerification(account.id, primary.email, account.firstName);
}
