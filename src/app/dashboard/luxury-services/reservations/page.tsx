import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getServiceCategory, RESERVATION_STATUS } from "@/lib/reservations/catalog";
import { listReservations } from "@/lib/reservations/service";
import "../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Reservations", robots: { index: false } };

export default async function ReservationsPage() {
  const account = await requireAccount("/dashboard/luxury-services/reservations");
  const reservations = await listReservations(account.id).catch(() => []);

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services" className="cx-back">← Luxury Services</Link>
        <span className="pg-eyebrow">Concierge Desk</span>
        <h1 className="pg-title">My Reservations</h1>
        <p className="pg-sub">Every request you&apos;ve made, from first draft to confirmed — all in one place.</p>
      </div>

      {reservations.length === 0 ? (
        <div className="cx-empty">
          <p>You haven&apos;t made any requests yet.</p>
          <Link href="/dashboard/luxury-services" className="btn btn--gold">Explore Luxury Services</Link>
        </div>
      ) : (
        <div className="cx-table">
          {reservations.map((r) => {
            const meta = RESERVATION_STATUS[r.status];
            const svc = getServiceCategory(r.serviceType);
            return (
              <Link key={r.id} href={`/dashboard/luxury-services/reservations/${r.id}`} className="cx-trow">
                <span className="cx-trow__icon" aria-hidden="true">{svc?.icon ?? "✦"}</span>
                <span className="cx-trow__main">
                  <span className="cx-trow__title">{r.title}</span>
                  <span className="cx-trow__meta">{svc?.label}{r.location ? ` · ${r.location}` : ""}{r.date ? ` · ${r.date}` : ""}</span>
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
