import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getNearYouEvents, getTrendingNearYouEvents } from "@/lib/discovery/service";
import { getSavedEventIds } from "@/lib/discovery/saved-events";
import { normalizeTicketmasterLocation, type EventCategory, type DiscoveredEvent } from "@/lib/discovery/providers/events";
import { saveEventAction, unsaveEventAction } from "./actions";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState } from "../_components";
import "../discovery.css";
import "./near-you.css";

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

const RADII = [25, 50, 100] as const;

function EventCard({ e, isSaved }: { e: DiscoveredEvent; isSaved: boolean }) {
  return (
    <div className="disc-card near-card">
      <form action={isSaved ? unsaveEventAction : saveEventAction} className="near-card__save">
        <input type="hidden" name="ticketmasterId" value={e.id} />
        {!isSaved && (
          <>
            <input type="hidden" name="name" value={e.name} />
            <input type="hidden" name="ticketUrl" value={e.ticketUrl} />
            <input type="hidden" name="category" value={e.category} />
            {e.imageUrl && <input type="hidden" name="imageUrl" value={e.imageUrl} />}
            {e.localDate && <input type="hidden" name="localDate" value={e.localDate} />}
            {e.localTime && <input type="hidden" name="localTime" value={e.localTime} />}
            {e.venueName && <input type="hidden" name="venueName" value={e.venueName} />}
            {e.city && <input type="hidden" name="city" value={e.city} />}
            {e.state && <input type="hidden" name="state" value={e.state} />}
          </>
        )}
        <button type="submit" className={`near-card__save-btn${isSaved ? " near-card__save-btn--saved" : ""}`} aria-label={isSaved ? "Remove from My Saved Events" : "Save this event"}>
          {isSaved ? "✓ Saved" : "♡ Save"}
        </button>
      </form>
      <a className="disc-card__link" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
        <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
        <div className="disc-card__body">
          <span className="disc-card__eyebrow">{e.category.replace("_", " & ")}</span><h3>{e.name}</h3>
          <div className="disc-card__meta">
            {(e.localDate || e.startsAt) && <span>{new Date(`${e.localDate ?? e.startsAt?.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
            {e.localTime && <span>· {new Date(`2000-01-01T${e.localTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
            {e.venueName && <span>· {e.venueName}</span>}
          </div>
          {(e.city || e.state || e.distanceMiles != null) && <div className="disc-card__meta"><span>{[e.city, e.state].filter(Boolean).join(", ")}</span>{e.distanceMiles != null && <span>· {e.distanceMiles.toFixed(1)} mi</span>}</div>}
          <span className="disc-card__action">View Tickets on Ticketmaster →</span>
        </div>
      </a>
    </div>
  );
}

export default async function NearYouPage({ searchParams }: { searchParams: Promise<{ location?: string; category?: string; radius?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/near-you");
  const { location, category: rawCategory, radius: rawRadius } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === rawCategory) ? (rawCategory as EventCategory) : undefined;
  const radius = RADII.includes(Number(rawRadius) as typeof RADII[number]) ? Number(rawRadius) : 50;
  const normalizedLocation = location?.trim() ? normalizeTicketmasterLocation(location) : null;
  const invalidLocation = normalizedLocation?.kind === "invalid";
  const [result, savedIds, trendingRaw] = await Promise.all([
    location?.trim() && !invalidLocation ? getNearYouEvents({ location: location.trim(), category, radiusMiles: radius }) : Promise.resolve(null),
    getSavedEventIds(account.id),
    getTrendingNearYouEvents(),
  ]);
  const hasEvents = Boolean(result?.items.length);
  const resultIds = new Set(result?.items.map((e) => e.id));
  const trending = trendingRaw.filter((e) => !resultIds.has(e.id));

  return (
    <div className="disc disc-lux disc-dark near-you">
      <DiscoveryNav active="/dashboard/discovery/near-you" />

      <section className="near-hero">
        <h1>Events &amp; <em>Tickets</em></h1>
        <p>Discover live experiences and book your next unforgettable moment.</p>
        <div className="near-hero__row">
          <span className="near-hero__partner">Powered by Ticketmaster, inside Magical Moments</span>
          <Link href="/dashboard/discovery/trending" className="near-hero__trending">✦ See What&rsquo;s Trending <span aria-hidden="true">→</span></Link>
          <Link href="/dashboard/discovery/near-you/saved" className="near-hero__trending">♡ My Saved Events{savedIds.size > 0 ? ` (${savedIds.size})` : ""}</Link>
        </div>

        <form className="near-search" method="get">
          <label htmlFor="near-location">Where do you want to explore?</label>
          <div className="near-search__row"><input id="near-location" type="text" name="location" placeholder="Enter address, city, or ZIP code" defaultValue={location ?? ""} aria-label="Address, city, or ZIP code" autoComplete="street-address" />
          <select name="radius" defaultValue={String(radius)} aria-label="Search radius">{RADII.map((miles) => <option key={miles} value={miles}>{miles} miles</option>)}</select>
          {category && <input type="hidden" name="category" value={category} />}
          <button type="submit" className="btn btn--gold">Find Events</button></div>
        </form>
      </section>

      <div className="disc-filters">
        <a href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location ?? "")}&radius=${radius}`} aria-current={!category ? "true" : undefined}>All</a>
        {CATEGORIES.map((c) => (
          <a key={c.id} href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location ?? "")}&radius=${radius}&category=${c.id}`} aria-current={category === c.id ? "true" : undefined}>{c.label}</a>
        ))}
      </div>

      {!location?.trim() ? (
        <DiscoveryEmptyState title="Where should we look?">Enter an address, city and state, or ZIP code to discover real events nearby.</DiscoveryEmptyState>
      ) : invalidLocation ? (
        <DiscoveryEmptyState title="We couldn’t recognize that location.">Try a ZIP code, a city such as Atlanta, GA, or a street address that includes its city and state.</DiscoveryEmptyState>
      ) : result && hasEvents ? (
        <div className="disc-grid">
          {result.items.map((e) => <EventCard key={e.id} e={e} isSaved={savedIds.has(e.id)} />)}
        </div>
      ) : result?.source === "unavailable" ? (
        <div className="disc-pending">
          <b>We couldn&rsquo;t load nearby events right now.</b>
          Ticketmaster didn&rsquo;t respond successfully to that search — try again in a moment.
        </div>
      ) : (
        result ? <div className="near-empty"><DiscoveryEmptyState title={category ? "Nothing in this category nearby yet ✦" : "Nothing nearby yet ✦"}>Try another location, increase your search radius, or choose another category.</DiscoveryEmptyState>{radius < 100 && <Link className="btn btn--gold" href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location)}&radius=100${category ? `&category=${category}` : ""}`}>Expand to 100 Miles</Link>}</div>
          : <DiscoveryEmptyState title="We couldn’t load nearby events right now.">Please try again in a moment.</DiscoveryEmptyState>
      )}
      {result?.providerName && <p className="disc-empty">{result.attribution}</p>}

      {trending.length > 0 && (
        <section className="near-trending">
          <div className="near-trending__head">
            <h2>Trending Now</h2>
            <span>Real, currently on-sale shows — live from Ticketmaster</span>
          </div>
          <div className="disc-grid">
            {trending.map((e) => <EventCard key={e.id} e={e} isSaved={savedIds.has(e.id)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
