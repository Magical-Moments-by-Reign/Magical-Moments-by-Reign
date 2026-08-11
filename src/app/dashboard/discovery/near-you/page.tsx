import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getNearYouEvents } from "@/lib/discovery/service";
import type { EventCategory } from "@/lib/discovery/providers/events";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState, DiscoveryPageHeader } from "../_components";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Near You — Magical Discovery", robots: { index: false } };

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "concerts", label: "Concerts" }, { id: "festivals", label: "Festivals" }, { id: "comedy", label: "Comedy" },
  { id: "theater", label: "Theater" }, { id: "sports", label: "Sports Events" }, { id: "family", label: "Family Activities" },
  { id: "arts_culture", label: "Arts & Culture" }, { id: "other", label: "Other" },
];
const CATEGORY_LABEL: Record<EventCategory, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<EventCategory, string>;
const RADII = [25, 50, 100] as const;

export default async function NearYouPage({ searchParams }: { searchParams: Promise<{ location?: string; category?: string; radius?: string }> }) {
  await requireAccount("/dashboard/discovery/near-you");
  const { location, category: rawCategory, radius: rawRadius } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === rawCategory) ? (rawCategory as EventCategory) : undefined;
  const radius = RADII.includes(Number(rawRadius) as typeof RADII[number]) ? Number(rawRadius) : 50;
  const result = location?.trim() ? await getNearYouEvents({ location: location.trim(), category, radiusMiles: radius }) : null;

  return (
    <div className="disc">
      <DiscoveryPageHeader title="Near You" description={<>Things you can actually go do — concerts, festivals, theater, and more, near a city you choose. We only look up events where you tell us to.</>} />
      <DiscoveryNav active="/dashboard/discovery/near-you" />

      <section className="near-partner" aria-labelledby="near-partner-title">
        <div className="near-partner__brands">
          <Image src="/brand/logo-champagne.png" alt="Magical Moments by Reign" width={48} height={48} className="near-partner__logo" />
          <span aria-hidden="true">×</span>
          <strong>ticketmaster</strong>
        </div>
        <span className="near-partner__eyebrow">Ticketmaster inside Magical Moments</span>
        <h2 id="near-partner-title">Find Something Magical Near You</h2>
        <p>Discover concerts, festivals, comedy, theater, sports, family experiences, arts, culture, and more happening around you.</p>
      </section>

      <form className="near-search" method="get">
        <label htmlFor="near-location">Where do you want to explore?</label>
        <div className="near-search__row"><input id="near-location" type="text" name="location" placeholder="Enter city or ZIP code" defaultValue={location ?? ""} aria-label="City or ZIP code" autoComplete="street-address" />
        <select name="radius" defaultValue={String(radius)} aria-label="Search radius">{RADII.map((miles) => <option key={miles} value={miles}>{miles} miles</option>)}</select>
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn btn--gold">Find Events</button></div>
      </form>

      {location?.trim() && (
        <div className="disc-filters">
          <a href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location)}&radius=${radius}`} aria-current={!category ? "true" : undefined}>All</a>
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location)}&radius=${radius}&category=${c.id}`} aria-current={category === c.id ? "true" : undefined}>{c.label}</a>
          ))}
        </div>
      )}

      {!location?.trim() ? (
        <DiscoveryEmptyState title="Where should we look?">Enter a city or ZIP code above to see what&rsquo;s happening nearby.</DiscoveryEmptyState>
      ) : result && result.items.length ? (
        <div className="disc-grid">
          {result.items.map((e) => (
            <a key={e.id} className="disc-card disc-card--event" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
              <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
              <div className="disc-card__body">
                <span className="disc-card__eyebrow">{CATEGORY_LABEL[e.category]}</span>
                <h3>{e.name}</h3>
                <div className="disc-card__meta">
                  {e.startsAt && (
                    <span>
                      {new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {new Date(e.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                  {e.venueName && <span>· {e.venueName}</span>}
                </div>
                {(e.city || e.state) && <div className="disc-card__meta">{[e.city, e.state].filter(Boolean).join(", ")}</div>}
                <span className="disc-card__action">View Tickets on Ticketmaster →</span>
              </div>
            </a>
          ))}
        </div>
      ) : result?.source === "unavailable" ? (
        <DiscoveryEmptyState title="We couldn’t load nearby events right now.">Ticketmaster didn&rsquo;t respond successfully to that search — try again in a moment.</DiscoveryEmptyState>
      ) : (
        <div className="near-empty">
          <DiscoveryEmptyState title={category ? "Nothing in this category nearby yet ✦" : "Nothing nearby yet ✦"}>Try another location, increase your search radius, or choose another category.</DiscoveryEmptyState>
          {radius < 100 && <Link className="btn btn--gold" href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location)}&radius=100${category ? `&category=${category}` : ""}`}>Expand to 100 Miles</Link>}
        </div>
      )}

      {result?.providerName && <p className="disc-empty">{result.attribution}</p>}
    </div>
  );
}
