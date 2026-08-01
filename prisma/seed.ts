// ── Seed data ───────────────────────────────────────────────────
// Populates the master application with a handful of distinct
// experiences so the "one app, many unique pages" idea is visible
// immediately. Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { generateDesignSpec } from "../src/lib/design-engine";
import { buildDefaultContent } from "../src/lib/content";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

const DEMOS: { slug: string; type: string; title: string; subtitle: string }[] = [
  { slug: "smithwedding", type: "wedding", title: "The Smith Wedding", subtitle: "June 14th, 2027 · Napa Valley" },
  { slug: "karlie2027", type: "birthday", title: "Karlie Turns Ten", subtitle: "A magical tenth birthday" },
  { slug: "babyolivia", type: "baby", title: "Baby Olivia", subtitle: "The story of our little miracle" },
  { slug: "rememberinggrandpajoe", type: "memorial", title: "Remembering Grandpa Joe", subtitle: "1938 – 2025 · Forever in our hearts" },
  { slug: "italy2026", type: "vacation", title: "Italy, 2026", subtitle: "Two weeks along the Amalfi Coast" },
  { slug: "reignlaunch", type: "business", title: "Magical by Reign", subtitle: "The grand unveiling" },
];

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "tabitha@magicalbyreign.com" },
    update: {},
    create: { email: "tabitha@magicalbyreign.com", name: "Tabitha Turner", role: "ADMIN" },
  });

  for (const demo of DEMOS) {
    const slug = slugify(demo.slug);
    const seed = `${slug}-demo`;
    const designSpec = await generateDesignSpec(demo.type, seed);
    const content = buildDefaultContent({
      type: demo.type,
      title: demo.title,
      subtitle: demo.subtitle,
      seed,
    });

    await prisma.experience.upsert({
      where: { slug },
      update: {
        designSpec: JSON.stringify(designSpec),
        content: JSON.stringify(content),
      },
      create: {
        slug,
        type: demo.type,
        title: demo.title,
        subtitle: demo.subtitle,
        seed,
        status: "PUBLISHED",
        designSpec: JSON.stringify(designSpec),
        content: JSON.stringify(content),
        ownerId: admin.id,
      },
    });
    console.log(`  ✓ /${slug}  (${designSpec.palette.name} · ${designSpec.mood})`);
  }

  console.log(`\nSeeded ${DEMOS.length} experiences under one master application.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
