import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getMovieItems, getMovieDetails, getFeaturedItem } from "@/lib/discovery/service";
import type { MovieItem, MovieSection } from "@/lib/discovery/providers/tmdb";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState } from "../_components";
import "../discovery.css";
import "./movies.css";

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

function formatReleaseDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Artwork({ src, alt }: { src?: string; alt: string }) {
  return src ? <Image src={src} alt={alt} fill sizes="220px" className="movies-art-img" /> : <div className="movies-art-fallback" aria-hidden="true">✦</div>;
}

interface HeroMovie {
  id: string;
  title: string;
  overview?: string;
  image?: string;
  href: string;
  external?: boolean;
}

export default async function MoviesPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAccount("/dashboard/discovery/movies");
  const { section: raw } = await searchParams;
  const section = (SECTIONS.some((s) => s.id === raw) ? raw : "now_playing") as MovieSection;
  const [result, featured] = await Promise.all([getMovieItems(section), getFeaturedItem("movie")]);

  // Streaming availability and the MPAA rating both come from TMDB's
  // per-title details endpoint, not the listing endpoint — fetched in
  // parallel here. Each result is cached 6h (see getMovieDetails/service.ts),
  // so this only hits TMDB live on a cold cache; every page view inside that
  // window is a DB read.
  const detailsById = new Map(
    (await Promise.all(result.items.map(async (m) => [m.id, await getMovieDetails(m.id)] as const))),
  );

  const rest = [...result.items];
  const hero: HeroMovie | null = featured
    ? { id: "featured", title: featured.title, overview: featured.description ?? undefined, image: featured.imageUrl ?? undefined, href: featured.externalUrl ?? "#", external: Boolean(featured.externalUrl) }
    : rest.length
      ? (() => { const m = rest.shift() as MovieItem; return { id: m.id, title: m.title, overview: m.overview, image: m.backdropUrl ?? m.posterUrl, href: `/dashboard/discovery/movies/${m.id}` }; })()
      : null;

  return (
    <div className="disc disc-lux disc-dark movies">
      <DiscoveryNav active="/dashboard/discovery/movies" />

      <header className="movies-header">
        <div>
          <h1>Movies</h1>
          <p>What can we go see tonight? Posters, ratings, genres, and trailers for what&rsquo;s playing and what&rsquo;s coming.</p>
        </div>
      </header>

      <div className="disc-filters movies-filters">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/dashboard/discovery/movies?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </div>

      {hero && (
        hero.external ? (
          <a className="movies-hero" href={hero.href} target="_blank" rel="noopener noreferrer" style={hero.image ? { backgroundImage: `linear-gradient(180deg, rgba(2,5,7,.15) 0%, rgba(2,5,7,.92) 92%), url(${hero.image})` } : undefined}>
            <span className="movies-hero__badge">{SECTION_STATUS[section]}</span>
            <h2>{hero.title}</h2>
            {hero.overview && <p>{hero.overview}</p>}
          </a>
        ) : (
          <Link className="movies-hero" href={hero.href} style={hero.image ? { backgroundImage: `linear-gradient(180deg, rgba(2,5,7,.15) 0%, rgba(2,5,7,.92) 92%), url(${hero.image})` } : undefined}>
            <span className="movies-hero__badge">{SECTION_STATUS[section]}</span>
            <h2>{hero.title}</h2>
            {hero.overview && <p>{hero.overview}</p>}
          </Link>
        )
      )}

      {rest.length ? (
        <div className="movies-grid">
          {rest.map((m) => {
            const details = detailsById.get(m.id);
            const availableOn = details?.availableOn ?? [];
            const releaseDate = formatReleaseDate(m.releaseDate);
            return (
              <Link key={m.id} className="movies-card" href={`/dashboard/discovery/movies/${m.id}`}>
                <div className="movies-card__art">
                  <Artwork src={m.posterUrl} alt={`${m.title} poster`} />
                  {details?.certification && <span className="movies-card__rating">{details.certification}</span>}
                </div>
                <div className="movies-card__body">
                  <b>{m.title}</b>
                  {(m.voteAverage || releaseDate) && (
                    <span>{m.voteAverage ? `★ ${m.voteAverage.toFixed(1)}` : ""}{m.voteAverage && releaseDate ? " · " : ""}{releaseDate}</span>
                  )}
                  {m.genres?.length ? <span className="movies-card__genres">{m.genres.slice(0, 2).join(", ")}</span> : null}
                  {availableOn.length > 0 && <span className="movies-card__watch">{availableOn[0].name}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : !hero ? (
        <DiscoveryEmptyState title="Movies aren’t connected yet.">Once a movie metadata provider is configured, showtimes-ready listings will appear here automatically.</DiscoveryEmptyState>
      ) : null}

      {result.providerName && <p className="movies-attribution">{result.attribution}</p>}
    </div>
  );
}
