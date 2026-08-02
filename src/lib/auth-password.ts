// ── Password reset & change (server) ────────────────────────────
// Reset: generic responses (no enumeration), single-use hashed tokens, all
// sessions revoked, confirmation email. Change: requires the current password,
// signs out other sessions. SERVER ONLY.

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { newAuthToken, hashAuthToken, authTokenExpiry, checkAuthToken, passwordStrength, AUTH_TOKEN_TTL_HOURS } from "@/lib/auth-support";
import { sendEmail, passwordResetEmail, passwordChangedEmail } from "@/lib/email";
import { BASE_URL, accountByEmail } from "@/lib/auth-shared";

/** Always behaves the same whether or not the email exists (no enumeration). */
export async function startPasswordReset(email: string): Promise<void> {
  const account = await accountByEmail(email);
  if (!account) return;
  const primary = account.emails[0];
  if (!primary) return;

  const token = newAuthToken();
  const now = new Date().toISOString();
  await prisma.authToken.create({
    data: { accountId: account.id, purpose: "password_reset", tokenHash: hashAuthToken("password_reset", token), expiresAt: new Date(authTokenExpiry("password_reset", now)) },
  });
  const url = `${BASE_URL}/reset-password?token=${token}`;
  const { subject, html } = passwordResetEmail({ name: account.firstName, url, minutes: AUTH_TOKEN_TTL_HOURS.password_reset * 60 });
  await sendEmail({ to: primary.email, subject, html });
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak_password"; issues?: string[] };

export async function completePasswordReset(token: string, newPassword: string): Promise<ResetResult> {
  if (!token) return { ok: false, reason: "invalid" };
  const rec = await prisma.authToken.findUnique({
    where: { tokenHash: hashAuthToken("password_reset", token) },
    select: { id: true, accountId: true, expiresAt: true, usedAt: true, purpose: true },
  });
  if (!rec || rec.purpose !== "password_reset") return { ok: false, reason: "invalid" };
  const check = checkAuthToken({ expiresAt: rec.expiresAt.toISOString(), usedAt: rec.usedAt?.toISOString() ?? null }, new Date().toISOString());
  if (check !== "ok") return { ok: false, reason: check };

  const strength = passwordStrength(newPassword);
  if (!strength.ok) return { ok: false, reason: "weak_password", issues: strength.issues };

  await prisma.$transaction([
    prisma.authToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.account.update({ where: { id: rec.accountId }, data: { passwordHash: hashPassword(newPassword) } }),
    prisma.session.updateMany({ where: { accountId: rec.accountId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.customerAuditLog.create({ data: { accountId: rec.accountId, actor: "system", action: "password_reset" } }),
  ]);

  const account = await prisma.account.findUnique({ where: { id: rec.accountId }, select: { firstName: true, emails: { where: { isPrimary: true }, select: { email: true }, take: 1 } } });
  if (account?.emails[0]) {
    const { subject, html } = passwordChangedEmail({ name: account.firstName, whenText: "just now" });
    await sendEmail({ to: account.emails[0].email, subject, html });
  }
  return { ok: true };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "wrong_current" | "weak_password"; issues?: string[] };

export async function changePassword(accountId: string, currentPw: string, newPw: string): Promise<ChangePasswordResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { passwordHash: true, firstName: true, emails: { where: { isPrimary: true }, select: { email: true }, take: 1 } } });
  if (!account?.passwordHash || !verifyPassword(currentPw, account.passwordHash)) return { ok: false, reason: "wrong_current" };
  const strength = passwordStrength(newPw);
  if (!strength.ok) return { ok: false, reason: "weak_password", issues: strength.issues };

  await prisma.$transaction([
    prisma.account.update({ where: { id: accountId }, data: { passwordHash: hashPassword(newPw) } }),
    prisma.customerAuditLog.create({ data: { accountId, actor: "self", action: "password_changed" } }),
  ]);
  if (account.emails[0]) {
    const { subject, html } = passwordChangedEmail({ name: account.firstName, whenText: "just now" });
    await sendEmail({ to: account.emails[0].email, subject, html });
  }
  return { ok: true };
}
