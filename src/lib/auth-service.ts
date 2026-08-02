// ── Auth service (server) ───────────────────────────────────────
// The database glue that turns the tested auth/identity/guardian logic into a
// working experience: account registration (recover-before-duplicate), login
// with rate limiting + account-status handling, email verification, password
// reset (generic responses, single-use tokens, session revocation), family
// invitations, and parent/guardian approval for minors.
//
// It REUSES — never rebuilds — src/lib/auth.ts (crypto), account-identity.ts
// (duplicate detection + normalization), roles.ts, invitations.ts, guardian.ts.
// SERVER ONLY.

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  canonicalEmail, normalizeEmail, normalizePhone, normalizeName, addressKey,
  maskEmail, missingRequiredFields, findProbableMatches, recoveryDecision,
  type AccountInput, type IdentitySnapshot, type RecoveryDecision,
} from "@/lib/account-identity";
import { roleDef, isChildRole, type PlatformRole } from "@/lib/roles";
import {
  newAuthToken, hashAuthToken, authTokenExpiry, checkAuthToken,
  rateLimit, loginOutcome, passwordStrength, type LoginOutcome, type AccountStatusLike,
} from "@/lib/auth-support";
import {
  needsGuardianApproval, newGuardianToken, hashGuardianToken, guardianApprovalExpiry,
  applyGuardianDecision, minorDefaultPermissions,
} from "@/lib/guardian";
import { buildInvitation, hashInviteToken, acceptInvitation, type InviteInput } from "@/lib/invitations";
import { dispatchNotification } from "@/lib/notify";
import {
  sendEmail, verifyEmailEmail, passwordResetEmail, passwordChangedEmail,
  guardianApprovalRequestEmail, guardianApprovalGrantedEmail, guardianApprovalDeclinedEmail,
  familyInvitationEmail, invitationAcceptedEmail,
} from "@/lib/email";
import { AUTH_TOKEN_TTL_HOURS } from "@/lib/auth-support";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";

// Roles a member of the public may self-select at sign-up. Administrators are
// NEVER publicly selectable.
export const PUBLIC_SIGNUP_ROLES: PlatformRole[] = [
  "family_owner", "parent", "guardian", "spouse", "partner",
  "teen", "child", "invited_member", "guest", "vendor",
];

function newCustomerId(): string {
  return `MMR-C-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// ── Identity snapshots (for recover-before-duplicate) ───────────
async function loadSnapshots(): Promise<IdentitySnapshot[]> {
  const rows = await prisma.account.findMany({
    select: {
      id: true, firstName: true, lastName: true,
      emails: { where: { isPrimary: true }, select: { email: true }, take: 1 },
      phones: { where: { isPrimary: true }, select: { phone: true }, take: 1 },
      squareCustomerId: true,
    },
  });
  return rows.map((r) => ({
    accountId: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.emails[0]?.email ?? "",
    phone: r.phones[0]?.phone ?? "",
    squareCustomerId: r.squareCustomerId ?? undefined,
  }));
}

// ── Registration ────────────────────────────────────────────────
export interface RegisterInput extends AccountInput {
  role: PlatformRole;
  guardianEmail?: string; // required for a minor (teen/child)
}

export type RegisterResult =
  | { ok: true; accountId: string; minor: boolean }
  | { ok: false; reason: "missing_fields"; missing: string[] }
  | { ok: false; reason: "weak_password"; issues: string[] }
  | { ok: false; reason: "recover_existing"; recovery: RecoveryDecision }
  | { ok: false; reason: "role_not_allowed" }
  | { ok: false; reason: "guardian_email_required" };

/**
 * Register a new account. Order: allowed role → required fields → password
 * policy → recover-before-duplicate → (minors) require a guardian email. On
 * success, creates the Account identity cluster, sends email verification, and —
 * for minors — creates a pending guardian-approval record and emails the parent.
 */
export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  if (!PUBLIC_SIGNUP_ROLES.includes(input.role)) return { ok: false, reason: "role_not_allowed" };

  const missing = missingRequiredFields(input);
  if (missing.length) return { ok: false, reason: "missing_fields", missing };

  const strength = passwordStrength(input.password || "");
  if (!strength.ok) return { ok: false, reason: "weak_password", issues: strength.issues };

  const minor = needsGuardianApproval(input.role);
  if (minor && !input.guardianEmail?.trim()) return { ok: false, reason: "guardian_email_required" };

  // Recover-before-duplicate: any probable existing account routes to recovery.
  const snapshots = await loadSnapshots();
  const matches = findProbableMatches(
    { firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone, address: input.address },
    snapshots,
  );
  const rec = recoveryDecision(matches);
  if (rec.action === "recover") return { ok: false, reason: "recover_existing", recovery: rec };

  // Create the account + identity cluster.
  const now = new Date();
  const account = await prisma.account.create({
    data: {
      customerId: newCustomerId(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      nameNormalized: normalizeName(input.firstName, input.lastName),
      dateOfBirth: input.dateOfBirth || null,
      passwordHash: hashPassword(input.password!),
      platformRole: input.role,
      emails: {
        create: {
          email: normalizeEmail(input.email),
          canonical: canonicalEmail(input.email),
          isPrimary: true,
          verified: false,
        },
      },
      phones: {
        create: {
          phone: input.phone.trim(),
          normalized: normalizePhone(input.phone),
          isPrimary: true,
          verified: false,
        },
      },
      addresses: {
        create: {
          line1: input.address.line1, line2: input.address.line2 || null,
          city: input.address.city, state: input.address.state,
          postal: input.address.postal, country: input.address.country || "US",
          addressKey: addressKey(input.address), isPrimary: true,
        },
      },
      identity: {
        create: {
          emailCanonical: canonicalEmail(input.email),
          phoneNormalized: normalizePhone(input.phone),
          nameNormalized: normalizeName(input.firstName, input.lastName),
          addressKey: addressKey(input.address),
        },
      },
      auditLogs: { create: { actor: "system", action: "account_created", detail: `role=${input.role}` } },
    },
    select: { id: true, firstName: true },
  });

  // Email verification (always).
  await issueEmailVerification(account.id, normalizeEmail(input.email), account.firstName);

  // Minors: pending guardian approval + parent email.
  if (minor) {
    await requestGuardianApproval(account.id, `${input.firstName} ${input.lastName}`.trim(), input.guardianEmail!);
  }

  return { ok: true, accountId: account.id, minor };
}

// ── Email verification ──────────────────────────────────────────
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

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  if (!token) return { ok: false, reason: "invalid" };
  const rec = await prisma.authToken.findUnique({
    where: { tokenHash: hashAuthToken("verify_email", token) },
    select: { id: true, accountId: true, expiresAt: true, usedAt: true, purpose: true },
  });
  if (!rec || rec.purpose !== "verify_email") return { ok: false, reason: "invalid" };
  const state = { expiresAt: rec.expiresAt.toISOString(), usedAt: rec.usedAt?.toISOString() ?? null };
  const check = checkAuthToken(state, new Date().toISOString());
  if (check !== "ok") return { ok: false, reason: check };

  await prisma.$transaction([
    prisma.authToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.customerEmail.updateMany({
      where: { accountId: rec.accountId, isPrimary: true },
      data: { verified: true, verifiedAt: new Date() },
    }),
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

// ── Account lookup by email ─────────────────────────────────────
async function accountByEmail(email: string) {
  const canon = canonicalEmail(email);
  const match = await prisma.customerEmail.findFirst({
    where: { canonical: canon },
    select: {
      account: {
        select: {
          id: true, firstName: true, lastName: true, status: true, platformRole: true, passwordHash: true,
          emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 },
          guardianApprovals: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        },
      },
    },
  });
  if (!match?.account) return null;
  return match.account;
}

// ── Login (rate-limited, status-aware) ──────────────────────────
// Per-instance failure tracking. Serverless instances are short-lived, so this
// is a best-effort throttle layered on top of the generic-message privacy rule;
// a durable store can be swapped in without changing callers.
const loginFailures = new Map<string, number[]>();

export interface LoginAttempt { outcome: LoginOutcome; accountId?: string }

export async function attemptLogin(email: string, password: string): Promise<LoginAttempt> {
  const key = canonicalEmail(email) || normalizeEmail(email);
  const nowMs = Date.now();
  const rl = rateLimit(loginFailures.get(key) ?? [], nowMs);
  if (rl.locked) {
    return { outcome: loginOutcome({ accountFound: false, passwordOk: false, status: "ACTIVE", emailVerified: false, guardianPending: false, locked: true }) };
  }

  const account = await accountByEmail(email);
  const passwordOk = !!account?.passwordHash && verifyPassword(password, account.passwordHash);

  const minor = account ? isChildRole(account.platformRole as PlatformRole) : false;
  const guardianStatus = account?.guardianApprovals[0]?.status;
  const guardianPending = minor && guardianStatus !== "approved";
  const emailVerified = account?.emails[0]?.verified ?? false;

  const outcome = loginOutcome({
    accountFound: !!account,
    passwordOk,
    status: (account?.status as AccountStatusLike) ?? "ACTIVE",
    emailVerified,
    guardianPending,
  });

  if (outcome.ok && account) {
    loginFailures.delete(key);
    await prisma.customerAuditLog.create({ data: { accountId: account.id, actor: "system", action: "login" } }).catch(() => {});
    return { outcome, accountId: account.id };
  }
  // Only wrong credentials count toward the lockout (not "unverified", etc.).
  if (outcome.code === "invalid_credentials") {
    const arr = (loginFailures.get(key) ?? []).filter((t) => nowMs - t < 15 * 60 * 1000);
    arr.push(nowMs);
    loginFailures.set(key, arr);
  }
  return { outcome };
}

// ── Password reset (generic responses, single-use, revokes sessions) ──
/** Always behaves the same whether or not the email exists (no enumeration). */
export async function startPasswordReset(email: string): Promise<void> {
  const account = await accountByEmail(email);
  if (!account) return;
  const primary = account.emails[0];
  if (!primary) return;

  const token = newAuthToken();
  const now = new Date().toISOString();
  await prisma.authToken.create({
    data: {
      accountId: account.id, purpose: "password_reset",
      tokenHash: hashAuthToken("password_reset", token),
      expiresAt: new Date(authTokenExpiry("password_reset", now)),
    },
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
    // Revoke every session — a reset signs out everywhere.
    prisma.session.updateMany({ where: { accountId: rec.accountId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.customerAuditLog.create({ data: { accountId: rec.accountId, actor: "system", action: "password_reset" } }),
  ]);

  const account = await prisma.account.findUnique({
    where: { id: rec.accountId },
    select: { firstName: true, emails: { where: { isPrimary: true }, select: { email: true }, take: 1 } },
  });
  if (account?.emails[0]) {
    const { subject, html } = passwordChangedEmail({ name: account.firstName, whenText: "just now" });
    await sendEmail({ to: account.emails[0].email, subject, html });
  }
  return { ok: true };
}

// ── Change password (signed-in, requires current password) ─────
export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "wrong_current" | "weak_password"; issues?: string[] };

export async function changePassword(accountId: string, currentPw: string, newPw: string): Promise<ChangePasswordResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { passwordHash: true, firstName: true, emails: { where: { isPrimary: true }, select: { email: true }, take: 1 } } });
  if (!account?.passwordHash || !verifyPassword(currentPw, account.passwordHash)) {
    return { ok: false, reason: "wrong_current" };
  }
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

// ── Guardian approval ───────────────────────────────────────────
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
    prisma.guardianApproval.update({
      where: { id: rec.id },
      data: { status: decision.newStatus, decidedAt: new Date(), permissions: JSON.stringify(perms) },
    }),
    prisma.customerAuditLog.create({
      data: { accountId: rec.minor.id, actor: "guardian", action: `guardian_${decision.newStatus}` },
    }),
  ]);

  // Notify the minor by email (in-app too when they can sign in).
  const minorEmail = await prisma.customerEmail.findFirst({
    where: { accountId: rec.minor.id, isPrimary: true }, select: { email: true },
  });
  if (minorEmail) {
    const tpl = decision.newStatus === "approved"
      ? guardianApprovalGrantedEmail({ minorName: rec.minor.firstName })
      : guardianApprovalDeclinedEmail({ minorName: rec.minor.firstName });
    await sendEmail({ to: minorEmail.email, subject: tpl.subject, html: tpl.html });
  }
  return { ok: true, decision: decision.newStatus };
}

// ── Family invitations ──────────────────────────────────────────
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
  const res = await prisma.invitation.updateMany({
    where: { tokenHash: hashInviteToken(token), status: "pending" },
    data: { status: "revoked" },
  });
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
    prisma.invitation.update({
      where: { id: inv.id },
      data: { status: "accepted", acceptedByAccountId: accepterAccountId, acceptedAt: new Date() },
    }),
    // Apply the invited role + guardian link to the accepting account.
    prisma.account.update({
      where: { id: accepterAccountId },
      data: { platformRole: inv.role, ...(guardianAccountId ? { guardianAccountId } : {}) },
    }),
    prisma.customerAuditLog.create({ data: { accountId: accepterAccountId, actor: "system", action: "invitation_accepted" } }),
  ]);

  // Notify the host — in-app (source of truth) + email.
  if (inv.inviterAccountId) {
    const [accepter, host] = await Promise.all([
      prisma.account.findUnique({ where: { id: accepterAccountId }, select: { firstName: true, lastName: true } }),
      prisma.account.findUnique({ where: { id: inv.inviterAccountId }, select: { firstName: true, emails: { where: { isPrimary: true }, select: { email: true }, take: 1 } } }),
    ]);
    const memberName = accepter ? `${accepter.firstName} ${accepter.lastName}`.trim() : "A family member";
    await dispatchNotification({
      accountId: inv.inviterAccountId,
      type: "invitation",
      title: "Invitation accepted",
      body: `${memberName} accepted your invitation and joined your family space.`,
      actionUrl: "/account/family",
      relatedLabel: memberName,
    });
    if (host?.emails[0]) {
      const tpl = invitationAcceptedEmail({ hostName: host.firstName, memberName, spaceName: "your family space" });
      await sendEmail({ to: host.emails[0].email, subject: tpl.subject, html: tpl.html });
    }
  }
  return { ok: true, role: inv.role as PlatformRole };
}
