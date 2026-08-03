// ── Account registration (server) ───────────────────────────────
// Recover-before-duplicate sign-up: allowed role -> required fields -> password
// policy -> duplicate recovery -> (minors) guardian email. Creates the Account
// identity cluster, sends email verification, and starts guardian approval for
// minors. SERVER ONLY.

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  canonicalEmail, normalizeEmail, normalizePhone, normalizeName, addressKey,
  missingRequiredFields, findProbableMatches, recoveryDecision,
  type AccountInput, type IdentitySnapshot, type RecoveryDecision,
} from "@/lib/account-identity";
import { type PlatformRole } from "@/lib/roles";
import { passwordStrength } from "@/lib/auth-support";
import { needsGuardianApproval } from "@/lib/guardian";
import { issueEmailVerification } from "@/lib/auth-verification";
import { requestGuardianApproval } from "@/lib/auth-guardian";

// Roles a member of the public may self-select at sign-up. Administrators are
// NEVER publicly selectable.
export const PUBLIC_SIGNUP_ROLES: PlatformRole[] = [
  "family_owner", "parent", "guardian", "spouse", "partner",
  "teen", "child", "invited_member", "guest", "vendor",
];

function newCustomerId(): string {
  return `MMR-C-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// Identity snapshots for recover-before-duplicate.
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
    accountId: r.id, firstName: r.firstName, lastName: r.lastName,
    email: r.emails[0]?.email ?? "", phone: r.phones[0]?.phone ?? "",
    squareCustomerId: r.squareCustomerId ?? undefined,
  }));
}

export interface RegisterInput extends AccountInput {
  role: PlatformRole;
  guardianEmail?: string; // required for a minor (teen/child)
}

export type RegisterResult =
  | { ok: true; accountId: string; minor: boolean; emailSent: boolean }
  | { ok: false; reason: "missing_fields"; missing: string[] }
  | { ok: false; reason: "weak_password"; issues: string[] }
  | { ok: false; reason: "recover_existing"; recovery: RecoveryDecision }
  | { ok: false; reason: "role_not_allowed" }
  | { ok: false; reason: "guardian_email_required" };

export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  if (!PUBLIC_SIGNUP_ROLES.includes(input.role)) return { ok: false, reason: "role_not_allowed" };

  const missing = missingRequiredFields(input);
  if (missing.length) return { ok: false, reason: "missing_fields", missing };

  const strength = passwordStrength(input.password || "");
  if (!strength.ok) return { ok: false, reason: "weak_password", issues: strength.issues };

  const minor = needsGuardianApproval(input.role);
  if (minor && !input.guardianEmail?.trim()) return { ok: false, reason: "guardian_email_required" };

  const snapshots = await loadSnapshots();
  const matches = findProbableMatches(
    { firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone, address: input.address },
    snapshots,
  );
  const rec = recoveryDecision(matches);
  if (rec.action === "recover") return { ok: false, reason: "recover_existing", recovery: rec };

  const account = await prisma.account.create({
    data: {
      customerId: newCustomerId(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      nameNormalized: normalizeName(input.firstName, input.lastName),
      dateOfBirth: input.dateOfBirth || null,
      passwordHash: hashPassword(input.password!),
      platformRole: input.role,
      emails: { create: { email: normalizeEmail(input.email), canonical: canonicalEmail(input.email), isPrimary: true, verified: false } },
      phones: { create: { phone: input.phone.trim(), normalized: normalizePhone(input.phone), isPrimary: true, verified: false } },
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
          emailCanonical: canonicalEmail(input.email), phoneNormalized: normalizePhone(input.phone),
          nameNormalized: normalizeName(input.firstName, input.lastName), addressKey: addressKey(input.address),
        },
      },
      auditLogs: { create: { actor: "system", action: "account_created", detail: `role=${input.role}` } },
    },
    select: { id: true, firstName: true },
  });

  // Account is already created; delivery failure must not undo that.
  const emailResult = await issueEmailVerification(account.id, normalizeEmail(input.email), account.firstName);
  if (minor) await requestGuardianApproval(account.id, `${input.firstName} ${input.lastName}`.trim(), input.guardianEmail!);

  return { ok: true, accountId: account.id, minor, emailSent: emailResult.sent };
}
