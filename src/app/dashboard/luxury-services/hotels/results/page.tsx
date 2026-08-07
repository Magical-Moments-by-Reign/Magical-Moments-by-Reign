import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { searchHotels, type HotelSummary } from "@/lib/reservations/hotels";
import { requestHotelAction, saveHotelAction } from "../../actions";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hotel results", robots: { index: false } };

const AMENITIES = ["Pool", "Free WiFi", "Spa", "Restaurant", "Free parking", "Breakfast included", "Beach access"];

function fmtMoney(m?: { amount: number; currency: string }): string | null {
  if (!m) return null;
  const sym = m.currency === "USD" ? "$" : `${m.currency} `;
  return `${sym}${m.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function HotelCard({ h, sample, carry }: { h: HotelSummary; sample: boolean; carry: Record<string, string> }) {
  const hidden = {
    provider: h.provider, propertyId: h.id, name: h.name, city: h.city ?? "",
    pricePerNight: h.pricePerNight ? String(h.pricePerNight.amount) : "",
    totalPrice: h.totalPrice ? String(h.totalPrice.amount) : "",
    sample: sample ? "1" : "0",
    checkIn: carry.checkIn ?? "", checkOut: carry.checkOut ?? "", guests: carry.guests ?? "",
  };
  const detailHref = `/dashboard/luxury-services/hotels/property/${encodeURIComponent(h.id)}?provider=${encodeURIComponent(h.provider)}`;
  return (
    <article className="rc">
      {h.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="rc__photo" src={h.thumbnail} alt={h.name} loading="lazy" />
      ) : <div className="rc__photo rc__photo--empty" aria-hidden="true">🏨</div>}
      <div className="rc__body">
        <h3 className="rc__name">{h.name}</h3>
        <p className="rc__meta">
          {h.starRating && <span>{"★".repeat(Math.round(h.starRating))}</span>}
          {typeof h.guestRating === "number" && <span className="rc__rating">{h.guestRating.toFixed(1)}/10{h.reviewCount ? ` (${h.reviewCount})` : ""}</span>}
        </p>
        {h.address && <p className="rc__addr">{h.address}</p>}
        {h.amenities.length > 0 && <p className="rc__meta">{h.amenities.slice(0, 4).join(" · ")}</p>}
        {fmtMoney(h.pricePerNight) && (
          <p className="ho-price">{fmtMoney(h.pricePerNight)}<span> / night</span>{fmtMoney(h.totalPrice) && <span className="ho-total"> · {fmtMoney(h.totalPrice)} total</span>}</p>
        )}
        <div className="rc__actions">
          <Link href={detailHref} className="btn btn--sm btn--ghost">Details</Link>
          <form action={requestHotelAction}>
            {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button type="submit" className="btn btn--sm btn--gold">Request Concierge Assistance</button>
          </form>
          <form action={saveHotelAction}>
            {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button type="submit" className="btn btn--sm btn--ghost">Save</button>
          </form>
        </div>
      </div>
    </article>
  );
}

export default async function HotelResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await requireAccount("/dashboard/luxury-services/hotels");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const many = (k: string): string[] => (Array.isArray(sp[k]) ? (sp[k] as string[]) : sp[k] ? [sp[k] as string] : []);

  const location = get("location");
  const carry = { checkIn: get("checkIn"), checkOut: get("checkOut"), guests: get("guests") };
  const stars = many("stars").map((s) => parseInt(s, 10)).filter(Number.isFinite);
  const amenities = many("amenity");
  const minPrice = get("minPrice") ? parseInt(get("minPrice"), 10) : undefined;
  const maxPrice = get("maxPrice") ? parseInt(get("maxPrice"), 10) : undefined;
  const sortBy = (get("sort") || "recommended") as "recommended";

  const header = (
    <div className="pg-head">
      <Link href="/dashboard/luxury-services/hotels?path=search" className="cx-back">← New hotel search</Link>
      <span className="pg-eyebrow">🏨 Magical Moments Hotels</span>
      <h1 className="pg-title">{location ? `Hotels in ${location}` : "Hotel results"}</h1>
    </div>
  );

  if (!location.trim()) {
    return (<>{header}<div className="cx-empty"><p>Tell us where you&apos;d like to stay to see hotels.</p><Link href="/dashboard/luxury-services/hotels?path=search" className="btn btn--gold">Start a search</Link></div></>);
  }

  const result = await searchHotels({ location, checkIn: carry.checkIn || undefined, checkOut: carry.checkOut || undefined, guests: carry.guests ? parseInt(carry.guests, 10) : undefined, starRatings: stars.length ? stars : undefined, amenities: amenities.length ? amenities : undefined, minPrice, maxPrice, sortBy, userId: account.id });

  // Live provider reachable but nothing matched → honest empty message.
  if (result && !result.sample && result.hotels.length === 0) {
    return (<>{header}<div className="cx-empty"><p>No hotels were found matching your search.</p><Link href="/dashboard/luxury-services/hotels?path=search" className="btn btn--gold">Adjust your search</Link></div></>);
  }
  if (!result) {
    return (<>{header}<div className="cx-empty"><p>We couldn&apos;t reach the hotel provider just now. Our Concierge Team can help.</p><OpenConciergeButton className="btn btn--gold" seed={`Please help me find a hotel in ${location}.`}>Ask the Concierge</OpenConciergeButton></div></>);
  }

  // A GET filter form that preserves the search + refines it.
  const filterForm = (
    <form action="/dashboard/luxury-services/hotels/results" className="ho-filters">
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="checkIn" value={carry.checkIn} />
      <input type="hidden" name="checkOut" value={carry.checkOut} />
      <input type="hidden" name="guests" value={carry.guests} />
      <div className="ho-filterrow">
        <label className="cx-field"><span className="cx-field__label">Sort by</span>
          <select name="sort" defaultValue={sortBy}>
            <option value="recommended">Recommended</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
            <option value="rating">Guest rating</option>
            <option value="stars">Star rating</option>
          </select>
        </label>
        <label className="cx-field"><span className="cx-field__label">Min $/night</span><input name="minPrice" type="number" defaultValue={get("minPrice")} placeholder="0" /></label>
        <label className="cx-field"><span className="cx-field__label">Max $/night</span><input name="maxPrice" type="number" defaultValue={get("maxPrice")} placeholder="1000" /></label>
      </div>
      <div className="ls-filtergroup"><span className="ls-filtergroup__t">Star rating</span><div className="ls-chips">
        {[3, 4, 5].map((s) => <label key={s} className="ls-chip"><input type="checkbox" name="stars" value={s} defaultChecked={stars.includes(s)} /> {s}★</label>)}
      </div></div>
      <div className="ls-filtergroup"><span className="ls-filtergroup__t">Amenities</span><div className="ls-chips">
        {AMENITIES.map((a) => <label key={a} className="ls-chip"><input type="checkbox" name="amenity" value={a} defaultChecked={amenities.includes(a)} /> {a}</label>)}
      </div></div>
      <button type="submit" className="btn btn--sm btn--gold">Apply filters</button>
    </form>
  );

  return (
    <>
      {header}
      {result.sample ? (
        <div className="cx-honest" style={{ marginTop: 0 }}>
          <strong>Sample results.</strong> Live hotel availability isn&apos;t connected yet, so these are example hotels shaped exactly like Expedia&apos;s live data — not real availability or pricing. Requesting assistance sends a concierge request; nothing is booked or charged. When Expedia goes live, real results appear here automatically.
        </div>
      ) : (
        <p className="rc-attrib">Showing {result.hotels.length} of {result.total} · {result.attribution}. Prices and availability are provided by {result.provider} and are subject to change until booked. Every booking goes through Purchase Review.</p>
      )}
      {filterForm}
      {result.hotels.length === 0 ? (
        <div className="cx-empty"><p>No hotels were found matching your search.</p></div>
      ) : (
        <div className="rc-grid">
          {result.hotels.map((h) => <HotelCard key={h.id} h={h} sample={result.sample} carry={carry} />)}
        </div>
      )}
    </>
  );
}
