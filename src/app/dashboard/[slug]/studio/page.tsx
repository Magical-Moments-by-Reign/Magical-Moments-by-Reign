import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/guard";
import { runReview } from "./actions";
import StudioReview from "./StudioReview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journey Studio", robots: { index: false } };

// Journey Studio in the builder. Ownership is enforced here (the media surface
// is otherwise unguarded): the occasion must belong to the signed-in account.
export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await requireAccount(`/dashboard/${slug}/studio`);

  const exp = await prisma.experience.findFirst({
    where: { slug, accountId: account.id },
    select: { id: true, title: true },
  });
  if (!exp) notFound();

  const assets = await prisma.mediaAsset.findMany({
    where: { experienceId: exp.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, kind: true, caption: true },
  });

  // Initial advice, rendered on first paint (client can Re-run / Apply / Undo).
  const initial = await runReview(slug);

  return (
    <div className="jst-page">
      <SiteNav />
      <main className="container">
        <StudioReview slug={slug} initial={initial} assets={assets} />
      </main>
    </div>
  );
}
