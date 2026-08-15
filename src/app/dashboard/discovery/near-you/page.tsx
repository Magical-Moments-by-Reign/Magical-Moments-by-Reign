import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getNearYouEvents } from "@/lib/discovery/service";
import type { DiscoveredEvent, EventCategory } from "@/lib/discovery/providers/events";
import DiscoveryNav from "../_nav";
import NearYouGeoDetect from "./GeoDetect";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Near You — Magical Discovery", robots: { index: false } };

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "concerts", label: "Concerts" }, { id: "festivals", label: "Festivals" }, { id: "comedy", label: "Comedy" },
  { id: "theater", label: "Theater" }, { id: "sports", label: "Sports Events" }, { id: "family", label: "Family Activities" },
  { id: "arts_culture", label: "Arts & Culture" }, { id: "other", label: "Other" },
];
const CATEGORY_LABEL: Record<EventCategory, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<EventCategory, string>;
// Preferred display order for the auto-grouped "hottest near you" sections.
const CATEGORY_ORDER: EventCategory[] = ["concerts", "sports", "theater", "festivals", "family", "arts_culture", "comedy", "other"];

function EventCard({ e }: { e: DiscoveredEvent }) {
  return (
    <a className="disc-card disc-card--event" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
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
  );
}

export default async function NearYouPage({ searchParams }: { searchParams: Promise<{ location?: string; category?: string; lat?: string; lng?: string }> }) {
  await requireAccount("/dashboard/discovery/near-you");
  const { location, category: rawCategory, lat: rawLat, lng: rawLng } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === rawCategory) ? (rawCategory as EventCategory) : undefined;

  const typedLocation = location?.trim();
  const lat = !typedLocation && rawLat ? Number(rawLat) : undefined;
  const lng = !typedLocation && rawLng ? Number(rawLng) : undefined;
  const hasCoords = typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
  const hasAnyLocation = Boolean(typedLocation) || hasCoords;

  const result = hasCoords
    ? await getNearYouEvents({ location: "Near you", coords: { lat: lat as number, lng: lng as number }, category })
    : typedLocation
      ? await getNearYouEvents({ location: typedLocation, category })
      : null;

  const filterHref = (categoryId?: string) => {
    const params = new URLSearchParams();
    if (typedLocation) params.set("location", typedLocation);
    else if (hasCoords) { params.set("lat", String(lat)); params.set("lng", String(lng)); }
    if (categoryId) params.set("category", categoryId);
    return `/dashboard/discovery/near-you?${params.toString()}`;
  };

  // Auto-group into "Concerts Near You / Sports Near You / …" sections only
  // for the unfiltered view — once a category filter is applied, show a
  // normal single grid of just that category (existing behavior).
  const groups: { category: EventCategory; items: DiscoveredEvent[] }[] = [];
  if (result && !category) {
    for (const cat of CATEGORY_ORDER) {
      const items = result.items.filter((e) => e.category === cat);
      if (items.length) groups.push({ category: cat, items: items.slice(0, 4) });
    }
  }

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Near You</h1>
        <p className="pg-sub">Things you can actually go do — concerts, festivals, theater, and more, near you. We only look up events with your permission, or a city you tell us.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/near-you" />

      {!hasAnyLocation && <NearYouGeoDetect />}

      <form className="disc-form" method="get">
        <input type="text" name="location" placeholder="City or ZIP code" defaultValue={typedLocation ?? ""} aria-label="City or ZIP code" />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn btn--gold">Find Events</button>
      </form>

      {hasAnyLocation && (
        <div className="disc-filters">
          <a href={filterHref()} aria-current={!category ? "true" : undefined}>All</a>
          {CATEGORIES.map((c) => (
            <a key={c.id} href={filterHref(c.id)} aria-current={category === c.id ? "true" : undefined}>{c.label}</a>
          ))}
        </div>
      )}

      {!hasAnyLocation ? (
        <p className="disc-empty">Allow location access above, or enter a city or ZIP code, to see what&rsquo;s happening nearby.</p>
      ) : result && result.items.length && (category || groups.length === 0) ? (
        <>
          <a className="disc-card disc-card--feature" href={result.items[0].ticketUrl} target="_blank" rel="noopener noreferrer">
            <div className="disc-card__img" style={result.items[0].imageUrl ? { backgroundImage: `url(${result.items[0].imageUrl})` } : undefined} />
            <div className="disc-card__body">
              <span className="disc-card__eyebrow">{CATEGORY_LABEL[result.items[0].category]}</span>
              <h3>{result.items[0].name}</h3>
              {(result.items[0].venueName || result.items[0].city) && <p>{[result.items[0].venueName, result.items[0].city].filter(Boolean).join(", ")}</p>}
            </div>
          </a>
          <div className="disc-grid">
            {result.items.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </>
      ) : result && groups.length > 0 ? (
        <>
          <a className="disc-card disc-card--feature" href={result.items[0].ticketUrl} target="_blank" rel="noopener noreferrer">
            <div className="disc-card__img" style={result.items[0].imageUrl ? { backgroundImage: `url(${result.items[0].imageUrl})` } : undefined} />
            <div className="disc-card__body">
              <span className="disc-card__eyebrow">{CATEGORY_LABEL[result.items[0].category]}</span>
              <h3>{result.items[0].name}</h3>
              {(result.items[0].venueName || result.items[0].city) && <p>{[result.items[0].venueName, result.items[0].city].filter(Boolean).join(", ")}</p>}
            </div>
          </a>
          {groups.map((g) => (
            <div className="disc-section" key={g.category}>
              <div className="disc-section__head">
                <h2>{CATEGORY_LABEL[g.category]} Near You</h2>
                <a href={filterHref(g.category)}>View All →</a>
              </div>
              <div className="disc-grid">
                {g.items.map((e) => <EventCard key={e.id} e={e} />)}
              </div>
            </div>
          ))}
        </>
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

      {result && result.items.length > 0 && (
        <p className="disc-events__attribution">
          <span className="disc-events__tm-badge">ticketmaster</span> Powered by Ticketmaster Discovery.
        </p>
      )}
    </div>
  );
}
