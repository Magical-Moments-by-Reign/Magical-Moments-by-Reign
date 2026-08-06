// ── Ensure canonical sample experiences exist (create-if-missing) ─
// Some inspiration samples were added to the seed AFTER the initial deploy.
// Because the seed only runs on an empty database, those slugs 404 in an
// already-populated environment (e.g. /thejohnsonhome). This script creates
// ONLY the missing canonical samples — it never overwrites an existing row,
// so owner edits and any intentionally-deleted content are left untouched.
//
// Run automatically by scripts/prepare-db.mjs on a deliberate db:deploy.

import { PrismaClient } from "@prisma/client";
import { generateDesignSpec } from "../src/lib/design-engine";
import { buildDefaultContent } from "../src/lib/content";

const prisma = new PrismaClient();

// Keep this list to samples the Inspiration Gallery links to, so its cards
// never lead to a 404. Hero video/poster come from src/lib/hero-media.ts.
const SAMPLES: { slug: string; type: string; title: string; subtitle: string }[] = [
  { slug: "thejohnsonhome", type: "newhome", title: "The Johnson Home", subtitle: "From groundbreaking to move-in day" },
];

async function main() {
  for (const s of SAMPLES) {
    const existing = await prisma.experience.findUnique({ where: { slug: s.slug }, select: { id: true } });
    if (existing) {
      console.log(`  • /${s.slug} already exists — leaving it as is.`);
      continue;
    }
    const seed = `${s.slug}-demo`;
    const designSpec = await generateDesignSpec(s.type, seed);
    const content = buildDefaultContent({ type: s.type, title: s.title, subtitle: s.subtitle, seed });
    await prisma.experience.create({
      data: {
        slug: s.slug,
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        seed,
        status: "PUBLISHED",
        designSpec: JSON.stringify(designSpec),
        content: JSON.stringify(content),
      },
    });
    console.log(`  ✓ created /${s.slug}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
