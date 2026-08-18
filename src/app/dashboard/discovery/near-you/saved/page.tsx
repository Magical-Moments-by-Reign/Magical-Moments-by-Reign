import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getSavedEvents } from "@/lib/discovery/saved-events";
import { unsaveEventAction } from "../actions";
import DiscoveryNav from "../../_nav";
import { DiscoveryEmptyState } from "../../_components";
import "../../discovery.css";
import "../near-you.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Saved Events — Magical Discovery", robots: { index: false } };

export default async function SavedEventsPage() {
  const account = await requireAccount("/dashboard/discovery/near-you/saved");
  const events = await getSavedEvents(account.id);

  return (
    <div className="disc disc-lux disc-dark near-you">
      <DiscoveryNav active="/dashboard/discovery/near-you" />

      <div className="near-saved-head">
        <div>
          <h1>My Saved Events</h1>
          <p>Events you&rsquo;ve bookmarked from Near You — a personal watchlist, not a record of what you&rsquo;ve bought. Every ticket purchase happens on Ticketmaster.</p>
        </div>
        <Link href="/dashboard/discovery/near-you" className="btn btn--gold">Find More Events</Link>
      </div>

      {events.length === 0 ? (
        <DiscoveryEmptyState title="Nothing saved yet ✦">Browse events near you and tap Save on anything you&rsquo;re interested in — it&rsquo;ll show up here.</DiscoveryEmptyState>
      ) : (
        <div className="disc-grid">
          {events.map((e) => (
            <div key={e.id} className="disc-card near-card">
              <form action={unsaveEventAction} className="near-card__save">
                <input type="hidden" name="ticketmasterId" value={e.ticketmasterId} />
                <button type="submit" className="near-card__save-btn near-card__save-btn--saved" aria-label="Remove from My Saved Events">✓ Saved</button>
              </form>
              <a className="disc-card__link" href={e.ticketUrl} target="_blank" rel="noopener noreferrer">
                <div className="disc-card__img" style={e.imageUrl ? { backgroundImage: `url(${e.imageUrl})` } : undefined} />
                <div className="disc-card__body">
                  {e.category && <span className="disc-card__eyebrow">{e.category.replace("_", " & ")}</span>}
                  <h3>{e.name}</h3>
                  <div className="disc-card__meta">
                    {e.localDate && <span>{new Date(`${e.localDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                    {e.localTime && <span>· {new Date(`2000-01-01T${e.localTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                    {e.venueName && <span>· {e.venueName}</span>}
                  </div>
                  {(e.city || e.state) && <div className="disc-card__meta"><span>{[e.city, e.state].filter(Boolean).join(", ")}</span></div>}
                  <span className="disc-card__action">View Tickets on Ticketmaster →</span>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
