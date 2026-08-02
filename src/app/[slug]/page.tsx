import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExperienceBySlug } from "@/lib/experiences";
import { regenerateDesignAction } from "@/app/actions";
import ExperienceRenderer from "@/components/experience/ExperienceRenderer";
import GiftsSection from "@/components/experience/GiftsSection";
import { getGiftData, showsPublicly } from "@/lib/gifts";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const exp = await getExperienceBySlug(slug);
  if (!exp) return { title: "Experience not found" };
  return {
    title: exp.title,
    description: exp.subtitle || exp.content.hero.subhead,
  };
}

export default async function ExperiencePage({ params }: Params) {
  const { slug } = await params;
  const exp = await getExperienceBySlug(slug);
  if (!exp) notFound();

  const gifts = await getGiftData(exp.id);
  const giftBlock = showsPublicly(gifts) ? <GiftsSection gifts={gifts!} type={exp.type} /> : null;

  return (
    <>
      {/* Owner/demo toolbar — not part of the public keepsake itself.
          In production this would render only for the signed-in owner. */}
      <div className="exp-bar">
        <span>
          Live at <strong>/{exp.slug}</strong> · {exp.designSpec.palette.name} ·{" "}
          {exp.designSpec.fonts.name} · {exp.designSpec.mood}
        </span>
        <span style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
          <form action={regenerateDesignAction}>
            <input type="hidden" name="slug" value={exp.slug} />
            <button type="submit" title="Compose a fresh unique design">
              ↻ Regenerate design
            </button>
          </form>
          <Link href="/dashboard">Dashboard</Link>
        </span>
      </div>

      <ExperienceRenderer designSpec={exp.designSpec} content={exp.content} experienceType={exp.type} slug={exp.slug} giftBlock={giftBlock} />
    </>
  );
}
