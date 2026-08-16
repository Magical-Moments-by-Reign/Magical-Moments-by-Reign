import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getTrendingItems } from "@/lib/discovery/service";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState, DiscoveryPageHeader } from "../_components";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trending — Magical Discovery", robots: { index: false } };

export default async function TrendingPage() {
  await requireAccount("/dashboard/discovery/trending");
  const items = await getTrendingItems();

  return (
    <div className="disc">
      <DiscoveryPageHeader title="Trending" description={<>Timely ideas for the season — gifts, holidays, and lifestyle finds, curated by Magical Moments.</>} />
      <DiscoveryNav active="/dashboard/discovery/trending" />

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
    </div>
  );
}
