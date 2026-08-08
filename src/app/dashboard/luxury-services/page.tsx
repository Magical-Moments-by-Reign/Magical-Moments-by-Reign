import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { SERVICE_CATEGORIES, connectionLabel, RESERVATION_STATUS } from "@/lib/reservations/catalog";
import { listReservations } from "@/lib/reservations/service";
import { listSaved } from "@/lib/reservations/saved";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "./luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Luxury Services", robots: { index: false } };

// The Magical Moments Luxury Services marketplace. Browse yourself, ask Journey,
// or ask the Concierge — the client always stays in control.
export default async function LuxuryServicesPage() {
  const account = await requireAccount("/dashboard/luxury-services");
  const [reservations, saved] = await Promise.all([
    listReservations(account.id).catch(() => []),
    listSaved(account.id).catch(() => []),
  ]);
  const recent = reservations.slice(0, 3);
  const savedCount = saved.length;

  return (
    <>
      <div className="ls-hero">
        <span className="pg-eyebrow">⭐ Magical Moments</span>
        <h1 className="ls-hero__title">Luxury Services</h1>
        <p className="ls-hero__sub">Enhance every Magical Moment with premium services designed to make planning simple, exciting, and unforgettable. Browse services yourself or allow Journey and our Concierge Team to help you find exactly what you need.</p>

        <div className="ls-greeting">
          <p className="ls-greeting__msg">“Welcome back! Would you like to browse services on your own, or would you like me to help you plan something special today?”</p>
          <div className="ls-greeting__btns">
            <a href="#mm-services" className="btn btn--gold">🔍 Browse Services</a>
            <OpenConciergeButton className="btn btn--ghost" seed="I'd like Journey's help planning something. Here's what I have in mind:">✨ Ask Journey</OpenConciergeButton>
            <OpenConciergeButton className="btn btn--ghost" seed="I'd like a member of the Concierge team to help me with a Luxury Services request:">👤 Ask Concierge</OpenConciergeButton>
          </div>
        </div>
      </div>

      {/* Quick access to saved + reservations */}
      <div className="ls-quick">
        <Link href="/dashboard/luxury-services/saved" className="ls-quick__card">
          <span className="ls-quick__t">❤️ My Saved Services</span>
          <span className="ls-quick__b">{savedCount ? `${savedCount} saved for later` : "Save flights, hotels, restaurants & more"}</span>
        </Link>
        <Link href="/dashboard/luxury-services/reservations" className="ls-quick__card">
          <span className="ls-quick__t">🧾 My Reservations</span>
          <span className="ls-quick__b">{reservations.length ? `${reservations.length} request${reservations.length > 1 ? "s" : ""}` : "Your requests will appear here"}</span>
        </Link>
      </div>

      {recent.length > 0 && (
        <section className="sec">
          <div className="sec__h" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="sec__t">Recent requests</h2>
            <Link href="/dashboard/luxury-services/reservations" className="ls-link">View all →</Link>
          </div>
          <div className="ls-reslist">
            {recent.map((r) => {
              const meta = RESERVATION_STATUS[r.status];
              return (
                <Link key={r.id} href={`/dashboard/luxury-services/reservations/${r.id}`} className="ls-resrow">
                  <span className="ls-resrow__title">{r.title}</span>
                  <span className={`cx-badge cx-badge--${meta.tone}`}>{meta.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Branded service grid */}
      <section className="sec" id="mm-services">
        <div className="sec__h"><h2 className="sec__t">Explore Luxury Services</h2></div>
        <div className="ls-grid">
          {SERVICE_CATEGORIES.map((s) => (
            <Link key={s.id} href={`/dashboard/luxury-services/${s.id}`} className="ls-card">
              <div className="ls-card__top">
                <span className="ls-card__icon" aria-hidden="true">{s.icon}</span>
                <span className={`cx-badge cx-badge--${s.connection}`}>{connectionLabel(s.connection)}</span>
              </div>
              <h3 className="ls-card__t">{s.brandedLabel}</h3>
              <p className="ls-card__b">{s.description}</p>
              <span className="ls-card__go">Get started →</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="note" style={{ marginTop: "1.6rem" }}>
        Journey helps, the Concierge Team assists, and you always stay in control. Prices, availability, and confirmations are only ever shown from a real connected provider — and every booking goes through Purchase Review before any payment.
      </p>
    </>
  );
}
