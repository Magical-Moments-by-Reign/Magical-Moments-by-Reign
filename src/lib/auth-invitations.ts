// ── Family invitations (server) ─────────────────────────────────
// Create (one hashed-token pair; raw token emailed, only the hash stored),
// look up, accept (apply role + guardian link, notify host), and decline.
// SERVER ONLY.

import { prisma } from "@/lib/db";
import { roleDef, type PlatformRole } from "@/lib/roles";
import { buildInvitation, hashInviteToken, acceptInvitation, type InviteInput } from "@/lib/invitations";
import { dispatchNotification } from "@/lib/notify";
import { sendEmail, familyInvitationEmail, invitationAcceptedEmail } from "@/lib/email";
import { BASE_URL } from "@/lib/auth-shared";

export async function createInvitation(i: InviteInput & { spaceName?: string; inviterName?: string }): Promise<{ id: string }> {
  // ONE build call: the persisted record's tokenHash and the emailed raw token
  // are two halves of the same pair. The raw token is emailed, never stored.
  const { record, token } = buildInvitation(i);
  const created = await prisma.invitation.create({
    data: {
      kind: record.kind, role: record.role, tokenHash: record.tokenHash,
      inviterAccountId: record.inviterAccountId, targetNormalized: record.targetNormalized,
      targetMasked: record.targetMasked, familyId: record.familyId, experienceId: record.experienceId,
      vendorId: record.vendorId, guardianRequired: record.guardianRequired, status: "pending",
      expiresAt: new Date(record.expiresAt),
    },
    select: { id: true },
  });
  const url = `${BASE_URL}/invite/${token}`;
  const { subject, html } = familyInvitationEmail({
    inviterName: i.inviterName || "A family member",
    roleLabel: roleDef(i.role).label,
    spaceName: i.spaceName || "your family space",
    url, expiresText: "in 14 days",
  });
  await sendEmail({ to: i.target, subject, html });
  return created;
}

export async function getInvitationByToken(token: string) {
  if (!token) return null;
  return prisma.invitation.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: {
      id: true, kind: true, role: true, status: true, expiresAt: true, targetMasked: true,
      guardianRequired: true, familyId: true, experienceId: true, vendorId: true,
      inviter: { select: { firstName: true, lastName: true } },
    },
  });
}

/** Politely decline an invitation (kept as a record; never deletes anything). */
export async function declineInvitationByToken(token: string): Promise<boolean> {
  const res = await prisma.invitation.updateMany({ where: { tokenHash: hashInviteToken(token), status: "pending" }, data: { status: "revoked" } });
  return res.count > 0;
}

export type AcceptInviteOutcome =
  | { ok: true; role: PlatformRole }
  | { ok: false; reason: "invalid" | "revoked" | "expired" | "already_accepted" | "guardian_required" };

export async function acceptInvitationByToken(token: string, accepterAccountId: string, guardianAccountId?: string): Promise<AcceptInviteOutcome> {
  const inv = await prisma.invitation.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: { id: true, role: true, status: true, expiresAt: true, guardianRequired: true, inviterAccountId: true, familyId: true },
  });
  if (!inv) return { ok: false, reason: "invalid" };

  const decision = acceptInvitation(
    { status: inv.status as "pending" | "accepted" | "revoked" | "expired", expiresAt: inv.expiresAt.toISOString(), guardianRequired: inv.guardianRequired },
    inv.role as PlatformRole,
    { nowISO: new Date().toISOString(), guardianAccountId },
  );
  if (!decision.ok) return { ok: false, reason: decision.reason };

  await prisma.$transaction([
    prisma.invitation.update({ where: { id: inv.id }, data: { status: "accepted", acceptedByAccountId: accepterAccountId, acceptedAt: new Date() } }),
    prisma.account.update({ where: { id: accepterAccountId }, data: { platformRole: inv.role, ...(guardianAccountId ? { guardianAccountId } : {}) } }),
    prisma.customerAuditLog.create({ data: { accountId: accepterAccountId, actor: "system", action: "invitation_accepted" } }),
  ]);

  if (inv.inviterAccountId) {
    const [accepter, host] = await Promise.all([
      prisma.account.findUnique({ where: { id: accepterAccountId }, select: { firstName: true, lastName: true } }),
      prisma.account.findUnique({ where: { id: inv.inviterAccountId }, select: { firstName: true, emails: { where: { isPrimary: true }, select: { email: true }, take: 1 } } }),
    ]);
    const memberName = accepter ? `${accepter.firstName} ${accepter.lastName}`.trim() : "A family member";
    await dispatchNotification({
      accountId: inv.inviterAccountId, type: "invitation",
      title: "Invitation accepted",
      body: `${memberName} accepted your invitation and joined your family space.`,
      actionUrl: "/account/family", relatedLabel: memberName,
    });
    if (host?.emails[0]) {
      const tpl = invitationAcceptedEmail({ hostName: host.firstName, memberName, spaceName: "your family space" });
      await sendEmail({ to: host.emails[0].email, subject: tpl.subject, html: tpl.html });
    }
  }
  return { ok: true, role: inv.role as PlatformRole };
}
