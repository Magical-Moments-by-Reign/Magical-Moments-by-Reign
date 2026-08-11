import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMovieItems } from "@/lib/discovery/service";
import type { MovieSection } from "@/lib/discovery/providers/tmdb";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Movies — Magical Discovery", robots: { index: false } };

const SECTIONS: { id: MovieSection; label: string }[] = [
  { id: "now_playing", label: "Now Playing" }, { id: "opening_this_week", label: "Opening This Week" },
  { id: "coming_soon", label: "Coming Soon" }, { id: "popular", label: "Popular Movies" },
];

// What the section itself tells us honestly — no extra API call needed, and
// never a claim about a specific streaming service (that only ever comes
// from TMDB's own watch-provider data on the detail page).
const SECTION_STATUS: Record<MovieSection, string> = {
  now_playing: "In Theaters", opening_this_week: "Opening This Week",
  coming_soon: "Coming Soon", popular: "Popular Now",
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function MoviesPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAccount("/dashboard/discovery/movies");
  const { section: raw } = await searchParams;
  const section = (SECTIONS.some((s) => s.id === raw) ? raw : "now_playing") as MovieSection;
  const result = await getMovieItems(section);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Movies — Now in Theaters</h1>
        <p className="pg-sub">What can we go see tonight? Posters, ratings, genres, and trailers for what&rsquo;s playing and what&rsquo;s coming.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/movies" />

      <div className="disc-filters">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/dashboard/discovery/movies?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </div>

      {result.items.length ? (
        <div className="disc-grid">
          {result.items.map((m) => (
            <Link key={m.id} className="disc-card" href={`/dashboard/discovery/movies/${m.id}`}>
              <div className="disc-card__img" style={m.posterUrl ? { backgroundImage: `url(${m.posterUrl})` } : undefined} />
              <div className="disc-card__body">
                <span className="disc-card__eyebrow">{SECTION_STATUS[section]}</span>
                <h3>{m.title}</h3>
                <div className="disc-card__meta">
                  {m.voteAverage ? <span>★ {m.voteAverage.toFixed(1)}</span> : null}
                  {formatDate(m.releaseDate) && <span>{formatDate(m.releaseDate)}</span>}
                  {m.genres?.length ? <span>{m.genres.slice(0, 2).join(", ")}</span> : null}
                </div>
                {m.overview && <p>{m.overview}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="disc-pending">
          <b>Movies aren&rsquo;t connected yet.</b>
          Once a movie metadata provider is configured, showtimes-ready listings will appear here automatically.
        </div>
      )}

      {result.providerName && <p className="disc-empty">{result.attribution}</p>}
    </div>
  );
}
