// ── /family/[familySlug]/[journey]/[occasionSlug] — nested occasion ─
// The occasion lives INSIDE the family website. It reuses the tested
// ExperienceRenderer component (not the old /[slug] URL) so occasions read as
// part of the client's site. The resolver verifies family → journey → occasion
// ownership and three-level privacy before anything renders.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamilyOccasion } from "@/lib/family-website-service";
import { getJourneySection } from "@/lib/family-website";
import { currentAccount } from "@/lib/auth-session";
import ExperienceRenderer from "@/components/experience/ExperienceRenderer";
import GiftsSection from "@/components/experience/GiftsSection";
import { getGiftData, showsPublicly } from "@/lib/gifts";
import "../../../family-website.css";

export const dynamic = "force-dynamic";

interface Params { params: Promise<{ familySlug: string; journey: string; occasionSlug: string }>; }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { familySlug, journey, occasionSlug } = await params;
  const acct = await currentAccount();
  const result = await getFamilyOccasion(familySlug, journey, occasionSlug, acct?.id);
  if (result.status !== "ok") return { title: "Occasion not found" };
  return {
    title: result.experience.title,
    description: result.experience.subtitle || result.experience.content.hero.subhead,
  };
}

export default async function NestedOccasionPage({ params }: Params) {
  const { familySlug, journey, occasionSlug } = await params;
  const acct = await currentAccount();
  const result = await getFamilyOccasion(familySlug, journey, occasionSlug, acct?.id);
  if (result.status !== "ok") notFound();

  const { experience: exp, family } = result;
  const section = getJourneySection(journey);
  const base = `/family/${family.slug}`;

  const gifts = await getGiftData(exp.id);
  const giftBlock = showsPublicly(gifts) ? <GiftsSection gifts={gifts!} type={exp.type} /> : null;

  return (
    <>
      {/* Breadcrumb back into the family website — the occasion is part of it. */}
      <div className="fw" style={{ minHeight: "auto", background: "transparent" }}>
        <div className="fw-wrap" style={{ paddingBottom: 0 }}>
          <p className="fw-head__eyebrow" style={{ padding: "1rem 0 0" }}>
            <Link href={base} style={{ color: "inherit", textDecoration: "none" }}>The {family.name}</Link>
            {section && <> · <Link href={`${base}/${section.id}`} style={{ color: "inherit", textDecoration: "none" }}>{section.label}</Link></>}
          </p>
        </div>
      </div>

      <ExperienceRenderer
        designSpec={exp.designSpec}
        content={exp.content}
        experienceType={exp.type}
        slug={exp.slug}
        giftBlock={giftBlock}
      />
    </>
  );
}
