// ── Parent/guardian approval (server) ───────────────────────────
// Creates the pending approval + guardian email; records the guardian's
// approve/decline decision and the permissions they grant. SERVER ONLY.

import { prisma } from "@/lib/db";
import { canonicalEmail, maskEmail, normalizeEmail } from "@/lib/account-identity";
import { type PlatformRole } from "@/lib/roles";
import {
  newGuardianToken, hashGuardianToken, guardianApprovalExpiry,
  applyGuardianDecision, minorDefaultPermissions,
} from "@/lib/guardian";
import { sendEmail, guardianApprovalRequestEmail, guardianApprovalGrantedEmail, guardianApprovalDeclinedEmail } from "@/lib/email";
import { BASE_URL } from "@/lib/auth-shared";

export async function requestGuardianApproval(minorAccountId: string, minorName: string, guardianEmail: string): Promise<void> {
  const token = newGuardianToken();
  const now = new Date().toISOString();
  await prisma.guardianApproval.create({
    data: {
      minorAccountId,
      guardianEmailNormalized: canonicalEmail(guardianEmail),
      guardianEmailMasked: maskEmail(guardianEmail),
      tokenHash: hashGuardianToken(token),
      status: "pending",
      expiresAt: new Date(guardianApprovalExpiry(now)),
    },
  });
  const url = `${BASE_URL}/guardian/${token}`;
  const { subject, html } = guardianApprovalRequestEmail({ minorName, url, expiresText: "in 14 days" });
  await sendEmail({ to: normalizeEmail(guardianEmail), subject, html });
}

export async function getGuardianApprovalByToken(token: string) {
  if (!token) return null;
  return prisma.guardianApproval.findUnique({
    where: { tokenHash: hashGuardianToken(token) },
    select: {
      id: true, status: true, expiresAt: true, guardianEmailMasked: true, permissions: true,
      minor: { select: { id: true, firstName: true, lastName: true, platformRole: true } },
    },
  });
}

export type GuardianDecisionOutcome =
  | { ok: true; decision: "approved" | "declined" }
  | { ok: false; reason: "invalid" | "already_decided" | "expired" };

export async function decideGuardianApproval(
  token: string,
  choice: "approve" | "decline",
  permissions?: Record<string, boolean>,
): Promise<GuardianDecisionOutcome> {
  const rec = await getGuardianApprovalByToken(token);
  if (!rec) return { ok: false, reason: "invalid" };

  const decision = applyGuardianDecision({
    status: rec.status as "pending" | "approved" | "declined" | "expired",
    expiresAtISO: rec.expiresAt.toISOString(),
    nowISO: new Date().toISOString(),
    choice,
  });
  if (!decision.ok) return { ok: false, reason: decision.reason };

  const role = rec.minor.platformRole as PlatformRole;
  const perms = decision.newStatus === "approved"
    ? (permissions && Object.keys(permissions).length ? permissions : minorDefaultPermissions(role))
    : {};

  await prisma.$transaction([
    prisma.guardianApproval.update({ where: { id: rec.id }, data: { status: decision.newStatus, decidedAt: new Date(), permissions: JSON.stringify(perms) } }),
    prisma.customerAuditLog.create({ data: { accountId: rec.minor.id, actor: "guardian", action: `guardian_${decision.newStatus}` } }),
  ]);

  const minorEmail = await prisma.customerEmail.findFirst({ where: { accountId: rec.minor.id, isPrimary: true }, select: { email: true } });
  if (minorEmail) {
    const tpl = decision.newStatus === "approved"
      ? guardianApprovalGrantedEmail({ minorName: rec.minor.firstName })
      : guardianApprovalDeclinedEmail({ minorName: rec.minor.firstName });
    await sendEmail({ to: minorEmail.email, subject: tpl.subject, html: tpl.html });
  }
  return { ok: true, decision: decision.newStatus };
}
