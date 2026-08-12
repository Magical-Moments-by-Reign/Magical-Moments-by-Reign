import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getWatchItems, getWatchDetails, getFeaturedItem } from "@/lib/discovery/service";
import type { WatchSection } from "@/lib/discovery/providers/tmdb";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Watch — Magical Discovery", robots: { index: false } };

const SECTIONS: { id: WatchSection; label: string }[] = [
  { id: "trending", label: "Trending Now" }, { id: "new_this_week", label: "New This Week" },
  { id: "popular", label: "Popular TV" }, { id: "airing_today", label: "Airing Today" },
];

// What the section itself tells us honestly — no extra API call needed, and
// never a claim about a specific streaming service (that only ever comes
// from TMDB's own watch-provider data on the detail page).
const SECTION_STATUS: Record<WatchSection, string> = {
  trending: "Trending Now", new_this_week: "New This Week",
  popular: "Popular TV", airing_today: "Airing Today",
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function WatchPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAccount("/dashboard/discovery/watch");
  const { section: raw } = await searchParams;
  const section = (SECTIONS.some((s) => s.id === raw) ? raw : "trending") as WatchSection;

  const [result, featured] = await Promise.all([getWatchItems(section), getFeaturedItem("watch")]);

  // Streaming availability + next-episode/new-season air date both come from
  // TMDB's per-title details endpoint, not the listing endpoint — fetched
  // in parallel here. Each result is cached 6h (see getWatchDetails/
  // service.ts), so this only hits TMDB live on a cold cache; every page
  // view inside that window is a DB read.
  const detailsById = new Map(
    (await Promise.all(result.items.map(async (w) => [w.id, await getWatchDetails(w.id)] as const))),
  );

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Watch</h1>
        <p className="pg-sub">What&rsquo;s trending, new, or returning across television and streaming — tap a title for artwork, synopsis, and where to watch.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/watch" />

      <div className="disc-filters">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/dashboard/discovery/watch?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </div>

      {featured && (
        <a className="disc-card" href={featured.externalUrl ?? "#"} target={featured.externalUrl ? "_blank" : undefined} rel="noopener noreferrer" style={{ marginBottom: "1.4rem", display: "block", maxWidth: 260 }}>
          <div className="disc-card__img" style={featured.imageUrl ? { backgroundImage: `url(${featured.imageUrl})` } : undefined} />
          <div className="disc-card__body"><span className="disc-card__eyebrow">Because It&rsquo;s Hot</span><h3>{featured.title}</h3></div>
        </a>
      )}

      {result.items.length ? (
        <div className="disc-grid">
          {result.items.map((w) => {
            const details = detailsById.get(w.id);
            const nextEpDate = formatDate(details?.nextEpisodeDate);
            return (
              <Link key={w.id} className="disc-card" href={`/dashboard/discovery/watch/${w.id}`}>
                <div className="disc-card__img" style={w.posterUrl ? { backgroundImage: `url(${w.posterUrl})` } : undefined} />
                <div className="disc-card__body">
                  <span className="disc-card__eyebrow">{SECTION_STATUS[section]}</span>
                  <h3>{w.title}</h3>
                  <div className="disc-card__meta">
                    {w.voteAverage ? <span>★ {w.voteAverage.toFixed(1)}</span> : null}
                    {formatDate(w.firstAirDate) && <span>{formatDate(w.firstAirDate)}</span>}
                  </div>
                  {nextEpDate && (
                    <div className="disc-card__meta">
                      <span className="disc-badge disc-badge--live">
                        {details?.nextEpisodeIsSeasonPremiere ? `New Season${details.nextEpisodeSeasonNumber ? ` ${details.nextEpisodeSeasonNumber}` : ""}` : "New Episode"}: {nextEpDate}
                      </span>
                    </div>
                  )}
                  {w.overview && <p>{w.overview}</p>}
                  {details?.availableOn.length ? (
                    <div className="disc-card__stream">
                      {details.availableOn.slice(0, 4).map((p) => (
                        <span key={p.name}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.logoUrl && <img src={p.logoUrl} alt="" />}
                          {p.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="disc-pending">
          <b>Watch isn&rsquo;t connected yet.</b>
          Once a TV/streaming metadata provider is configured, trending and new shows will appear here automatically.
        </div>
      )}

      {result.providerName && <p className="disc-empty">{result.attribution}</p>}
    </div>
  );
}
