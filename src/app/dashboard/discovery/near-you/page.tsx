import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getNearYouEvents } from "@/lib/discovery/service";
import type { EventCategory } from "@/lib/discovery/providers/events";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Near You — Magical Discovery", robots: { index: false } };

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "concerts", label: "Concerts" }, { id: "festivals", label: "Festivals" }, { id: "comedy", label: "Comedy" },
  { id: "theater", label: "Theater" }, { id: "sports", label: "Sports Events" }, { id: "family", label: "Family Activities" },
  { id: "arts_culture", label: "Arts & Culture" }, { id: "other", label: "Other" },
];

export default async function NearYouPage({ searchParams }: { searchParams: Promise<{ location?: string; category?: string }> }) {
  await requireAccount("/dashboard/discovery/near-you");
  const { location, category: rawCategory } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === rawCategory) ? (rawCategory as EventCategory) : undefined;
  const result = location?.trim() ? await getNearYouEvents({ location: location.trim(), category }) : null;

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Near You</h1>
        <p className="pg-sub">Things you can actually go do — concerts, festivals, theater, and more, near a city you choose. We only look up events where you tell us to.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/near-you" />

      <form className="disc-form" method="get">
        <input type="text" name="location" placeholder="City or ZIP code" defaultValue={location ?? ""} aria-label="City or ZIP code" />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn btn--gold">Find Events</button>
      </form>

      {location?.trim() && (
        <div className="disc-filters">
          <a href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location)}`} aria-current={!category ? "true" : undefined}>All</a>
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location)}&category=${c.id}`} aria-current={category === c.id ? "true" : undefined}>{c.label}</a>
          ))}
        </div>
      )}

      {!location?.trim() ? (
        <p className="disc-empty">Enter a city or ZIP code above to see what&rsquo;s happening nearby.</p>
      ) : result && result.items.length ? (
        <div className="disc-grid">
          {result.items.map((e) => (
            <a key={e.id} className="disc-card" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
              <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
              <div className="disc-card__body">
                <h3>{e.name}</h3>
                <div className="disc-card__meta">
                  {e.startsAt && <span>{new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  {e.venueName && <span>· {e.venueName}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="disc-pending">
          <b>{result ? "No events found for that search." : "Events aren’t connected yet."}</b>
          {result ? "Try a nearby city or a different category." : "Once an events provider is configured, nearby concerts, festivals, and things to do will appear here."}
        </div>
      )}
    </div>
  );
}
