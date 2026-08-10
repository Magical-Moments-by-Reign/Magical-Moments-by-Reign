import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getTodayStories, getWatchItems, getMovieItems, getMusicChart, getTrendingItems } from "@/lib/discovery/service";
import DiscoveryNav from "./_nav";
import "./discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Discovery", robots: { index: false } };

// The Magical Discovery landing page — a small, elegant selection from every
// category with a way to open the full one. A daily reason to return even
// with no active occasion. Never fabricated: any category whose provider
// isn't connected shows its own honest empty/pending state, not sample data.
export default async function DiscoveryPage() {
  await requireAccount("/dashboard/discovery");

  const [today, watch, movies, music, trending] = await Promise.all([
    getTodayStories("top"),
    getWatchItems("trending"),
    getMovieItems("now_playing"),
    getMusicChart("top"),
    getTrendingItems(),
  ]);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Your Daily Reason to Return</span>
        <h1 className="pg-title">Magical Discovery</h1>
        <p className="pg-sub">What&rsquo;s happening today, what to watch, what&rsquo;s hot in music, and what&rsquo;s worth doing near you — curated, never overwhelming.</p>
      </div>

      <DiscoveryNav active="" />

      <section className="disc-section">
        <div className="disc-section__head"><h2>Today</h2><Link href="/dashboard/discovery/today">Open Today →</Link></div>
        {today.items.length ? (
          <div className="disc-grid disc-grid--wide">
            {today.items.slice(0, 3).map((s) => (
              <a key={s.id} className="disc-card" href={s.url} target="_blank" rel="noopener noreferrer">
                <div className="disc-card__img" style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined} />
                <div className="disc-card__body">
                  <span className="disc-card__eyebrow">{s.source}</span>
                  <h3>{s.headline}</h3>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="disc-empty">Today&rsquo;s stories aren&rsquo;t connected yet — check back soon, or open Today for details.</p>
        )}
      </section>

      <section className="disc-section">
        <div className="disc-section__head"><h2>Watch</h2><Link href="/dashboard/discovery/watch">Open Watch →</Link></div>
        {watch.items.length ? (
          <div className="disc-grid">
            {watch.items.slice(0, 4).map((w) => (
              <Link key={w.id} className="disc-card" href={`/dashboard/discovery/watch/${w.id}`}>
                <div className="disc-card__img" style={w.posterUrl ? { backgroundImage: `url(${w.posterUrl})` } : undefined} />
                <div className="disc-card__body"><h3>{w.title}</h3></div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="disc-empty">Trending shows aren&rsquo;t connected yet.</p>
        )}
      </section>

      <section className="disc-section">
        <div className="disc-section__head"><h2>Movies — Now in Theaters</h2><Link href="/dashboard/discovery/movies">Open Movies →</Link></div>
        {movies.items.length ? (
          <div className="disc-grid">
            {movies.items.slice(0, 4).map((m) => (
              <Link key={m.id} className="disc-card" href={`/dashboard/discovery/movies/${m.id}`}>
                <div className="disc-card__img" style={m.posterUrl ? { backgroundImage: `url(${m.posterUrl})` } : undefined} />
                <div className="disc-card__body"><h3>{m.title}</h3></div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="disc-empty">Now-playing movies aren&rsquo;t connected yet.</p>
        )}
      </section>

      <section className="disc-section">
        <div className="disc-section__head"><h2>Music</h2><Link href="/dashboard/discovery/music">Open Music →</Link></div>
        {music.entries.length ? (
          <div className="disc-chart">
            {music.entries.slice(0, 3).map((e) => (
              <div className="disc-chart__row" key={e.rank}>
                <span className="disc-chart__rank">{e.rank}</span>
                <div className="disc-chart__art" style={e.artworkUrl ? { backgroundImage: `url(${e.artworkUrl})` } : undefined} />
                <div className="disc-chart__song"><b>{e.song}</b><span>{e.artist}</span></div>
                {!music.isOfficial && <span className="disc-badge disc-badge--manual">Magical Moments Chart</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="disc-empty">No chart connected yet — the Owner can feature a Magical Moments chart from the Discovery Content Center.</p>
        )}
      </section>

      <section className="disc-section">
        <div className="disc-section__head"><h2>Near You</h2><Link href="/dashboard/discovery/near-you">Open Near You →</Link></div>
        <p className="disc-empty">Tell us your city to see concerts, festivals, and things to do nearby.</p>
      </section>

      <section className="disc-section">
        <div className="disc-section__head"><h2>Sports</h2><Link href="/dashboard/discovery/sports">Open Sports →</Link></div>
        <p className="disc-empty">Live sports integration pending.</p>
      </section>

      <section className="disc-section">
        <div className="disc-section__head"><h2>Trending</h2><Link href="/dashboard/discovery/trending">Open Trending →</Link></div>
        {trending.length ? (
          <div className="disc-grid">
            {trending.slice(0, 4).map((t) => (
              <a key={t.id} className="disc-card" href={t.externalUrl ?? "#"} target={t.externalUrl ? "_blank" : undefined} rel="noopener noreferrer">
                <div className="disc-card__img" style={t.imageUrl ? { backgroundImage: `url(${t.imageUrl})` } : undefined} />
                <div className="disc-card__body">{t.category && <span className="disc-card__eyebrow">{t.category}</span>}<h3>{t.title}</h3></div>
              </a>
            ))}
          </div>
        ) : (
          <p className="disc-empty">Nothing featured yet — the Owner can add seasonal finds from the Discovery Content Center.</p>
        )}
      </section>
    </div>
  );
}
