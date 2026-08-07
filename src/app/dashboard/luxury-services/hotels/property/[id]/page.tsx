import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { hotelProviderForId, hotelDiscoveryConfigured, type Money } from "@/lib/reservations/hotels";
import { requestHotelAction, saveHotelAction } from "../../../actions";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import ShareButton from "@/components/luxury/ShareButton";
import "../../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hotel", robots: { index: false } };

function fmtMoney(m?: Money): string | null {
  if (!m) return null;
  const sym = m.currency === "USD" ? "$" : `${m.currency} `;
  return `${sym}${m.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function HotelPropertyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ provider?: string }>;
}) {
  const { id } = await params;
  const { provider: providerName } = await searchParams;
  const account = await requireAccount(`/dashboard/luxury-services/hotels/property/${id}`);
  const provider = hotelProviderForId(providerName);
  if (!provider) notFound();

  const h = await provider.details(id, { location: "", userId: account.id });
  if (!h) notFound();

  const sample = !hotelDiscoveryConfigured();
  const mapHref = h.latitude && h.longitude ? `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}` : h.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address)}` : undefined;
  const hidden: Record<string, string> = {
    provider: h.provider, propertyId: h.id, name: h.name, city: h.city ?? "",
    pricePerNight: h.pricePerNight ? String(h.pricePerNight.amount) : "",
    totalPrice: h.totalPrice ? String(h.totalPrice.amount) : "",
    sample: sample ? "1" : "0",
  };

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services/hotels?path=search" className="cx-back">← Hotels</Link>
        <span className="pg-eyebrow">🏨 Magical Moments Hotels</span>
        <h1 className="pg-title">{h.name}</h1>
        <p className="rc__meta">
          {h.starRating && <span>{"★".repeat(Math.round(h.starRating))}</span>}
          {typeof h.guestRating === "number" && <span className="rc__rating">{h.guestRating.toFixed(1)}/10{h.reviewCount ? ` (${h.reviewCount} reviews)` : ""}</span>}
          {fmtMoney(h.pricePerNight) && <span className="ho-price">{fmtMoney(h.pricePerNight)} / night</span>}
        </p>
      </div>

      {sample && (
        <div className="cx-honest" style={{ marginTop: 0 }}>
          <strong>Sample hotel.</strong> This is example data shaped exactly like Expedia&apos;s live API — not real availability or pricing. When Expedia goes live, this page shows the real property. Requesting assistance sends a concierge request; nothing is booked or charged here.
        </div>
      )}

      {h.images.length > 0 && (
        <div className="rb-photos">
          {h.images.slice(0, 6).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p} alt={`${h.name} ${i + 1}`} loading="lazy" />
          ))}
        </div>
      )}

      {h.description && <p className="pg-sub">{h.description}</p>}

      <section className="sec cx-detail">
        {h.address && <div className="cx-drow"><span className="cx-drow__k">Address</span><span className="cx-drow__v">{h.address}</span></div>}
        {h.checkInTime && <div className="cx-drow"><span className="cx-drow__k">Check-in</span><span className="cx-drow__v">{h.checkInTime}</span></div>}
        {h.checkOutTime && <div className="cx-drow"><span className="cx-drow__k">Check-out</span><span className="cx-drow__v">{h.checkOutTime}</span></div>}
        {h.amenitiesFull.length > 0 && <div className="cx-drow"><span className="cx-drow__k">Amenities</span><span className="cx-drow__v">{h.amenitiesFull.join(" · ")}</span></div>}
      </section>

      {h.rooms.length > 0 && (
        <section className="sec">
          <div className="sec__h"><h2 className="sec__t">Rooms</h2></div>
          <div className="cx-detail">
            {h.rooms.map((r, i) => (
              <div key={i} className="cx-drow">
                <span className="cx-drow__k">{r.name}{r.refundable ? " · refundable" : ""}</span>
                <span className="cx-drow__v">{fmtMoney(r.price) ?? "Price on request"}{r.price ? " total" : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="cx-actionbar" style={{ marginTop: "1rem" }}>
        <form action={requestHotelAction}>
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button type="submit" className="btn btn--gold">Request Concierge Assistance</button>
        </form>
        <form action={saveHotelAction}>
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button type="submit" className="btn btn--ghost">Save for Later</button>
        </form>
        {mapHref && <a href={mapHref} target="_blank" rel="noreferrer" className="btn btn--ghost">Directions</a>}
        <ShareButton title={h.name} className="btn btn--ghost" />
      </div>

      {/* Hotel + Flight package preparation */}
      <section className="sec cx-pay" style={{ marginTop: "1.4rem" }}>
        <div className="sec__h"><h2 className="sec__t">Make it a package ✈ + 🏨</h2></div>
        <p className="cx-pay__intro">Add a flight and let Journey price a full Hotel + Flight package around this stay. We&apos;ll build a package request our concierge completes — nothing is booked until you review and approve it.</p>
        <Link href={`/dashboard/luxury-services/vacation-packages?path=help`} className="btn btn--gold">Build a Hotel + Flight Package</Link>
      </section>

      <p className="note" style={{ marginTop: ".8rem" }}>
        {provider.name} is our hotel discovery provider. Requesting assistance sends a concierge request; no reservation, confirmation number, or charge is created until a booking is completed through Purchase Review.
      </p>
    </>
  );
}
