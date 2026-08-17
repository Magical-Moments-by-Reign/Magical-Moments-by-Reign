import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getWatchItems, getWatchDetails } from "@/lib/discovery/service";
import { getMyLineup, getSuggestedForYou, type LineupEntry } from "@/lib/discovery/watchlist";
import type { WatchItem } from "@/lib/discovery/providers/tmdb";
import { addToLineupAction, removeFromLineupAction, toggleFavoriteAction } from "./actions";
import DiscoveryNav from "../_nav";
import "../discovery.css";
import "./watch-lineup.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Watch TV Show — Magical Discovery", robots: { index: false } };

function Artwork({ src, alt }: { src?: string; alt: string }) {
  return src ? <Image src={src} alt={alt} fill sizes="180px" className="wtv-art-img" /> : <div className="wtv-art-fallback" aria-hidden="true">✦</div>;
}

function dayBadge(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function LineupCard({ entry }: { entry: LineupEntry }) {
  const network = entry.details?.networks[0]?.name;
  return (
    <div className="wtv-card">
      <Link href={`/dashboard/discovery/watch/${entry.tmdbId}`} className="wtv-card__art">
        <Artwork src={entry.posterUrl} alt={`${entry.title} poster`} />
      </Link>
      <form action={toggleFavoriteAction}>
        <input type="hidden" name="tmdbId" value={entry.tmdbId} />
        <button type="submit" className={`wtv-card__fav${entry.isFavorite ? " wtv-card__fav--on" : ""}`} aria-label={entry.isFavorite ? "Remove from favorites" : "Mark as favorite"}>♥</button>
      </form>
      <form action={removeFromLineupAction}>
        <input type="hidden" name="tmdbId" value={entry.tmdbId} />
        <button type="submit" className="wtv-card__remove" aria-label={`Remove ${entry.title} from your lineup`}>✕</button>
      </form>
      <div className="wtv-card__body">
        <b>{entry.title}</b>
        {network && <span>{network}</span>}
      </div>
    </div>
  );
}

function SuggestedCard({ item }: { item: WatchItem }) {
  return (
    <div className="wtv-card">
      <Link href={`/dashboard/discovery/watch/${item.id}`} className="wtv-card__art">
        <Artwork src={item.posterUrl} alt={`${item.title} poster`} />
      </Link>
      <form action={addToLineupAction}>
        <input type="hidden" name="tmdbId" value={item.id} />
        <input type="hidden" name="title" value={item.title} />
        {item.posterUrl && <input type="hidden" name="posterUrl" value={item.posterUrl} />}
        <button type="submit" className="wtv-card__add" aria-label={`Add ${item.title} to your lineup`}>+</button>
      </form>
      <div className="wtv-card__body"><b>{item.title}</b></div>
    </div>
  );
}

function BrowseCard({ item }: { item: WatchItem }) {
  return (
    <Link href={`/dashboard/discovery/watch/${item.id}`} className="wtv-card">
      <div className="wtv-card__art"><Artwork src={item.posterUrl} alt={`${item.title} poster`} /></div>
      <div className="wtv-card__body"><b>{item.title}</b>{formatDate(item.firstAirDate) && <span>{formatDate(item.firstAirDate)}</span>}</div>
    </Link>
  );
}

export default async function WatchPage() {
  const account = await requireAccount("/dashboard/discovery/watch");

  const [lineup, suggested, airingSoon, popular, newDrops] = await Promise.all([
    getMyLineup(account.id),
    getSuggestedForYou(account.id, 10),
    getWatchItems("airing_today"),
    getWatchItems("popular"),
    getWatchItems("new_this_week"),
  ]);

  const lineupTmdbIds = new Set(lineup.map((l) => l.tmdbId));
  const suggestedFiltered = suggested.filter((s) => !lineupTmdbIds.has(s.id));

  return (
    <div className="disc disc-lux disc-dark wtv">
      <DiscoveryNav active="/dashboard/discovery/watch" />

      <header className="wtv-header">
        <span className="wtv-header__icon" aria-hidden="true">📺</span>
        <div>
          <h1>Watch TV Show</h1>
          <p>Choose your own lineup, track favorites, and get suggestions.</p>
        </div>
      </header>

      <section className="wtv-section">
        <div className="wtv-section__head"><h2>Your Lineup</h2><span className="wtv-section__count">{lineup.length} show{lineup.length === 1 ? "" : "s"}</span></div>
        {lineup.length ? (
          <div className="wtv-rail">{lineup.map((entry) => <LineupCard key={entry.id} entry={entry} />)}</div>
        ) : (
          <p className="wtv-empty">Your lineup is empty — add a show from Suggested For You or the browse rows below to start tracking it.</p>
        )}
      </section>

      <section className="wtv-section">
        <div className="wtv-section__head"><h2>Suggested For You</h2></div>
        {suggestedFiltered.length ? (
          <div className="wtv-rail">{suggestedFiltered.map((item) => <SuggestedCard key={item.id} item={item} />)}</div>
        ) : (
          <p className="wtv-empty">Suggestions will appear here once you add a show or two to your lineup.</p>
        )}
      </section>

      <section className="wtv-section">
        <div className="wtv-section__head"><h2>Your TV Schedule &amp; Lineup</h2><span className="wtv-section__count">{lineup.length} show{lineup.length === 1 ? "" : "s"} in your lineup</span></div>
        {lineup.length ? (
          <div className="wtv-table-wrap">
            <table className="wtv-table">
              <thead>
                <tr><th></th><th>Show</th><th>First Aired</th><th>Next Episode</th><th>Network</th><th>Season / Episode</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {lineup.map((entry) => {
                  const ep = entry.details?.nextEpisode ?? entry.details?.lastEpisode;
                  const badge = entry.details?.nextEpisode ? dayBadge(entry.details.nextEpisode.airDate) : null;
                  return (
                    <tr key={entry.id}>
                      <td>{entry.isFavorite && <span className="wtv-table__star" aria-label="Favorite">★</span>}</td>
                      <td className="wtv-table__show">
                        <div className="wtv-table__thumb"><Artwork src={entry.posterUrl} alt="" /></div>
                        <Link href={`/dashboard/discovery/watch/${entry.tmdbId}`}>{entry.title}</Link>
                      </td>
                      <td>{formatDate(entry.details?.firstAirDate) ?? "—"}</td>
                      <td>
                        {entry.details?.nextEpisode?.airDate ? (
                          <>{formatDate(entry.details.nextEpisode.airDate)}{badge && <span className="wtv-badge">{badge}</span>}</>
                        ) : "—"}
                      </td>
                      <td>{entry.details?.networks[0]?.name ?? "—"}</td>
                      <td>{ep ? <>S{ep.seasonNumber} E{ep.episodeNumber}{ep.name && <span className="wtv-table__ep">{ep.name}</span>}</> : "—"}</td>
                      <td>{entry.details?.status ?? "—"}</td>
                      <td className="wtv-table__actions">
                        <form action={toggleFavoriteAction}>
                          <input type="hidden" name="tmdbId" value={entry.tmdbId} />
                          <button type="submit" className={entry.isFavorite ? "wtv-table__icon-btn--on" : "wtv-table__icon-btn"} aria-label="Toggle favorite">♥</button>
                        </form>
                        <form action={removeFromLineupAction}>
                          <input type="hidden" name="tmdbId" value={entry.tmdbId} />
                          <button type="submit" className="wtv-table__icon-btn" aria-label="Remove from lineup">✕</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="wtv-empty">Add shows to Your Lineup to see their real schedule here — next air dates and networks come straight from TMDB.</p>
        )}
      </section>

      <section className="wtv-section">
        <div className="wtv-section__head"><h2>Airing Soon</h2><Link href="/dashboard/discovery/watch?section=airing_today">View All →</Link></div>
        {airingSoon.items.length ? <div className="wtv-rail">{airingSoon.items.slice(0, 10).map((i) => <BrowseCard key={i.id} item={i} />)}</div> : <p className="wtv-empty">Nothing airing today right now.</p>}
      </section>

      <section className="wtv-section">
        <div className="wtv-section__head"><h2>Popular Picks</h2><Link href="/dashboard/discovery/watch?section=popular">View All →</Link></div>
        {popular.items.length ? <div className="wtv-rail">{popular.items.slice(0, 10).map((i) => <BrowseCard key={i.id} item={i} />)}</div> : <p className="wtv-empty">Popular shows are unavailable right now.</p>}
      </section>

      <section className="wtv-section">
        <div className="wtv-section__head"><h2>New Series Drop</h2><Link href="/dashboard/discovery/watch?section=new_this_week">View All →</Link></div>
        {newDrops.items.length ? <div className="wtv-rail">{newDrops.items.slice(0, 10).map((i) => <BrowseCard key={i.id} item={i} />)}</div> : <p className="wtv-empty">Nothing new to report this week.</p>}
      </section>

      <div className="wtv-feature-bar">
        <div className="wtv-feature-bar__item"><span aria-hidden="true">＋</span><div><b>Build Your Lineup</b><p>Add shows you love and personalize your watchlist.</p></div></div>
        <div className="wtv-feature-bar__item"><span aria-hidden="true">🔔</span><div><b>Track &amp; Get Reminders</b><p>See next air dates for everything in your lineup at a glance.</p></div></div>
        <div className="wtv-feature-bar__item"><span aria-hidden="true">★</span><div><b>Discover &amp; Get Suggestions</b><p>Smart picks based on what you already watch and love.</p></div></div>
        <Link href="/dashboard/discovery/watch?section=popular" className="wtv-feature-bar__cta">Explore More Shows →</Link>
      </div>
    </div>
  );
}
