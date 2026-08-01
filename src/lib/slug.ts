// ── Slug generation & uniqueness ────────────────────────────────
// Every experience gets a clean, human-friendly URL segment, e.g.
// magicalbyreign.com/smithwedding. Uniqueness is enforced against
// the database (and a small reserved list) inside the master app.

import { prisma } from "@/lib/db";

const RESERVED = new Set([
  "dashboard",
  "create",
  "admin",
  "api",
  "login",
  "logout",
  "signup",
  "settings",
  "pricing",
  "about",
  "help",
  "explore",
  "new",
  "account",
  "billing",
  "_next",
  "favicon.ico",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

export function isReserved(slug: string): boolean {
  return RESERVED.has(slug);
}

/** Return a slug guaranteed unique in the master application. */
export async function ensureUniqueSlug(desired: string): Promise<string> {
  let base = slugify(desired) || "experience";
  if (isReserved(base)) base = `${base}-experience`;

  let candidate = base;
  let n = 1;
  // Loop until we find an unused slug. Bounded in practice.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.experience.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
