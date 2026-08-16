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
