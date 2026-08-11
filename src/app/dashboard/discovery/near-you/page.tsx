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
const CATEGORY_LABEL: Record<EventCategory, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<EventCategory, string>;

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
            <a key={e.id} className="disc-card disc-card--event" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
              <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
              <div className="disc-card__body">
                <span className="disc-badge">{CATEGORY_LABEL[e.category]}</span>
                <h3>{e.name}</h3>
                <div className="disc-card__meta">
                  {e.startsAt && (
                    <span>
                      {new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {new Date(e.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                {e.venueName && <div className="disc-card__meta">{e.venueName}</div>}
                {(e.city || e.state) && <div className="disc-card__meta">{[e.city, e.state].filter(Boolean).join(", ")}</div>}
                <span className="disc-card__cta">View Tickets →</span>
              </div>
            </a>
          ))}
        </div>
      ) : result?.source === "unavailable" ? (
        <div className="disc-pending">
          <b>We couldn&rsquo;t load nearby events right now.</b>
          Ticketmaster didn&rsquo;t respond successfully to that search — try again in a moment.
        </div>
      ) : (
        <div className="disc-pending">
          <b>No events found for that search.</b>
          Try a nearby city, a wider area, or a different category.
        </div>
      )}
    </div>
  );
}
