// ── /family/[familySlug]/[journey] — one permanent Journey section ─
// Lists every occasion in a single Journey. Privacy is enforced by the
// resolver: unlisted/private Journeys return not-found for the public.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicFamilyJourney } from "@/lib/family-website-service";
import "../../family-website.css";

export const dynamic = "force-dynamic";

interface Params { params: Promise<{ familySlug: string; journey: string }>; }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { familySlug, journey } = await params;
  const result = await getPublicFamilyJourney(familySlug, journey);
  if (result.status !== "ok") return { title: "Journey not found" };
  return {
    title: `${result.journey.label} · The ${result.family.name}`,
    robots: result.family.visibility === "PUBLIC" ? undefined : { index: false, follow: false },
  };
}

export default async function JourneySectionPage({ params }: Params) {
  const { familySlug, journey } = await params;
  const result = await getPublicFamilyJourney(familySlug, journey);
  if (result.status !== "ok") notFound();

  const { family, journey: section } = result;
  const base = `/family/${family.slug}`;

  return (
    <main className="fw">
      <div className="fw-wrap">
        <header className="fw-head">
          <p className="fw-head__eyebrow">
            <Link href={base} style={{ color: "inherit", textDecoration: "none" }}>The {family.name}</Link>
          </p>
          <h1 className="fw-head__title">{section.label}</h1>
          <p className="fw-head__tag">{section.blurb}</p>
          <div className="fw-head__rule" />
        </header>

        {section.occasions.length === 0 ? (
          <div className="fw-blank">
            <p>No {section.label} moments have been published yet — this Journey is ready whenever the family is.</p>
            <p style={{ marginTop: "1rem" }}>
              <Link className="fw-section__link" href={base}>← Back to the family website</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="fw-grid">
              {section.occasions.map((o) => (
                <Link key={o.id} className="fw-card" href={`${base}/${section.id}/${o.slug}`}>
                  <div className="fw-card__body">
                    <span className="fw-card__kicker">{section.label}</span>
                    <h3 className="fw-card__title">{o.title}</h3>
                    {o.subtitle && <p className="fw-card__sub">{o.subtitle}</p>}
                    <div className="fw-card__meta">
                      {o.mediaCount > 0 && <span className="fw-card__pill">{o.mediaCount} photo{o.mediaCount === 1 ? "" : "s"}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <footer className="fw-foot">
              <p><Link href={base}>← Back to the family website</Link></p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
