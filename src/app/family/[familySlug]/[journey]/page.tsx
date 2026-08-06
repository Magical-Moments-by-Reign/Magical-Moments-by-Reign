// ── /family/[familySlug]/[journey] — one permanent Journey section ─
// Lists every occasion in a single Journey of the family's website. The
// section is permanent even when empty; occasions link to their permanent
// public routes.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicFamilyWebsite } from "@/lib/family-website-service";
import { getJourneySection } from "@/lib/family-website";
import "../../family-website.css";

export const dynamic = "force-dynamic";

interface Params { params: Promise<{ familySlug: string; journey: string }>; }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { familySlug, journey } = await params;
  const site = await getPublicFamilyWebsite(familySlug);
  const section = getJourneySection(journey);
  if (!site || !section) return { title: "Journey not found" };
  return {
    title: `${section.label} · The ${site.family.name}`,
    robots: site.family.visibility === "PUBLIC" ? undefined : { index: false, follow: false },
  };
}

export default async function JourneySectionPage({ params }: Params) {
  const { familySlug, journey } = await params;
  const section = getJourneySection(journey);
  if (!section) notFound();

  const site = await getPublicFamilyWebsite(familySlug);
  if (!site) notFound();

  const resolved = site.sections.find((s) => s.id === section.id);
  const occasions = resolved?.occasions ?? [];

  return (
    <main className="fw">
      <div className="fw-wrap">
        <header className="fw-head">
          <p className="fw-head__eyebrow">
            <Link href={`/family/${site.family.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
              The {site.family.name}
            </Link>
          </p>
          <h1 className="fw-head__title">{section.label}</h1>
          <p className="fw-head__tag">{section.blurb}</p>
          <div className="fw-head__rule" />
        </header>

        {occasions.length === 0 ? (
          <div className="fw-blank">
            <p>No {section.label} moments have been published yet — this Journey is ready whenever the family is.</p>
            <p style={{ marginTop: "1rem" }}>
              <Link className="fw-section__link" href={`/family/${site.family.slug}`}>← Back to the family website</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="fw-grid">
              {occasions.map((o) => (
                <Link key={o.id} className="fw-card" href={`/${o.slug}`}>
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
              <p><Link href={`/family/${site.family.slug}`}>← Back to the family website</Link></p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
