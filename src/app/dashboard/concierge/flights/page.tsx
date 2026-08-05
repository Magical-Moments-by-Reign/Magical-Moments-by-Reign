import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { duffelConfigured } from "@/lib/duffel";
import FlightSearch from "./FlightSearch";
import "./flights.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Flights — Concierge", robots: { index: false } };

export default async function FlightsPage() {
  await requireAccount("/dashboard/concierge/flights");
  const connected = duffelConfigured();

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow"><Link href="/dashboard/concierge" style={{ color: "inherit" }}>Concierge</Link> · Flights</span>
        <h1 className="pg-title">Flights</h1>
        <p className="pg-sub">Compare flights and reserve — your Concierge handles the details.</p>
      </div>

      {connected ? (
        <FlightSearch />
      ) : (
        <div className="empty">
          <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M2 16l20-7-9 13-2-6-9-0z" /></svg></div>
          <p className="empty__t">Flights aren&rsquo;t connected yet</p>
          <p className="empty__s">Once the flights provider key is added, search &amp; reservations turn on here automatically.</p>
        </div>
      )}
    </>
  );
}
