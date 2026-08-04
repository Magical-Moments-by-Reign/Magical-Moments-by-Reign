import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getEstate } from "@/lib/estates/registry";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ estate: string }>;
}): Promise<Metadata> {
  const { estate } = await params;
  const config = getEstate(estate);
  return { title: config ? `Learn — ${config.name}` : "Learn", robots: { index: false } };
}

// The Learning Center for an Estate. Content is neutral and educational (no
// invented figures); deeper, jurisdiction-specific guides arrive under the
// Education Engine's provenance/review rules — shown honestly below.
export default async function EstateLearn({
  params,
}: {
  params: Promise<{ estate: string }>;
}) {
  const { estate } = await params;
  const config = getEstate(estate);
  if (!config) notFound();
  await requireAccount(`/estate/${estate}/learn`);

  return (
    <div className="estate">
      <nav className="estate-crumb">
        <Link href={`/estate/${config.key}`} className="estate-crumb__link">{config.icon} {config.name}</Link>
        <span aria-hidden="true"> / </span>
        <span>Learn</span>
      </nav>

      <header className="estate-hero estate-hero--compact">
        <span className="estate-hero__icon" aria-hidden="true">📚</span>
        <div>
          <h1 className="estate-hero__title">Learn before you decide</h1>
          <p className="estate-hero__body">Clear, neutral explanations of your options — so no one ever has to say &ldquo;we didn&apos;t know that was an option.&rdquo; We explain the trade-offs and point you to licensed professionals for anything that needs one.</p>
        </div>
      </header>

      <section className="estate-section" aria-label="Home learning topics">
        <div className="estate-learn">
          {config.learningTopics.map((t) => (
            <article key={t.id} className="estate-topic">
              <h2 className="estate-topic__title">{t.title}</h2>
              <p className="estate-topic__summary">{t.summary}</p>
              <span className="estate-topic__note">Full guide in progress</span>
            </article>
          ))}
        </div>
        <p className="estate-learn__disclaimer">
          Education here is general and neutral — never financial, legal, or lending advice, and never a
          quoted rate or an approval. For your specific situation, we&apos;ll help you prepare questions and
          connect a licensed professional.
        </p>
      </section>

      <p className="estate-foot">
        <Link href={`/estate/${config.key}`} className="estate-foot__link">← Back to your Home journey</Link>
      </p>
    </div>
  );
}
