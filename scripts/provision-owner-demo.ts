// ── Provision the owner / internal demo account (run manually) ──
// Locates-or-creates info@magicalmomentsbyreign.com and grants Owner + Super
// Admin + Internal Demo + Full Lifetime (magical) + billing bypass, then creates
// one editable DRAFT per Journey. Safe to run repeatedly (idempotent). Sends
// nothing. Does NOT touch RLS or any customer's data.
//
// Run (from the project root, with the production DATABASE_URL in the env):
//
//   DATABASE_URL="postgres://…pooler.supabase.com:5432/postgres" \
//     npx tsx scripts/provision-owner-demo.ts
//
// Optional:
//   OWNER_DEMO_EMAIL=info@…        override the account email (defaults to the
//                                   brand address baked into the tooling)
//   OWNER_DEMO_PASSWORD='…'        set an initial password. If omitted and the
//                                   account has none, use "Forgot password" to
//                                   set one — we never store a fake password.
//   npx tsx scripts/provision-owner-demo.ts --reset   delete ONLY the demo
//                                   drafts (never a customer Journey).
//
// The DATABASE_URL (with its password) is never printed.

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  provisionOwnerDemo,
  resetDemoDrafts,
  OWNER_DEMO_EMAIL,
} from "@/lib/owner-demo";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[owner-demo] DATABASE_URL is not set. Provide the production Session-pooler URL and re-run.");
    process.exit(1);
  }

  const email = (process.env.OWNER_DEMO_EMAIL || OWNER_DEMO_EMAIL).trim();
  const reset = process.argv.includes("--reset");

  if (reset) {
    const removed = await resetDemoDrafts(prisma);
    console.log(`[owner-demo] Reset complete — removed ${removed} demo draft(s). The owner account itself was left intact.`);
    return;
  }

  const rawPassword = process.env.OWNER_DEMO_PASSWORD?.trim();
  const passwordHash = rawPassword ? hashPassword(rawPassword) : null;

  const result = await provisionOwnerDemo(prisma, { email, passwordHash });

  console.log("\n[owner-demo] ✅ Provisioned the internal owner/demo account.");
  console.log(`  email          ${result.email}`);
  console.log(`  account        ${result.accountId} ${result.accountCreated ? "(created)" : "(existing)"}`);
  console.log(`  platformRole   ${result.platformRole} (Super Admin / staff)`);
  console.log(`  staffRoles     ${result.staffRoles.join(", ")}`);
  console.log(`  membership     ${result.membershipTier} (Full Lifetime, unlimited Journeys)`);
  console.log(`  internal demo  ${result.isDemo}`);
  console.log(`  billingExempt  ${result.billingExempt} (payment bypassed for THIS account only)`);
  const created = result.drafts.filter((d) => d.created).length;
  const kept = result.drafts.length - created;
  console.log(`  demo drafts    ${result.drafts.length} total — ${created} created, ${kept} already present (left untouched)`);
  if (result.needsPasswordSetup) {
    console.log("\n[owner-demo] ⚠ This account has no password yet. Sign in via \"Forgot password\" at /forgot-password");
    console.log("             to set one, or re-run with OWNER_DEMO_PASSWORD set. (No fake password was stored.)");
  }
  console.log("\n[owner-demo] Open the Owner Demo Studio at /dashboard/owner-demo once signed in. ✦");
}

main()
  .catch((e) => {
    console.error("[owner-demo] Failed:", e?.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
