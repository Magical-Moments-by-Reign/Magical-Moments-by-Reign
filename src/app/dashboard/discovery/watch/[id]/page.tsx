import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getWatchDetails } from "@/lib/discovery/service";
import "../../discovery.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const show = await getWatchDetails(id);
  return { title: show ? `${show.title} — Magical Discovery` : "Watch — Magical Discovery", robots: { index: false } };
}

export default async function WatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccount("/dashboard/discovery/watch");
  const { id } = await params;
  const show = await getWatchDetails(id);
  if (!show) notFound();

  return (
    <div className="disc">
      <Link href="/dashboard/discovery/watch" className="disc-card__eyebrow" style={{ display: "inline-block", marginBottom: ".8rem" }}>← Watch</Link>
      <div className="disc-detail__hero" style={show.backdropUrl ? { backgroundImage: `url(${show.backdropUrl})` } : undefined}>
        <h1>{show.title}</h1>
      </div>

      <div className="disc-detail__meta">
        {show.status && <span className="disc-badge">{show.status}</span>}
        {show.seasons ? <span className="disc-badge">{show.seasons} season{show.seasons === 1 ? "" : "s"}</span> : null}
        {show.voteAverage ? <span className="disc-badge">★ {show.voteAverage.toFixed(1)}</span> : null}
        {show.nextEpisode?.airDate && (
          <span className="disc-badge disc-badge--live">
            {show.nextEpisodeIsSeasonPremiere ? `New Season${show.nextEpisode.seasonNumber ? ` ${show.nextEpisode.seasonNumber}` : ""}` : "New Episode"}: {new Date(show.nextEpisode.airDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>

      {show.overview && <p className="disc-detail__body">{show.overview}</p>}

      {show.availableOn.length > 0 ? (
        <>
          <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--espresso)", fontSize: "1.05rem", margin: "1.4rem 0 .5rem" }}>Where to Watch</h2>
          <div className="disc-detail__providers">
            {show.availableOn.map((p) => (
              <a key={p.name} className="disc-detail__provider" href={p.link ?? show.externalUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.logoUrl && <img src={p.logoUrl} alt="" />}
                {p.name}
              </a>
            ))}
          </div>
        </>
      ) : (
        <p className="disc-empty">Streaming availability isn&rsquo;t listed for this title right now.</p>
      )}

      {show.externalUrl && (
        <p className="pg-actions">
          <a className="btn btn--gold" href={show.externalUrl} target="_blank" rel="noopener noreferrer">View Details →</a>
        </p>
      )}
    </div>
  );
}
