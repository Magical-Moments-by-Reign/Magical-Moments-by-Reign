import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMovieItems, getMovieDetails, getFeaturedItem } from "@/lib/discovery/service";
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
  const [result, featured] = await Promise.all([getMovieItems(section), getFeaturedItem("movie")]);

  // Streaming availability comes from TMDB's per-title details endpoint, not
  // the listing endpoint — fetched in parallel here. Each result is cached
  // 6h (see getMovieDetails/service.ts), so this only hits TMDB live on a
  // cold cache; every page view inside that window is a DB read.
  const availableOnById = new Map(
    (await Promise.all(result.items.map(async (m) => [m.id, (await getMovieDetails(m.id))?.availableOn ?? []] as const))),
  );

  return (
    <div className="disc">
      <DiscoveryPageHeader title="Movies" description={<>What can we go see tonight? Posters, ratings, genres, and trailers for what&rsquo;s playing and what&rsquo;s coming.</>} />
      <DiscoveryNav active="/dashboard/discovery/movies" />

      <div className="disc-filters">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/dashboard/discovery/movies?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </div>

      {featured ? (
        <a className="disc-card disc-card--feature" href={featured.externalUrl ?? "#"} target={featured.externalUrl ? "_blank" : undefined} rel="noopener noreferrer">
          <div className="disc-card__img" style={featured.imageUrl ? { backgroundImage: `url(${featured.imageUrl})` } : undefined} />
          <div className="disc-card__body">
            <span className="disc-card__eyebrow">Because It&rsquo;s Hot</span>
            <h3>{featured.title}</h3>
            {featured.description && <p>{featured.description}</p>}
          </div>
        </a>
      ) : result.items[0] && (
        <Link className="disc-card disc-card--feature" href={`/dashboard/discovery/movies/${result.items[0].id}`}>
          <div className="disc-card__img" style={(result.items[0].backdropUrl ?? result.items[0].posterUrl) ? { backgroundImage: `url(${result.items[0].backdropUrl ?? result.items[0].posterUrl})` } : undefined} />
          <div className="disc-card__body">
            <span className="disc-card__eyebrow">{SECTION_STATUS[section]}</span>
            <h3>{result.items[0].title}</h3>
            {result.items[0].overview && <p>{result.items[0].overview}</p>}
          </div>
        </Link>
      )}

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
