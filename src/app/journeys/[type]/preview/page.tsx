import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import JourneyPreviewStart from "@/components/journeys/JourneyPreviewStart";
import { EXPERIENCE_TYPES, getExperienceType } from "@/lib/experience-types";
import "../../journeys.css";

export function generateStaticParams() {
  return EXPERIENCE_TYPES.map((t) => ({ type: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const t = getExperienceType(type);
  return {
    title: t ? `${t.label} — Magical Journey Preview` : "Magical Journey Preview",
    description: "Experience a premium Life Journey for 5 days before you commit — everything included, in full view. No charge until your preview ends; cancel anytime.",
    robots: { index: false },
  };
}

export default async function JourneyPreviewPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const t = getExperienceType(type);
  if (!t) notFound();

  return (
    <div className="jx">
      <SiteNav active="experiences" />
      <header className="jp-hero">
        <div className="container">
          <Link href={`/journeys/${type}`} className="jp-crumb">← Back to the {t.label}</Link>
          <span className="eyebrow jp-hero__eyebrow">Magical Journey Preview</span>
          <h1>Experience the {t.label} for 5 days</h1>
          <p>A guided VIP tour of the complete experience — used exactly like a paying member. No charge until your preview ends, and you can cancel anytime.</p>
        </div>
      </header>
      <main className="container jx-main">
        <JourneyPreviewStart type={type} label={t.label} />
      </main>
      <SiteFooter />
    </div>
  );
}
