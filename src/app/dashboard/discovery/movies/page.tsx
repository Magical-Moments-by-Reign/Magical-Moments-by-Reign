import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMovieItems } from "@/lib/discovery/service";
import type { MovieSection } from "@/lib/discovery/providers/tmdb";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState, DiscoveryPageHeader } from "../_components";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Movies — Magical Discovery", robots: { index: false } };

const SECTIONS: { id: MovieSection; label: string }[] = [
  { id: "now_playing", label: "Now Playing" }, { id: "opening_this_week", label: "Opening This Week" },
  { id: "coming_soon", label: "Coming Soon" }, { id: "popular", label: "Popular Movies" },
];

export default async function MoviesPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAccount("/dashboard/discovery/movies");
  const { section: raw } = await searchParams;
  const section = (SECTIONS.some((s) => s.id === raw) ? raw : "now_playing") as MovieSection;
  const result = await getMovieItems(section);

  return (
    <div className="disc">
      <DiscoveryPageHeader title="Movies" description={<>What can we go see tonight? Posters, ratings, genres, and trailers for what&rsquo;s playing and what&rsquo;s coming.</>} />
      <DiscoveryNav active="/dashboard/discovery/movies" />

      <div className="disc-filters">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/dashboard/discovery/movies?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </div>

      {result.items.length ? (
        <div className="disc-grid">
          {result.items.map((m) => (
            <Link key={m.id} className="disc-card disc-card--portrait" href={`/dashboard/discovery/movies/${m.id}`}>
              <div className="disc-card__img" style={m.posterUrl ? { backgroundImage: `url(${m.posterUrl})` } : undefined} />
              <div className="disc-card__body">
                <span className="disc-card__eyebrow">Movie</span><h3>{m.title}</h3>
                {m.voteAverage ? <div className="disc-card__meta"><span>★ {m.voteAverage.toFixed(1)}</span>{m.releaseDate && <span>· {m.releaseDate.slice(0, 4)}</span>}</div> : null}
                {m.genres?.length ? <div className="disc-card__meta"><span>{m.genres.slice(0, 2).join(", ")}</span></div> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <DiscoveryEmptyState title="Movies aren’t connected yet.">Once a movie metadata provider is configured, showtimes-ready listings will appear here automatically.</DiscoveryEmptyState>
      )}

      {result.providerName && <p className="disc-empty">{result.attribution}</p>}
    </div>
  );
}
