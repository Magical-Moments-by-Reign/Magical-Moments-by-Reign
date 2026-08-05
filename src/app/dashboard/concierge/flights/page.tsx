import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { duffelConfigured } from "@/lib/duffel";
import { getService, resolveStatus } from "@/lib/concierge/registry";
import FlightSearch from "./FlightSearch";
import "./flights.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Flights — Concierge", robots: { index: false } };

// Related services offered after a flight is selected. Status is resolved
// server-side so only genuinely connected services open a working flow.
const TRIP_IDS = ["hotels", "cars", "transportation", "dining", "event-tickets", "entertainment", "photography", "flowers", "cakes-desserts", "travel-insurance"];

export default async function FlightsPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAccount("/dashboard/concierge/flights");
  const connected = duffelConfigured();
  const sp = await searchParams;

  const prefill = {
    fromLabel: sp.fromLabel, fromIata: sp.from,
    toLabel: sp.toLabel, toIata: sp.to,
    depart: sp.depart, return: sp.return,
    adults: sp.adults ? Number(sp.adults) : undefined,
    cabin: sp.cabin,
    auto: sp.auto === "1",
  };

  const tripServices = TRIP_IDS.map((id) => {
    const s = getService(id);
    if (!s) return null;
    const status = resolveStatus(s);
    return { label: s.label, emoji: s.emoji, href: status === "live" || status === "test" ? s.href : undefined, status };
  }).filter(Boolean) as { label: string; emoji: string; href?: string; status: string }[];

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow"><Link href="/dashboard/concierge" style={{ color: "inherit" }}>Concierge</Link> · Flights</span>
        <h1 className="pg-title">Flights</h1>
        <p className="pg-sub">Tell me where you&rsquo;re headed — I&rsquo;ll compare the options and handle the details.</p>
      </div>

      {connected ? (
        <FlightSearch prefill={prefill} tripServices={tripServices} />
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
