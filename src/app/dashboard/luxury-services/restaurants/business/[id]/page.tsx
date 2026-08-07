import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { restaurantProvider } from "@/lib/reservations/providers";
import { reserveRestaurantAction, saveRestaurantAction } from "../../../actions";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import ShareButton from "@/components/luxury/ShareButton";
import "../../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Restaurant", robots: { index: false } };

function fmtTime(t: string): string {
  if (!/^\d{4}$/.test(t)) return t;
  let h = parseInt(t.slice(0, 2), 10);
  const m = t.slice(2);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAccount(`/dashboard/luxury-services/restaurants/business/${id}`);
  const provider = restaurantProvider();

  const header = (
    <div className="pg-head">
      <Link href="/dashboard/luxury-services/restaurants?path=search" className="cx-back">← Restaurants</Link>
    </div>
  );

  if (!provider) {
    return (<>{header}<div className="cx-empty"><p>This restaurant provider isn&apos;t currently connected. Our Concierge Team may still be able to assist you.</p><OpenConciergeButton className="btn btn--gold" seed="Please help me with a restaurant.">Ask the Concierge</OpenConciergeButton></div></>);
  }

  const b = await provider.details(id);
  if (!b) notFound();

  const mapHref = b.latitude && b.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`
    : b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}` : undefined;

  const hidden: Record<string, string> = {
    businessId: b.id, name: b.name, provider: provider.name,
    address: b.address ?? "", phone: b.phone ?? "", providerUrl: b.providerUrl ?? "",
    priceLevel: b.priceLevel ?? "", rating: b.rating ? String(b.rating) : "", categories: b.categories.join(", "),
  };

  return (
    <>
      {header}
      <div className="pg-head">
        <span className="pg-eyebrow">🍽️ Magical Moments Restaurants</span>
        <h1 className="pg-title">{b.name}</h1>
        <p className="rc__meta">
          {b.priceLevel && <span>{b.priceLevel}</span>}
          {b.categories.length > 0 && <span>{b.categories.join(" · ")}</span>}
          {typeof b.rating === "number" && <span className="rc__rating">★ {b.rating.toFixed(1)}{b.reviewCount ? ` (${b.reviewCount})` : ""}</span>}
        </p>
      </div>

      {b.photos.length > 0 && (
        <div className="rb-photos">
          {b.photos.slice(0, 6).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p} alt={`${b.name} photo ${i + 1}`} loading="lazy" />
          ))}
        </div>
      )}

      <section className="sec cx-detail">
        {b.address && <div className="cx-drow"><span className="cx-drow__k">Address</span><span className="cx-drow__v">{b.address}</span></div>}
        {b.displayPhone && <div className="cx-drow"><span className="cx-drow__k">Phone</span><span className="cx-drow__v">{b.displayPhone}</span></div>}
        {(b.hoursText?.length ?? 0) > 0 ? (
          <div className="cx-drow"><span className="cx-drow__k">Hours</span><span className="cx-drow__v">{b.hoursText!.map((h, i) => <span key={i} style={{ display: "block" }}>{h}</span>)}</span></div>
        ) : b.hours.length > 0 ? (
          <div className="cx-drow"><span className="cx-drow__k">Hours</span><span className="cx-drow__v">{b.hours.map((h) => `${h.day} ${fmtTime(h.start)}–${fmtTime(h.end)}`).join(" · ")}</span></div>
        ) : null}
      </section>

      <p className="rc-attrib">Details, photos, ratings, and hours are provided by {provider.attribution.replace("Powered by ", "")} and may change. Reserving sends a request to our concierge — nothing is booked or charged until confirmed.</p>

      <div className="cx-actionbar" style={{ marginTop: "1rem" }}>
        <form action={reserveRestaurantAction}>
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button type="submit" className="btn btn--gold">Request Concierge Assistance</button>
        </form>
        <form action={saveRestaurantAction}>
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button type="submit" className="btn btn--ghost">Save for Later</button>
        </form>
        {mapHref && <a href={mapHref} target="_blank" rel="noreferrer" className="btn btn--ghost">Directions</a>}
        {b.website && <a href={b.website} target="_blank" rel="noreferrer" className="btn btn--ghost">Website</a>}
        {b.providerUrl && <a href={b.providerUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">View on {provider.name}</a>}
        <ShareButton title={b.name} className="btn btn--ghost" />
      </div>
      <p className="note" style={{ marginTop: ".8rem" }}>
        {provider.name} is our restaurant discovery provider — not a reservation system. Requesting assistance sends a concierge request; we never show a reservation time, table, or confirmation number until a real reservation provider confirms it.
      </p>
    </>
  );
}
