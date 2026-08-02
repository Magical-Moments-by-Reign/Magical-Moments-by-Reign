import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import GiftEditor from "@/components/gifts/GiftEditor";
import { getExperienceBySlug } from "@/lib/experiences";
import { getGiftData } from "@/lib/gifts";
import "../media/media.css";
import "./gifts.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gifts & Registry" };

export default async function GiftsAdminPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const exp = await getExperienceBySlug(slug);
  if (!exp) notFound();

  const initial = (await getGiftData(exp.id)) ?? {
    enabled: true, mode: "both" as const, registries: [], cashMethods: [], items: [], charity: null, message: "", visibility: "everyone" as const,
  };

  return (
    <div className="mp ge">
      <SiteNav />
      <header className="mp-header">
        <div className="container">
          <Link href="/dashboard" className="mp-back">← Back to your studio</Link>
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Gifts &amp; Registry</span>
          <h1>Gifts &amp; Registry</h1>
          <p>Optional for <strong>{exp.title}</strong>. Add registries and your own cash-gift handles — guests are sent directly to your registry or payment app. We never hold or process funds.</p>
        </div>
      </header>

      <main className="container mp-main">
        {saved && <div className="ge-saved">✦ Saved. Your gift settings are live on your experience.</div>}
        <GiftEditor slug={slug} initial={initial} />
        <div className="ge-actions">
          <Link href={`/${slug}`} className="btn btn-dark">Preview experience</Link>
        </div>
      </main>
    </div>
  );
}
