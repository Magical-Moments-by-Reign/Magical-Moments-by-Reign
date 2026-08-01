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
try {
  console.log("[db] Applying schema to the database (prisma db push)…");
  run("npx prisma db push --skip-generate");
} catch {
  console.error("\n[db] ✖ Could not apply the database schema.");
  console.error("[db] Make sure DATABASE_URL is your Supabase **Session pooler**");
  console.error("[db] connection string (port 5432) — the transaction pooler");
  console.error("[db] (port 6543) does not support creating tables.");
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
