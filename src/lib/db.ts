// ── Prisma client singleton ─────────────────────────────────────
// ONE shared PrismaClient for the whole app. Cached on globalThis so neither
// Next.js hot-reload (dev) nor module re-evaluation (serverless, prod) can spawn
// duplicate clients and exhaust the Supabase pooler (pool_size 15).
//
// We also cap this client to a single pooled connection (connection_limit=1),
// the recommended setting for serverless: each function instance holds at most
// one connection, so many instances stay well under the pool ceiling. An
// explicit connection_limit already present in DATABASE_URL is respected.

import { PrismaClient } from "@prisma/client";

function withConnLimit(url: string | undefined): string | undefined {
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=1`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = withConnLimit(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Cache the single instance in every environment (dev + prod) so repeated
// imports/reloads reuse it instead of opening new connections.
globalForPrisma.prisma = prisma;
