// ── Owner bootstrap (protected, run manually) ───────────────────
// Promotes the FIRST Owner admin from an existing, verified Account. Never
// public, never hard-codes an email. Idempotent + single-use: refuses if an
// Owner already exists, so it can't create a second Owner.
//
//   ADMIN_OWNER_EMAIL="owner@example.com" DATABASE_URL="postgres://…" \
//     node scripts/bootstrap-owner.mjs
//
// Steps: find the verified Account for ADMIN_OWNER_EMAIL → confirm no Owner
// exists → add "owner" to staffRoles + set platformRole=admin → audit → exit.

import { PrismaClient } from "@prisma/client";

const email = (process.env.ADMIN_OWNER_EMAIL || "").trim();
if (!email) {
  console.error("[bootstrap-owner] Set ADMIN_OWNER_EMAIL to the email of an existing, verified account.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("[bootstrap-owner] DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const ownerCount = await prisma.account.count({ where: { staffRoles: { contains: '"owner"' } } });
  if (ownerCount > 0) {
    console.log("[bootstrap-owner] An Owner already exists — no action taken (single-use).");
    process.exit(0);
  }

  const ce = await prisma.customerEmail.findFirst({
    where: { OR: [{ canonical: email.toLowerCase() }, { email: { equals: email, mode: "insensitive" } }] },
    select: { accountId: true, verified: true },
  });
  if (!ce) {
    console.error(`[bootstrap-owner] No account found for ${email}. Create and verify the account first, then re-run.`);
    process.exit(1);
  }
  if (!ce.verified) {
    console.error(`[bootstrap-owner] ${email} is not verified yet. Verify the email, then re-run.`);
    process.exit(1);
  }

  await prisma.account.update({ where: { id: ce.accountId }, data: { staffRoles: JSON.stringify(["owner"]), platformRole: "admin" } });
  await prisma.customerAuditLog.create({ data: { accountId: ce.accountId, actor: "bootstrap-script", action: "admin_owner_bootstrapped", detail: "via ADMIN_OWNER_EMAIL" } });
  console.log(`[bootstrap-owner] ✅ Owner granted to ${email} (account ${ce.accountId}).`);
} catch (e) {
  console.error("[bootstrap-owner] Failed:", e?.message ?? e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
