import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/guard";
import { verifyHotelbedsAuth, hotelbedsBase } from "@/lib/reservations/hotels";
import { hotelDiscoveryConfigured } from "@/lib/reservations/hotels";
import "../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hotel provider status", robots: { index: false } };

// Owner-only diagnostic. Verifies Hotelbeds authentication by making a real
// request to the configured (test) environment — the first thing to confirm
// before trusting hotel search. Runs server-side; no credential is shown.
export default async function ProviderStatusPage() {
  await requireOwner("/dashboard/luxury-services/hotels/provider-status");
  const auth = await verifyHotelbedsAuth();

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services/hotels?path=search" className="cx-back">← Hotels</Link>
        <span className="pg-eyebrow">Owner diagnostic</span>
        <h1 className="pg-title">Hotel provider status</h1>
        <p className="pg-sub">Verifies live provider authentication. No API keys or secrets are ever displayed.</p>
      </div>

      <section className="sec cx-detail">
        <div className="cx-drow">
          <span className="cx-drow__k">Hotelbeds — authentication</span>
          <span className="cx-drow__v">
            <span className={`cx-badge cx-badge--${auth.ok ? "success" : "not_connected"}`}>{auth.ok ? "Authenticated" : "Not authenticated"}</span>
          </span>
        </div>
        <div className="cx-drow"><span className="cx-drow__k">Environment</span><span className="cx-drow__v">{auth.environment}</span></div>
        <div className="cx-drow"><span className="cx-drow__k">Endpoint</span><span className="cx-drow__v">{hotelbedsBase()}/hotel-api/1.0/status</span></div>
        {typeof auth.httpStatus === "number" && <div className="cx-drow"><span className="cx-drow__k">HTTP status</span><span className="cx-drow__v">{auth.httpStatus}</span></div>}
        <div className="cx-drow"><span className="cx-drow__k">Result</span><span className="cx-drow__v">{auth.message}</span></div>
        <div className="cx-drow"><span className="cx-drow__k">Live hotel discovery</span><span className="cx-drow__v">{hotelDiscoveryConfigured() ? "Enabled" : "Sample mode (no live credentials)"}</span></div>
      </section>

      <p className="cx-honest">
        {auth.ok
          ? "Authentication succeeded against the test environment. Hotel search can now be trusted to return live Hotelbeds data; empty responses honestly show “No hotels were found matching your search.”"
          : "Until authentication succeeds, hotel search must not be trusted for live data. Members still see clearly-labelled sample results and can always reach the Concierge."}
      </p>
    </>
  );
}
