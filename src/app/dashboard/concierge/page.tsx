import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { SERVICE_CATEGORIES, connectionLabel, RESERVATION_STATUS } from "@/lib/reservations/catalog";
import { listReservations } from "@/lib/reservations/service";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "./concierge-hub.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Concierge & Reservations", robots: { index: false } };

// The Concierge & Reservations Hub — a luxury concierge desk. Browse for
// inspiration, plan independently, ask Journey/Concierge for guidance, or
// return to see every request in one organized place.
export default async function ConciergeHubPage() {
  const account = await requireAccount("/dashboard/concierge");
  const reservations = await listReservations(account.id).catch(() => []);
  const recent = reservations.slice(0, 3);
  const openCount = reservations.filter((r) => !RESERVATION_STATUS[r.status].terminal).length;

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Concierge Desk</span>
        <h1 className="pg-title">Concierge &amp; Reservations</h1>
        <p className="pg-sub">Tell us what you need, or explore what&apos;s possible. From a dinner table to a whole vacation, Magical Moments can help you plan, search, request, and manage it all — in one place.</p>
      </div>

      {/* Two primary paths */}
      <div className="cx-paths">
        <Link href="/dashboard/concierge/services" className="cx-path">
          <span className="cx-path__icon" aria-hidden="true">✦</span>
          <span className="cx-path__t">Browse Our Services</span>
          <span className="cx-path__b">Explore services, ideas, and available experiences.</span>
        </Link>
        <OpenConciergeButton className="cx-path cx-path--ask" seed="I'd like help planning something. Here's what I have in mind:">
          <span className="cx-path__icon" aria-hidden="true">✽</span>
          <span className="cx-path__t">Ask the Concierge</span>
          <span className="cx-path__b">Tell us what you need, and Journey or the Concierge team will guide you through it.</span>
        </OpenConciergeButton>
      </div>

      {/* My Reservations preview */}
      <section className="sec">
        <div className="sec__h" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="sec__t">My Reservations</h2>
          <Link href="/dashboard/concierge/reservations" className="cx-seeall">View all{reservations.length ? ` (${reservations.length})` : ""} →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="note">No requests yet. Choose a service below or ask the Concierge — every request you make will appear here, from first draft to confirmed.</p>
        ) : (
          <div className="cx-reslist">
            {recent.map((r) => {
              const meta = RESERVATION_STATUS[r.status];
              return (
                <Link key={r.id} href={`/dashboard/concierge/reservations/${r.id}`} className="cx-resrow">
                  <span className="cx-resrow__title">{r.title}</span>
                  <span className={`cx-badge cx-badge--${meta.tone}`}>{meta.label}</span>
                </Link>
              );
            })}
            {openCount > 0 && <p className="note" style={{ marginTop: ".5rem" }}>{openCount} request{openCount > 1 ? "s" : ""} in progress.</p>}
          </div>
        )}
      </section>

      {/* Service category cards */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">What can we help you with?</h2></div>
        <div className="cx-grid">
          {SERVICE_CATEGORIES.map((s) => (
            <article key={s.id} className={`cx-card cx-card--${s.connection}`}>
              <div className="cx-card__top">
                <span className="cx-emoji" aria-hidden="true">{s.icon}</span>
                <span className={`cx-badge cx-badge--${s.connection}`}>{connectionLabel(s.connection)}</span>
              </div>
              <h3 className="cx-card__t">{s.label}</h3>
              <p className="cx-card__b">{s.description}</p>
              <div className="cx-card__act">
                <Link href={`/dashboard/concierge/request/${s.id}`} className="btn btn--sm btn--gold">
                  {s.id === "restaurants" ? "Start a request" : "Request this"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="note" style={{ marginTop: "1.6rem" }}>
        Every request is handled by our concierge — we never confirm a reservation until a real provider or our team records it. When a provider connects for direct booking, that service will simply become bookable here.
      </p>
    </>
  );
}
