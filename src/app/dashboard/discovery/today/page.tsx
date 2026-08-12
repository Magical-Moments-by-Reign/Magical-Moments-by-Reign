import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getTodayStories, getFeaturedItem } from "@/lib/discovery/service";
import type { NewsSection } from "@/lib/discovery/providers/news";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today — Magical Discovery", robots: { index: false } };

const SECTIONS: { id: NewsSection; label: string }[] = [
  { id: "top", label: "Top Stories" }, { id: "us", label: "U.S." }, { id: "world", label: "World" },
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

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAccount("/dashboard/discovery/today");
  const { section: raw } = await searchParams;
  const section = (SECTIONS.some((s) => s.id === raw) ? raw : "top") as NewsSection;

  const [result, featured] = await Promise.all([getTodayStories(section), getFeaturedItem("today")]);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Today</h1>
        <p className="pg-sub">A concise view of what&rsquo;s happening today — headline, source, and a link to read the full story where it was published.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/today" />

      <div className="disc-filters">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/dashboard/discovery/today?section=${s.id}`} aria-current={section === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </div>

      {featured ? (
        <a className="disc-card disc-card--feature" href={featured.externalUrl ?? "#"} target={featured.externalUrl ? "_blank" : undefined} rel="noopener noreferrer">
          <div className="disc-card__img" style={featured.imageUrl ? { backgroundImage: `url(${featured.imageUrl})` } : undefined} />
          <div className="disc-card__body">
            <span className="disc-card__eyebrow">Featured Today</span>
            <h3>{featured.title}</h3>
            {featured.description && <p>{featured.description}</p>}
          </div>
        </a>
      ) : result.items[0] && (
        <a className="disc-card disc-card--feature" href={result.items[0].url} target="_blank" rel="noopener noreferrer">
          <div className="disc-card__img" style={result.items[0].imageUrl ? { backgroundImage: `url(${result.items[0].imageUrl})` } : undefined} />
          <div className="disc-card__body">
            <span className="disc-card__eyebrow">{result.items[0].source}</span>
            <h3>{result.items[0].headline}</h3>
            {result.items[0].snippet && <p>{result.items[0].snippet}</p>}
          </div>
        </a>
      )}

      {result.items.length ? (
        <div className="disc-grid disc-grid--wide">
          {result.items.map((s) => (
            <a key={s.id} className="disc-card" href={s.url} target="_blank" rel="noopener noreferrer">
              <div className="disc-card__img" style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined} />
              <div className="disc-card__body">
                <span className="disc-card__eyebrow">{s.source}</span>
                <h3>{s.headline}</h3>
                {s.snippet && <p>{s.snippet}</p>}
                <div className="disc-card__meta"><span>{timeAgo(s.publishedAt)}</span><span>·</span><span>Read More →</span></div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="disc-pending">
          <b>News isn&rsquo;t connected yet.</b>
          Magical Discovery&rsquo;s Today feed connects to a licensed news provider — once it&rsquo;s configured, headlines will appear here automatically. Nothing is shown until then.
        </div>
      )}
    </div>
  );
}
