// ── Auth service — shared internals ─────────────────────────────
// Small pieces used by more than one focused auth service module. Keeping them
// here avoids circular imports between auth-login / auth-verification / etc.
// SERVER ONLY.

import { prisma } from "@/lib/db";
import { canonicalEmail } from "@/lib/account-identity";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";

/**
 * Look up an account by any of its emails (matched on the canonical form).
 * Returns the fields the login / verification / password flows need — including
 * the primary email's verified state and the latest guardian-approval status.
 */
export async function accountByEmail(email: string) {
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
  return match?.account ?? null;
}
