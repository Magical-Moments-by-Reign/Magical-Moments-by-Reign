import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getNearYouEvents } from "@/lib/discovery/service";
import { normalizeTicketmasterLocation, type EventCategory } from "@/lib/discovery/providers/events";
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

export default async function NearYouPage({ searchParams }: { searchParams: Promise<{ location?: string; category?: string }> }) {
  await requireAccount("/dashboard/discovery/near-you");
  const { location, category: rawCategory } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === rawCategory) ? (rawCategory as EventCategory) : undefined;
  const normalizedLocation = location?.trim() ? normalizeTicketmasterLocation(location) : null;
  const invalidLocation = normalizedLocation?.kind === "invalid";
  const result = location?.trim() && !invalidLocation ? await getNearYouEvents({ location: location.trim(), category, radiusMiles: 25 }) : null;

  return (
    <div className="disc">
      <DiscoveryPageHeader title="Near You" description={<>Things you can actually go do — concerts, festivals, theater, and more, near a city you choose. We only look up events where you tell us to.</>} />
      <DiscoveryNav active="/dashboard/discovery/near-you" />

      <form className="disc-form" method="get">
        <input type="text" name="location" placeholder="Address, city, state, or ZIP" defaultValue={location ?? ""} aria-label="Address, city, state, or ZIP" autoComplete="street-address" />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn btn--gold">Find Events</button>
      </form>

      <div className="disc-filters">
        <a href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location ?? "")}`} aria-current={!category ? "true" : undefined}>All</a>
        {CATEGORIES.map((c) => (
          <a key={c.id} href={`/dashboard/discovery/near-you?location=${encodeURIComponent(location ?? "")}&category=${c.id}`} aria-current={category === c.id ? "true" : undefined}>{c.label}</a>
        ))}
      </div>

      {!location?.trim() ? (
        <DiscoveryEmptyState title="Where should we look?">Enter an address, city and state, or ZIP code to discover real events within 25 miles.</DiscoveryEmptyState>
      ) : invalidLocation ? (
        <DiscoveryEmptyState title="We couldn’t recognize that location.">Try a ZIP code, a city such as Atlanta, GA, or a street address that includes its city and state.</DiscoveryEmptyState>
      ) : result && result.items.length ? (
        <div className="disc-grid">
          {result.items.map((e) => (
            <a key={e.id} className="disc-card" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
              <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
              <div className="disc-card__body">
                <span className="disc-card__eyebrow">{e.category.replace("_", " & ")}</span><h3>{e.name}</h3>
                <div className="disc-card__meta">
                  {(e.localDate || e.startsAt) && <span>{new Date(`${e.localDate ?? e.startsAt?.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                  {e.localTime && <span>· {new Date(`2000-01-01T${e.localTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                  {e.venueName && <span>· {e.venueName}</span>}
                </div>
                {(e.city || e.state || e.distanceMiles != null) && <div className="disc-card__meta"><span>{[e.city, e.state].filter(Boolean).join(", ")}</span>{e.distanceMiles != null && <span>· {e.distanceMiles.toFixed(1)} mi</span>}</div>}
                <span className="disc-card__action">View Tickets →</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <DiscoveryEmptyState title={result ? (category ? "Nothing in this category nearby yet ✦" : "Nothing nearby yet ✦") : "Events are temporarily unavailable."}>{result ? "Try another location or category. Your search covers a 25-mile radius." : "The event provider could not be reached. Please try again shortly."}</DiscoveryEmptyState>
      )}
      {result?.providerName && <p className="disc-empty">{result.attribution}</p>}
    </div>
  );
}
