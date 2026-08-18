import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getTodayStories, getFeaturedItem } from "@/lib/discovery/service";
import type { NewsSection, NewsStory } from "@/lib/discovery/providers/news";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState } from "../_components";
import "../discovery.css";
import "./today.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Top Stories — Magical Discovery", robots: { index: false } };

const SECTIONS: { id: NewsSection; label: string }[] = [
  { id: "top", label: "All" }, { id: "us", label: "U.S." }, { id: "world", label: "World" },
  { id: "entertainment", label: "Entertainment" }, { id: "business", label: "Business" },
  { id: "technology", label: "Technology" }, { id: "health", label: "Health" }, { id: "sports", label: "Sports" },
];

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

interface HeroStory {
  headline: string;
  source: string;
  snippet?: string;
  imageUrl?: string;
  url?: string;
  publishedAt?: string;
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAccount("/dashboard/discovery/today");
  const { section: raw } = await searchParams;
  const section = (SECTIONS.some((s) => s.id === raw) ? raw : "top") as NewsSection;

  const [result, featured] = await Promise.all([getTodayStories(section), getFeaturedItem("today")]);

  // The hero + secondary rail together show up to 5 stories; "More Top
  // Stories" below shows whatever's left — every story appears exactly
  // once, never repeated between sections.
  const rest = [...result.items];
  const hero: HeroStory | null = featured
    ? { headline: featured.title, source: "Featured", snippet: featured.description ?? undefined, imageUrl: featured.imageUrl ?? undefined, url: featured.externalUrl ?? undefined }
    : rest.length
      ? (() => { const s = rest.shift() as NewsStory; return { headline: s.headline, source: s.source, snippet: s.snippet, imageUrl: s.imageUrl, url: s.url, publishedAt: s.publishedAt }; })()
      : null;
  const secondary = rest.splice(0, 4);
  const more = rest;

  return (
    <div className="disc disc-lux disc-dark today">
      <DiscoveryNav active="/dashboard/discovery/today" />

      <div className="today-hero-head">
        <h1>Top Stories</h1>
        <p>The most important stories shaping our world today.</p>
      </div>

      {!hero && !secondary.length ? (
        <DiscoveryEmptyState title="News isn’t connected yet.">Magical Discovery&rsquo;s Top Stories feed connects to a licensed news provider — once it&rsquo;s configured, headlines will appear here automatically. Nothing is shown until then.</DiscoveryEmptyState>
      ) : (
        <>
          <div className="today-lead">
            {hero && (
              <a className="today-hero" href={hero.url ?? "#"} target={hero.url ? "_blank" : undefined} rel="noopener noreferrer">
                <div className="today-hero__art" style={hero.imageUrl ? { backgroundImage: `url(${hero.imageUrl})` } : undefined}>
                  <span className="today-hero__badge">Breaking</span>
                </div>
                <div className="today-hero__body">
                  <span className="today-hero__eyebrow">{hero.source}</span>
                  <h2>{hero.headline}</h2>
                  {hero.snippet && <p>{hero.snippet}</p>}
                  <div className="today-hero__foot">
                    {hero.publishedAt && <span>{timeAgo(hero.publishedAt)}</span>}
                    <span className="today-hero__cta">Read Full Story →</span>
                  </div>
                </div>
              </a>
            )}

            {secondary.length > 0 && (
              <div className="today-side">
                {secondary.map((s) => (
                  <a key={s.id} className="today-side__item" href={s.url} target="_blank" rel="noopener noreferrer">
                    <div className="today-side__art" style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined} />
                    <div className="today-side__body">
                      <span>{s.source}</span>
                      <b>{s.headline}</b>
                      <em>{timeAgo(s.publishedAt)}</em>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="disc-filters today-filters">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`/dashboard/discovery/today?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
            ))}
          </div>

          {more.length > 0 && (
            <section className="disc-lux__section disc-lux__news">
              <div className="disc-lux__section-head"><h2>More Top Stories</h2></div>
              <div className="disc-lux__news-grid today-more-grid">
                {more.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                    <div className="disc-lux__news-art" style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined} />
                    <div>
                      <h3>{s.headline}</h3>
                      <p>{s.source}{s.publishedAt ? ` · ${timeAgo(s.publishedAt)}` : ""}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <p className="today-foot">Stay Informed. Stay Inspired. Real stories, real impact, all in one place.</p>
        </>
      )}
    </div>
  );
}
