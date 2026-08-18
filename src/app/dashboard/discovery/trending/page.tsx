import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getTrendingItems, getTicketmasterTrending } from "@/lib/discovery/service";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState } from "../_components";
import "../discovery.css";
import "./trending.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trending — Magical Discovery", robots: { index: false } };

export default async function TrendingPage() {
  await requireAccount("/dashboard/discovery/trending");
  const [items, ticketmaster] = await Promise.all([getTrendingItems(), getTicketmasterTrending()]);

  return (
    <div className="disc disc-lux disc-dark trending">
      <DiscoveryNav active="/dashboard/discovery/trending" />

      <header className="trending-header">
        <h1>Trending</h1>
        <p>Timely ideas for the season — gifts, holidays, and lifestyle finds, curated by Magical Moments.</p>
      </header>

      {items[0] && (
        <a className="disc-card disc-card--feature" href={items[0].externalUrl ?? "#"} target={items[0].externalUrl ? "_blank" : undefined} rel="noopener noreferrer">
          <div className="disc-card__img" style={items[0].imageUrl ? { backgroundImage: `url(${items[0].imageUrl})` } : undefined} />
          <div className="disc-card__body">
            {items[0].category && <span className="disc-card__eyebrow">{items[0].category}</span>}
            <h3>{items[0].title}</h3>
            {items[0].description && <p>{items[0].description}</p>}
          </div>
        </a>
      )}

      {items.length ? (
        <div className="disc-grid disc-grid--wide">
          {items.map((t) => (
            <a key={t.id} className="disc-card" href={t.externalUrl ?? "#"} target={t.externalUrl ? "_blank" : undefined} rel="noopener noreferrer">
              <div className="disc-card__img" style={t.imageUrl ? { backgroundImage: `url(${t.imageUrl})` } : undefined} />
              <div className="disc-card__body">
                {t.category && <span className="disc-card__eyebrow">{t.category}</span>}
                <h3>{t.title}</h3>
                {t.description && <p>{t.description}</p>}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <DiscoveryEmptyState title="Nothing featured yet.">Trending is curated by the Owner from the Discovery Content Center — seasonal finds, gift ideas, and lifestyle picks will appear here once added.</DiscoveryEmptyState>
      )}

      {ticketmaster.items.length > 0 && (
        <section className="trending-tm">
          <div className="trending-tm__head">
            <h2>Trending on Ticketmaster Right Now</h2>
            <span>Ticketmaster&rsquo;s own real-time relevance ranking — currently on-sale events, nationwide</span>
          </div>
          <div className="disc-grid">
            {ticketmaster.items.map((e) => (
              <a key={e.id} className="disc-card" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
                <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
                <div className="disc-card__body">
                  <span className="disc-card__eyebrow">{e.category.replace("_", " & ")}</span>
                  <h3>{e.name}</h3>
                  <div className="disc-card__meta">
                    {e.localDate && <span>{new Date(`${e.localDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                    {e.venueName && <span>· {e.venueName}</span>}
                  </div>
                  {(e.city || e.state) && <div className="disc-card__meta"><span>{[e.city, e.state].filter(Boolean).join(", ")}</span></div>}
                  <span className="disc-card__action">View Tickets on Ticketmaster →</span>
                </div>
              </a>
            ))}
          </div>
          <p className="trending-tm__attribution">Powered by Ticketmaster Discovery.</p>
        </section>
      )}
    </div>
  );
}
