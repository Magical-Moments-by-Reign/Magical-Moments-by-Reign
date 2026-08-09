import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getSportsFeed } from "@/lib/discovery/service";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sports — Magical Discovery", robots: { index: false } };

export default async function SportsPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  await requireAccount("/dashboard/discovery/sports");
  const { location } = await searchParams;
  const feed = await getSportsFeed(location);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Sports</h1>
        <p className="pg-sub">A lightweight sports discovery area — games, schedules, and scores, without turning Magical Moments into a sports ticker.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/sports" />

      <div className="disc-pending">
        <b>{feed.pendingMessage}</b>
        No sports data provider has been connected yet, so nothing here is invented — scores and standings will appear the moment a provider is approved and configured.
      </div>

      <div className="disc-section">
        <div className="disc-section__head"><h2>Sporting Event Tickets</h2></div>
        <form className="disc-form" method="get">
          <input type="text" name="location" placeholder="City or ZIP code" defaultValue={location ?? ""} aria-label="City or ZIP code" />
          <button type="submit" className="btn btn--gold">Find Sporting Events</button>
        </form>
        {location?.trim() ? (
          feed.ticketedEvents.items.length ? (
            <div className="disc-grid">
              {feed.ticketedEvents.items.map((e) => (
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
            <p className="disc-empty">No sporting-event tickets found for that search.</p>
          )
        ) : (
          <p className="disc-empty">Enter a city to see sporting event tickets nearby, via Near You.</p>
        )}
      </div>
    </div>
  );
}
