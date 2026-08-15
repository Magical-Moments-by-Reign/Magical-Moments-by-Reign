import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getNearYouEvents } from "@/lib/discovery/service";
import type { DiscoveredEvent, EventCategory } from "@/lib/discovery/providers/events";
import MagicalSidebar from "../MagicalSidebar";
import NearYouGeoDetect from "./GeoDetect";
import "../discovery.css";
import "../discovery-shell.css";
import "./events-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events and Tickets — Magical Moments by Reign", robots: { index: false } };

const EVENTS_PROMO = { title: "Make Every Moment Magical", body: "Find the perfect experience for you and your people.", ctaLabel: "Explore Events", ctaHref: "/dashboard/discovery/near-you#search" };

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "concerts", label: "Concerts" }, { id: "sports", label: "Sports" }, { id: "theater", label: "Theater" },
  { id: "family", label: "Family" }, { id: "comedy", label: "Comedy" }, { id: "festivals", label: "Festivals" },
  { id: "arts_culture", label: "Arts & Culture" }, { id: "other", label: "Other" },
];
const CATEGORY_LABEL: Record<EventCategory, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<EventCategory, string>;

function eventDateTime(e: DiscoveredEvent): string {
  if (!e.startsAt) return "";
  const d = new Date(e.startsAt);
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default async function NearYouPage({ searchParams }: { searchParams: Promise<{ location?: string; category?: string; lat?: string; lng?: string; keyword?: string }> }) {
  await requireAccount("/dashboard/discovery/near-you");
  const { location, category: rawCategory, lat: rawLat, lng: rawLng, keyword } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === rawCategory) ? (rawCategory as EventCategory) : undefined;

  const typedLocation = location?.trim();
  const lat = !typedLocation && rawLat ? Number(rawLat) : undefined;
  const lng = !typedLocation && rawLng ? Number(rawLng) : undefined;
  const hasCoords = typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
  const hasAnyLocation = Boolean(typedLocation) || hasCoords;

  const result = hasCoords
    ? await getNearYouEvents({ location: "Near you", coords: { lat: lat as number, lng: lng as number }, category, keyword })
    : typedLocation
      ? await getNearYouEvents({ location: typedLocation, category, keyword })
      : null;

  const filterHref = (categoryId?: string) => {
    const params = new URLSearchParams();
    if (typedLocation) params.set("location", typedLocation);
    else if (hasCoords) { params.set("lat", String(lat)); params.set("lng", String(lng)); }
    if (keyword?.trim()) params.set("keyword", keyword.trim());
    if (categoryId) params.set("category", categoryId);
    return `/dashboard/discovery/near-you?${params.toString()}`;
  };

  const items = result?.items ?? [];
  const featured = items.slice(0, 5);
  const nearYouList = items.slice(5, 9);
  const locationLabel = typedLocation ?? (hasCoords ? "Near you" : null);

  return (
    <div className="disc mm-shell">
      <MagicalSidebar active="Events and Tickets" promo={EVENTS_PROMO} />

      <div className="mm-main">
        <section className="mm-hero" style={{ backgroundImage: "url(/story/sports.jpg)" }}>
          <div className="mm-hero__scrim">
            <span className="mm-hero__eyebrow">Events and Tickets</span>
            <h1>Unforgettable events.<br /><em>Magical memories.</em></h1>
            <p>Discover the best concerts, sports, theater, and more — all in one magical place.</p>
            <a href="#search" className="mm-hero__cta">🎟 Find Tickets</a>
          </div>
          <div className="mm-hero__trust">
            <span><b>Official Ticketmaster Tickets</b>100% Authentic</span>
            <span><b>Secure Checkout</b>Safe &amp; Encrypted</span>
            <span><b>Mobile Tickets</b>Easy Entry</span>
            <span><b>Magical Rewards</b>Earn with Every Purchase</span>
          </div>
        </section>

        <div className="evt-search" id="search">
          <h2>Find the perfect event</h2>
          <form className="evt-search__row" method="get">
            <input type="text" name="keyword" placeholder="Search artists, teams, events, or venues…" defaultValue={keyword ?? ""} aria-label="Search artists, teams, events, or venues" />
            <input type="text" name="location" placeholder="City or ZIP code" defaultValue={typedLocation ?? ""} aria-label="City or ZIP code" />
            {category && <input type="hidden" name="category" value={category} />}
            <button type="submit">Search</button>
          </form>
          {!hasAnyLocation && <NearYouGeoDetect />}
          <div className="evt-pills">
            <a href={filterHref()} aria-current={!category ? "true" : undefined}>All Events</a>
            {CATEGORIES.map((c) => (
              <a key={c.id} href={filterHref(c.id)} aria-current={category === c.id ? "true" : undefined}>{c.label}</a>
            ))}
          </div>
        </div>

        {!hasAnyLocation ? (
          <p className="disc-empty">Allow location access above, or enter a city or ZIP code, to see what&rsquo;s happening nearby.</p>
        ) : items.length === 0 ? (
          result?.source === "unavailable" ? (
            <div className="disc-pending">
              <b>We couldn&rsquo;t load nearby events right now.</b>
              Ticketmaster didn&rsquo;t respond successfully to that search — try again in a moment.
            </div>
          ) : (
            <div className="disc-pending">
              <b>No events found for that search.</b>
              Try a nearby city, a wider area, a different keyword, or a different category.
            </div>
          )
        ) : (
          <>
            <section className="mm-section">
              <div className="mm-section__head">
                <h2>Featured Events</h2>
                <Link href={filterHref()}>View All Events →</Link>
              </div>
              <div className="evt-carousel">
                {featured.map((e) => (
                  <a key={e.id} className="evt-fcard" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
                    <div className="evt-fcard__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
                    <div className="evt-fcard__body">
                      <span className="evt-fcard__eyebrow">{CATEGORY_LABEL[e.category]}</span>
                      <h3>{e.name}</h3>
                      <div className="evt-fcard__meta">
                        {eventDateTime(e) && <div>{eventDateTime(e)}</div>}
                        {(e.venueName || e.city) && <div>{[e.venueName, e.city].filter(Boolean).join(", ")}</div>}
                      </div>
                      <span className="evt-fcard__cta">View Tickets →</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            <div className="evt-cols">
              <section className="mm-section">
                <div className="mm-section__head">
                  <h2>Events Near You</h2>
                  <Link href={filterHref()}>View All →</Link>
                </div>
                {nearYouList.length === 0 ? (
                  <p className="disc-empty">That&rsquo;s everything we found for this search.</p>
                ) : (
                  <div className="evt-nearlist">
                    {nearYouList.map((e) => (
                      <a key={e.id} className="evt-nearlist__row" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
                        <div className="evt-nearlist__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
                        <span className="grow">
                          <b>{e.name}</b>
                          <span>{eventDateTime(e)}{e.venueName ? ` · ${e.venueName}` : ""}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <div className="evt-summary">
                <div>
                  <div className="evt-summary__loc">📍 {locationLabel}</div>
                  <div className="evt-summary__count">Top Events This Week</div>
                  <div className="evt-summary__num">{items.length}</div>
                  <div className="evt-summary__sub">Events Available</div>
                  <p className="evt-summary__note">A live map view isn&rsquo;t connected yet — this count is real, from the same Ticketmaster search as the list on the left.</p>
                </div>
                <a href={filterHref()} className="evt-summary__cta">Browse All Nearby Events</a>
              </div>
            </div>
          </>
        )}

        <section className="evt-perks">
          <div className="evt-perks__copy">
            <b>More Magic. More Perks.</b>
            <p>Premium members get priority access and support across every Magical Moments experience.</p>
            <Link href="/pricing" className="btn btn--sm">Learn More</Link>
          </div>
          <div className="evt-perks__grid">
            <div className="evt-perks__item"><span>⭐</span><b>Magical Rewards</b><i>Coming to Premium</i></div>
            <div className="evt-perks__item"><span>🎫</span><b>Presale Access</b><i>Coming to Premium</i></div>
            <div className="evt-perks__item"><span>💎</span><b>VIP Experiences</b><i>Premium Events</i></div>
            <div className="evt-perks__item"><span>🔒</span><b>Secure Checkout</b><i>Every Purchase</i></div>
          </div>
        </section>

        <section className="mm-banner mm-banner--split">
          <div>
            <b>Never Miss a Magical Moment</b>
            <p>Turn on alerts for nearby events and presales — manage this anytime in your notification preferences.</p>
            <Link href="/account/notifications" className="mm-banner__cta">Turn On Event Alerts</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
