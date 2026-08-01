import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import MediaUploader from "@/components/media/MediaUploader";
import { getExperienceBySlug } from "@/lib/experiences";
import { getUsage, listAssets, resolvePlanForExperience } from "@/lib/media";
import { storageConfigured } from "@/lib/storage";
import "./media.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Upload media" };

export default async function MediaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exp = await getExperienceBySlug(slug);
  if (!exp) notFound();

  const [planId, usage, assets] = await Promise.all([
    resolvePlanForExperience(exp.id),
    getUsage(exp.id),
    listAssets(exp.id),
  ]);

  return (
    <div className="mp">
      <SiteNav />
      <header className="mp-header">
        <div className="container">
          <Link href="/dashboard" className="mp-back">← Back to your studio</Link>
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Build your experience</span>
          <h1>Upload your photos &amp; videos</h1>
          <p>Add your memories to <strong>{exp.title}</strong>. Photos and videos are both welcome — every package includes photos, with video storage that grows as you go.</p>
        </div>
      </header>

      <main className="container mp-main">
        <MediaUploader
          experienceId={exp.id}
          planId={planId}
          initialAssets={assets.map((a) => ({ id: a.id, url: a.url, kind: a.kind, bytes: a.bytes, caption: a.caption }))}
          initialUsage={{ photoBytes: usage.photoBytes, videoBytes: usage.videoBytes }}
          storageEnabled={storageConfigured()}
        />

        <div className="mp-actions">
          <Link href={`/${exp.slug}`} className="btn-gold">Preview experience ✦</Link>
          <Link href="/dashboard" className="btn btn-dark">Done</Link>
        </div>
      </main>
    </div>
  );
}
