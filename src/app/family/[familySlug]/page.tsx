// ── /family/[familySlug] — the unified family website ───────────
// One permanent website per client. Permanent Journey sections; each links to
// its occasions (nested routes). Public visitors see only public content.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicFamilyWebsite } from "@/lib/family-website-service";
import { publicJourneys } from "@/lib/family-website";
import "../family-website.css";

export const dynamic = "force-dynamic";

interface Params { params: Promise<{ familySlug: string }>; }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { familySlug } = await params;
  const site = await getPublicFamilyWebsite(familySlug);
  if (!site) return { title: "Family website not found" };
  return {
    title: site.family.name,
    description: `The ${site.family.name} — a permanent collection of life's biggest moments.`,
    robots: site.family.visibility === "PUBLIC" ? undefined : { index: false, follow: false },
  };
}

export default async function FamilyWebsitePage({ params }: Params) {
  const { familySlug } = await params;
  const site = await getPublicFamilyWebsite(familySlug);
  if (!site) notFound();

  const journeys = publicJourneys(site.journeys);
  const base = `/family/${site.family.slug}`;

  return (
    <main className="fw">
      <div className="fw-wrap">
        <header className="fw-head">
          <p className="fw-head__eyebrow">Magical Moments</p>
          <h1 className="fw-head__title">The {site.family.name}</h1>
          <p className="fw-head__tag">Every chapter, kept forever.</p>
          <div className="fw-head__rule" />
        </header>

        {journeys.length === 0 ? (
          <div className="fw-blank">
            <p>This family&rsquo;s story is just beginning — no moments have been published yet.</p>
          </div>
        ) : (
          <>
            <nav className="fw-nav" aria-label="Journeys">
              {journeys.map((j) => (
                <a key={j.id} href={`#${j.id}`}>{j.label}</a>
              ))}
            </nav>

            {journeys.map((journey) => (
              <section key={journey.id} id={journey.id} className="fw-section">
                <div className="fw-section__head">
                  <div>
                    <h2 className="fw-section__title">{journey.label}</h2>
                    <p className="fw-section__blurb">{journey.blurb}</p>
                  </div>
                  <Link className="fw-section__link" href={`${base}/${journey.id}`}>View all →</Link>
                </div>
                <div className="fw-grid">
                  {journey.occasions.map((o) => (
                    <Link key={o.id} className="fw-card" href={`${base}/${journey.id}/${o.slug}`}>
                      <div className="fw-card__body">
                        <span className="fw-card__kicker">{journey.label}</span>
                        <h3 className="fw-card__title">{o.title}</h3>
                        {o.subtitle && <p className="fw-card__sub">{o.subtitle}</p>}
                        <div className="fw-card__meta">
                          {o.mediaCount > 0 && <span className="fw-card__pill">{o.mediaCount} photo{o.mediaCount === 1 ? "" : "s"}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        <footer className="fw-foot">
          <p>Made with <Link href="/">Magical Moments by Reign</Link> · Capture. Celebrate. Cherish Forever.</p>
        </footer>
      </div>
    </main>
  );
}
