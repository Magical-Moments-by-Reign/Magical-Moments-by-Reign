// ── Deploy-time database setup ──────────────────────────────────
// Runs during the Netlify build (where DATABASE_URL + network exist).
// Applies the Prisma schema to the production database, then seeds the
// default experiences — but ONLY on first setup (when the database has
// no experiences yet), so it never duplicates data or resurrects
// content you've deleted on later deploys.
//
// Safe to run on every deploy: schema push is idempotent.

import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[db] DATABASE_URL not set — skipping database setup.");
  process.exit(0);
}

function run(cmd) {
  console.log(`[db] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

// 1) Create/update all tables from prisma/schema.prisma.
//    We capture output so the error handler can tell WHY the push failed and
//    print an accurate hint — a data-loss/schema guard is NOT a connection
//    problem, and conflating the two has misled deploy diagnosis before.
try {
  console.log("[db] Applying schema to the database (prisma db push)…");
  console.log("[db] $ npx prisma db push --skip-generate");
  const out = execSync("npx prisma db push --skip-generate", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  process.stdout.write(out);
} catch (err) {
  if (err?.stdout) process.stdout.write(err.stdout);
  if (err?.stderr) process.stderr.write(err.stderr);
  const combined = `${err?.stdout ?? ""}\n${err?.stderr ?? ""}\n${err?.message ?? ""}`;

  if (/data loss|--accept-data-loss/i.test(combined)) {
    // The database is reachable; Prisma refused a potentially-destructive change.
    console.error("\n[db] ✖ Schema push blocked by Prisma's DATA-LOSS guard (the database IS reachable — this is not a connection problem).");
    console.error("[db]   A change above (e.g. adding a unique constraint, or dropping a column) could affect existing rows.");
    console.error("[db]   Preferred fix: adjust prisma/schema.prisma so the change is additive/non-destructive, then redeploy.");
    console.error("[db]   Only if the change is verified safe on real data: re-run with `prisma db push --accept-data-loss`.");
  } else {
    console.error("\n[db] ✖ Could not reach the database to apply the schema.");
    console.error("[db] DATABASE_URL must be the Supabase **Session pooler** string:");
    console.error("[db]   host  →  aws-0-<region>.pooler.supabase.com   (IPv4, works on Netlify)");
    console.error("[db]   NOT   →  db.<project>.supabase.co             (direct, IPv6-only, unreachable)");
    console.error("[db]   NOT   →  ...pooler.supabase.com:6543          (transaction pooler, can't create tables)");
    console.error("[db] Copy it from Supabase → Connect → 'Session pooler', then redeploy.");
  }
  process.exit(1); // surface the problem in the deploy log
}

// 2) Seed default experiences only when the database is empty.
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const count = await prisma.experience.count();
  await prisma.$disconnect();

  if (count === 0) {
    console.log("[db] Database is empty — seeding default experiences…");
    run("npx tsx prisma/seed.ts");
  } else {
    console.log(`[db] ${count} experience(s) already present — skipping seed.`);
  }
} catch (e) {
  // Don't fail the whole deploy just because seeding hiccuped.
  console.error("[db] ⚠ Seeding skipped due to an error:", e?.message ?? e);
}

console.log("[db] Production database ready. ✦");
