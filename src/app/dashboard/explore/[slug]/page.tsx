import type { Metadata } from "next";
import Link from "next/link";
import { COMING_SOON, Icon } from "@/components/dashboard/nav-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coming Soon", robots: { index: false } };

// Honest destination for dashboard features that aren't connected yet. Every
// sidebar/tile link lands somewhere real — this page says plainly that the
// experience is on the way, so there are no dead buttons.
export default async function ExplorePage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  const meta = COMING_SOON[slug] ?? { title: "Coming Soon", tagline: "This experience is on the way.", icon: "star" as const, image: undefined as string | undefined };
  const isSearch = slug === "search";

  return (
    <div className="ex">
      <div
        className={`ex-hero${meta.image ? "" : " ex-hero--plain"}`}
        style={meta.image ? { backgroundImage: `linear-gradient(180deg, rgba(28,19,12,.35), rgba(28,19,12,.82)), url(${meta.image})` } : undefined}
      >
        <div className="ex-hero__icon"><Icon name={meta.icon} /></div>
        <div className="ex-hero__eyebrow">Coming Soon</div>
        <h1 className="ex-hero__title">{meta.title}</h1>
        <p className="ex-hero__tag">{meta.tagline}</p>
      </div>

      <div className="ex-body">
        {isSearch && q ? (
          <p>Search for &ldquo;<b>{q}</b>&rdquo; will live here soon. In the meantime, use the menu to jump straight to your Journeys, Messages, or Settings.</p>
        ) : (
          <p>This part of your Magical Space is being crafted with the same care as everything else. We&rsquo;ll let you know the moment it&rsquo;s ready — nothing here is a placeholder for a feature we haven&rsquo;t truly built.</p>
        )}
        <p>Need something now? Your Concierge can help with planning and arrangements today.</p>
        <div className="pg-actions">
          <Link href="/dashboard" className="btn btn--gold">Back to Dashboard</Link>
          <Link href="/dashboard/journeys" className="btn btn--ghost">Home Journeys</Link>
        </div>
      </div>
    </div>
  );
}
