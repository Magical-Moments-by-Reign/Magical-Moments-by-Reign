import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { RESERVATION_STATUS } from "@/lib/reservations/catalog";
import { listReservations } from "@/lib/reservations/service";
import "../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Hotel Reservations", robots: { index: false } };

export default async function HotelReservationsPage() {
  const account = await requireAccount("/dashboard/luxury-services/hotels/reservations");
  const all = await listReservations(account.id).catch(() => []);
  const hotels = all.filter((r) => r.serviceType === "hotels");

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services/hotels?path=search" className="cx-back">← Hotels</Link>
        <span className="pg-eyebrow">🏨 Magical Moments Hotels</span>
        <h1 className="pg-title">My Hotel Reservations</h1>
        <p className="pg-sub">Every hotel request and booking, with live status. Open one to see its booking status.</p>
      </div>

      {hotels.length === 0 ? (
        <div className="cx-empty">
          <p>No hotel requests yet.</p>
          <Link href="/dashboard/luxury-services/hotels?path=search" className="btn btn--gold">Search hotels</Link>
        </div>
      ) : (
        <div className="cx-table">
          {hotels.map((r) => {
            const meta = RESERVATION_STATUS[r.status];
            return (
              <Link key={r.id} href={`/dashboard/luxury-services/reservations/${r.id}`} className="cx-trow">
                <span className="cx-trow__icon" aria-hidden="true">🏨</span>
                <span className="cx-trow__main">
                  <span className="cx-trow__title">{r.business || r.title}</span>
                  <span className="cx-trow__meta">{r.location ? `${r.location} · ` : ""}{r.date ? `Check-in ${r.date}` : "Dates flexible"}</span>
                </span>
                <span className={`cx-badge cx-badge--${meta.tone}`}>{meta.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
