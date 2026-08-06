// ── Controlled database deploy (opt-in) ─────────────────────────
// This is NOT part of an ordinary Netlify build anymore. Ordinary deploys run
// only `prisma generate && next build` and never touch the database, so a build
// can never exhaust the Supabase Session pooler (EMAXCONNSESSION).
//
// This script runs ONLY when you deliberately deploy a schema change:
//
//     npm run db:deploy          # sets RUN_DATABASE_PUSH=true for you
//
// It then applies the Prisma schema to the database and seeds the default
// experiences on first setup only (when the database has no experiences yet),
// so it never duplicates data or resurrects content you've deleted.
//
// Connection safety (Supabase Session pooler, pool_size 15): we force a low
// Prisma connection limit for every child process and the in-process seed
// client, and we RETRY the schema push on transient pool-exhaustion errors
// (EMAXCONNSESSION, "max clients reached", P1001, connection-pool timeouts)
// instead of failing. The DATABASE_URL (with its password) is NEVER printed.

import { execSync } from "node:child_process";

// Safety gate: do nothing unless a schema deploy was explicitly requested.
// The default Netlify deployment never sets this, so it never runs the push.
if (process.env.RUN_DATABASE_PUSH !== "true") {
  console.log("[db] RUN_DATABASE_PUSH is not \"true\" — skipping schema push (ordinary build).");
  console.log("[db] To apply a schema change deliberately, run:  npm run db:deploy");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log("[db] DATABASE_URL not set — skipping database setup.");
  process.exit(0);
}

// Append a low connection limit to the build's DATABASE_URL, in memory only.
// Respect an explicit connection_limit if one is already set (e.g. in Netlify).
function withConnLimit(url) {
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=1&pool_timeout=20`;
}
// Every child process (prisma db push, tsx seed) and the in-process client
// inherit this limited URL. The value is never logged.
process.env.DATABASE_URL = withConnLimit(process.env.DATABASE_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Transient = a temporary connection/pool problem that a retry can clear.
const TRANSIENT =
  /EMAXCONNSESSION|max clients reached|too many clients|remaining connection slots|P1001|Can't reach database server|connection pool timeout|pool[_ ]timeout|Timed out fetching a new connection|ECONNRESET|ETIMEDOUT/i;
// Never retry this — retrying won't help and could hide a real problem.
const DATA_LOSS = /data loss|--accept-data-loss/i;

function printDataLossHint() {
  console.error("\n[db] ✖ Schema push blocked by Prisma's DATA-LOSS guard (the database IS reachable — not a connection problem).");
  console.error("[db]   A change (e.g. a new unique constraint, or a dropped column) could affect existing rows.");
  console.error("[db]   Fix: make the change in prisma/schema.prisma additive/non-destructive, then redeploy.");
  console.error("[db]   Only if verified safe on real data: run `prisma db push --accept-data-loss` deliberately.");
}
function printConnHint() {
  console.error("\n[db] ✖ Could not reach the database to apply the schema.");
  console.error("[db] DATABASE_URL must be the Supabase **Session pooler** string:");
  console.error("[db]   host  →  aws-0-<region>.pooler.supabase.com : 5432   (IPv4, works on Netlify)");
  console.error("[db]   NOT   →  db.<project>.supabase.co                    (direct, IPv6-only, unreachable)");
  console.error("[db]   NOT   →  ...pooler.supabase.com:6543                 (transaction pooler, can't create tables)");
}

/** Run `prisma db push`, retrying only on transient connection/pool errors. */
async function pushWithRetry() {
  const MAX_ATTEMPTS = 4; // first try + up to 3 retries
  const DELAY_MS = 10_000;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[db] Applying schema (prisma db push, attempt ${attempt}/${MAX_ATTEMPTS})…`);
      const out = execSync("npx prisma db push --skip-generate", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      process.stdout.write(out);
      return; // success
    } catch (err) {
      if (err?.stdout) process.stdout.write(err.stdout);
      if (err?.stderr) process.stderr.write(err.stderr);
      const combined = `${err?.stdout ?? ""}\n${err?.stderr ?? ""}\n${err?.message ?? ""}`;

      if (DATA_LOSS.test(combined)) { printDataLossHint(); process.exit(1); }

      const transient = TRANSIENT.test(combined);
      if (transient && attempt < MAX_ATTEMPTS) {
        console.warn(`[db] ⏳ Transient database/connection error — retrying in ${DELAY_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS}).`);
        await sleep(DELAY_MS);
        continue;
      }
      if (transient) {
        console.error(`\n[db] ✖ Still could not connect after ${MAX_ATTEMPTS} attempts (connection pool likely saturated).`);
        console.error("[db]   The pooler is at capacity. Retry the deploy in a minute, or lower runtime connections — do NOT raise pool_size as the first move.");
        process.exit(1);
      }
      printConnHint();
      process.exit(1);
    }
  }
}

// 1) Create/update all tables from prisma/schema.prisma (idempotent).
if (process.env.SKIP_DB_PUSH) {
  console.log("[db] SKIP_DB_PUSH set — skipping schema push (schema assumed already synchronized).");
} else {
  await pushWithRetry();
}

// 2) Seed default experiences only when the database is empty.
//    One short-lived client, with a guaranteed disconnect in `finally`.
{
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const count = await prisma.experience.count();
    if (count === 0) {
      console.log("[db] Database is empty — seeding default experiences…");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
    } else {
      console.log(`[db] ${count} experience(s) already present — skipping seed.`);
    }
  } catch (e) {
    // Don't fail the whole deploy just because seeding hiccuped.
    console.error("[db] ⚠ Seeding skipped due to an error:", e?.message ?? e);
  } finally {
    await prisma.$disconnect();
  }
}

// 2b) Keep canonical public-sample content correct (idempotent; safe every run).
{
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // The hero date renders from the content JSON, so fix both the subtitle
    // column AND the embedded date (2027 → 2026) on the sample record.
    const w = await prisma.experience.findUnique({ where: { slug: "smithwedding" }, select: { id: true, content: true } });
    if (w) {
      await prisma.experience.update({
        where: { id: w.id },
        data: {
          subtitle: "June 14th, 2026 · Napa Valley",
          content: (w.content || "").split("2027").join("2026"),
        },
      });
      console.log("[db] Sample content fix: smithwedding date → 2026 (subtitle + content).");
    } else {
      console.log("[db] Sample content fix: smithwedding not found; nothing to do.");
    }
  } catch (e) {
    console.error("[db] ⚠ Sample content fix skipped:", e?.message ?? e);
  } finally {
    await prisma.$disconnect();
  }
}

// 3) Optionally provision the owner/admin account during this controlled run.
//    Set PROVISION_OWNER=true (with RUN_DATABASE_PUSH=true so this script runs).
//    Idempotent + safe to re-run. Grants Owner/Super Admin + verified email +
//    Forever Lifetime + billing bypass so /admin opens and everything unlocks.
if (process.env.PROVISION_OWNER === "true") {
  try {
    console.log("[db] PROVISION_OWNER=true — provisioning the owner/admin account…");
    execSync("npx tsx scripts/provision-owner-demo.ts", { stdio: "inherit" });
  } catch (e) {
    console.error("[db] ⚠ Owner provisioning failed:", e?.message ?? e);
    process.exit(1);
  }
}

console.log("[db] Production database ready. ✦");

// ── How schema changes reach production now ──────────────────────
// Ordinary Netlify builds run `prisma generate && next build` and NEVER run this
// script — so they never open a build-time database connection and can never hit
// EMAXCONNSESSION. When you actually change prisma/schema.prisma:
//   1. Deploy the code as usual (the app tolerates the additive column until the
//      DB catches up, or deploy the DB first for a required column).
//   2. Apply the schema deliberately, once, from a machine with the production
//      DATABASE_URL:  npm run db:deploy
//      (that sets RUN_DATABASE_PUSH=true and runs the retry-guarded push here).
// Longer term you can graduate to versioned migrations: `prisma migrate dev`
// locally, commit prisma/migrations, then `prisma migrate deploy` in db:deploy.
