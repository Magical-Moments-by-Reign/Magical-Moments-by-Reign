import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/guard";
import { verifyHotelbedsReadiness, hotelbedsBase } from "@/lib/reservations/hotels";
import "../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hotel provider status", robots: { index: false } };

// Owner-only diagnostic. Verifies Hotelbeds end-to-end: authentication →
// destination lookup → real availability → hotel content. Only when ALL pass is
// Hotelbeds labelled LIVE. Runs server-side; no API keys or secrets are shown.
export default async function ProviderStatusPage() {
  await requireOwner("/dashboard/luxury-services/hotels/provider-status");
  const readiness = await verifyHotelbedsReadiness("Miami");
  const tone = readiness.label === "LIVE" ? "success" : readiness.label === "NOT CONFIGURED" ? "not_connected" : "warn";

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services/hotels?path=search" className="cx-back">← Hotels</Link>
        <span className="pg-eyebrow">Owner diagnostic</span>
        <h1 className="pg-title">Hotel provider status</h1>
        <div className="cx-status-line">
          <span className={`cx-badge cx-badge--${tone}`}>Hotelbeds: {readiness.label}</span>
          <span className="cx-status-desc">{hotelbedsBase()}</span>
        </div>
        <p className="pg-sub">Hotelbeds is only labelled LIVE when authentication, destination lookup, availability, and content all succeed. No API keys or secrets are shown.</p>
      </div>

      <section className="sec cx-detail">
        {readiness.steps.map((s, i) => (
          <div key={i} className="cx-drow">
            <span className="cx-drow__k">{s.name} <span className={`cx-badge cx-badge--${s.ok ? "success" : "not_connected"}`}>{s.ok ? "OK" : "Failed"}</span></span>
            <span className="cx-drow__v">{s.detail}</span>
          </div>
        ))}
      </section>

      <p className="cx-honest">
        {readiness.label === "LIVE"
          ? "End-to-end verified: a human destination resolves to a real Hotelbeds code, availability returns live hotels, and content loads. Hotel search now shows live Hotelbeds results; empty responses honestly read “No hotels were found matching your search.” No sample inventory appears once Hotelbeds answers live."
          : "Until every step passes, Hotelbeds is TEST / CONNECTING. Members still see clearly-labelled sample results and can always reach the Concierge; live search is not trusted yet."}
      </p>
    </>
  );
}
