import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getMovieDetails } from "@/lib/discovery/service";
import "../../discovery.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieDetails(id);
  return { title: movie ? `${movie.title} — Magical Discovery` : "Movies — Magical Discovery", robots: { index: false } };
}

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccount("/dashboard/discovery/movies");
  const { id } = await params;
  const movie = await getMovieDetails(id);
  if (!movie) notFound();

  return (
    <div className="disc">
      <Link href="/dashboard/discovery/movies" className="disc-card__eyebrow" style={{ display: "inline-block", marginBottom: ".8rem" }}>← Movies</Link>
      <div className="disc-detail__hero" style={movie.backdropUrl ? { backgroundImage: `url(${movie.backdropUrl})` } : undefined}>
        <h1>{movie.title}</h1>
      </div>

      <div className="disc-detail__meta">
        {movie.releaseDate && <span className="disc-badge">{new Date(movie.releaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>}
        {movie.runtimeMinutes ? <span className="disc-badge">{Math.floor(movie.runtimeMinutes / 60)}h {movie.runtimeMinutes % 60}m</span> : null}
        {movie.voteAverage ? <span className="disc-badge">★ {movie.voteAverage.toFixed(1)}</span> : null}
        {movie.genres?.map((g) => <span className="disc-badge" key={g}>{g}</span>)}
      </div>

      {movie.overview && <p className="disc-detail__body">{movie.overview}</p>}

      <div className="pg-actions">
        {movie.externalUrl && <a className="btn btn--gold" href={movie.externalUrl} target="_blank" rel="noopener noreferrer">View Details →</a>}
        {movie.trailerUrl && <a className="btn btn--ghost" href={movie.trailerUrl} target="_blank" rel="noopener noreferrer">Watch Trailer →</a>}
      </div>

      <div className="disc-pending" style={{ marginTop: "1.4rem" }}>
        <b>Showtimes Near Me</b>
        Local theater showtimes aren&rsquo;t connected yet — this is ready for a ticketing provider to plug in. Your Concierge can help arrange tickets today.
      </div>
    </div>
  );
}
