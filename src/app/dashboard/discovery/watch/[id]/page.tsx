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

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Honest renewal summary — only ever states what TMDB actually reports
 *  (a confirmed next-season premiere date, or that production is underway),
 *  and otherwise says the real date simply isn't announced yet. */
function renewalStatus(show: Awaited<ReturnType<typeof getWatchDetails>>): string {
  if (!show) return "Stay tuned — renewal status not yet announced.";
  if (show.status === "Ended" || show.status === "Canceled") return `Series ${show.status.toLowerCase()} — no additional seasons.`;
  if (show.nextEpisode?.airDate && show.nextEpisodeIsSeasonPremiere) {
    return `Renewed — Season ${show.nextEpisode.seasonNumber} premieres ${formatDate(show.nextEpisode.airDate)}.`;
  }
  if (show.inProduction) return "Renewed — a new season is in production. Exact premiere date: coming soon.";
  if (show.status === "Returning Series") return "Renewed — exact premiere date: stay tuned.";
  if (show.status === "Planned") return "Announced — premiere date: coming soon.";
  return "Stay tuned — renewal status not yet announced.";
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

      <nav className="disc-detail__links">
        <a href="#cast">Cast</a>
        <a href="#about">About</a>
      </nav>

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

      <section id="cast" className="disc-detail__section">
        <h2>Cast</h2>
        {show.cast.length > 0 ? (
          <div className="disc-cast">
            {show.cast.map((c) => (
              <div key={c.name} className="disc-cast__card">
                <div className="disc-cast__photo" style={c.profileUrl ? { backgroundImage: `url(${c.profileUrl})` } : undefined} />
                <b>{c.name}</b>
                {c.character && <span>{c.character}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="disc-empty">Cast details aren&rsquo;t listed for this title yet.</p>
        )}
      </section>

      <section id="about" className="disc-detail__section">
        <h2>About</h2>
        <div className="disc-about">
          <div className="disc-about__item"><span>First Aired</span><b>{formatDate(show.firstAirDate) ?? "—"}</b></div>
          <div className="disc-about__item"><span>Seasons</span><b>{show.seasons ?? "—"}</b></div>
          <div className="disc-about__item"><span>Episodes</span><b>{show.numberOfEpisodes ?? "—"}</b></div>
          <div className="disc-about__item"><span>Network</span><b>{show.networks.length > 0 ? show.networks.map((n) => n.name).join(", ") : "—"}</b></div>
          <div className="disc-about__item"><span>Renewal Status</span><b>{renewalStatus(show)}</b></div>
        </div>
      </section>
    </div>
  );
}
