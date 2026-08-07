import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { restaurantProvider, type RestaurantSummary } from "@/lib/reservations/providers";
import { reserveRestaurantAction, saveRestaurantAction } from "../../actions";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Restaurant results", robots: { index: false } };

function miles(m?: number): string | null {
  if (typeof m !== "number") return null;
  return `${(m / 1609.34).toFixed(1)} mi`;
}

function priceToLevels(p?: string): number[] | undefined {
  if (!p) return undefined;
  return [p.length];
}

function Card({ b, carry }: { b: RestaurantSummary; carry: Record<string, string> }) {
  const hidden = {
    businessId: b.id, name: b.name, provider: "Yelp",
    address: b.address ?? "", phone: b.phone ?? "", providerUrl: b.providerUrl ?? "",
    priceLevel: b.priceLevel ?? "", rating: b.rating ? String(b.rating) : "",
    categories: b.categories.join(", "),
    date: carry.date ?? "", time: carry.time ?? "", guests: carry.guests ?? "",
  };
  return (
    <article className="rc">
      {b.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="rc__photo" src={b.imageUrl} alt={b.name} loading="lazy" />
      ) : <div className="rc__photo rc__photo--empty" aria-hidden="true">🍽️</div>}
      <div className="rc__body">
        <h3 className="rc__name">{b.name}</h3>
        <p className="rc__meta">
          {b.priceLevel && <span>{b.priceLevel}</span>}
          {b.categories.length > 0 && <span>{b.categories.slice(0, 3).join(" · ")}</span>}
        </p>
        <p className="rc__meta">
          {typeof b.rating === "number" && <span className="rc__rating">★ {b.rating.toFixed(1)}{b.reviewCount ? ` (${b.reviewCount})` : ""}</span>}
          {miles(b.distanceMeters) && <span>{miles(b.distanceMeters)}</span>}
          {b.isClosed && <span className="rc__closed">Closed now</span>}
        </p>
        {b.address && <p className="rc__addr">{b.address}</p>}
        <div className="rc__actions">
          <Link href={`/dashboard/luxury-services/restaurants/business/${encodeURIComponent(b.id)}`} className="btn btn--sm btn--ghost">Details</Link>
          <form action={reserveRestaurantAction}>
            {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button type="submit" className="btn btn--sm btn--gold">Request Concierge Assistance</button>
          </form>
          <form action={saveRestaurantAction}>
            {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button type="submit" className="btn btn--sm btn--ghost">Save</button>
          </form>
        </div>
      </div>
    </article>
  );
}

export default async function RestaurantResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAccount("/dashboard/luxury-services/restaurants");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const location = get("location");
  const term = get("term");
  const carry = { date: get("date"), time: get("time"), guests: get("guests") };

  const provider = restaurantProvider();

  const header = (
    <div className="pg-head">
      <Link href="/dashboard/luxury-services/restaurants?path=search" className="cx-back">← New search</Link>
      <span className="pg-eyebrow">🍽️ Magical Moments Restaurants</span>
      <h1 className="pg-title">{location ? `Restaurants in ${location}` : "Restaurant results"}</h1>
    </div>
  );

  // No provider connected → honest message + concierge path. Never fake results.
  if (!provider) {
    return (
      <>
        {header}
        <div className="cx-empty">
          <p>This restaurant provider isn&apos;t currently connected. Our Concierge Team may still be able to assist you.</p>
          <OpenConciergeButton className="btn btn--gold" seed={`Please help me find a restaurant${location ? ` in ${location}` : ""}.`}>Ask the Concierge</OpenConciergeButton>
        </div>
      </>
    );
  }

  if (!location.trim()) {
    return (<>{header}<div className="cx-empty"><p>Tell us where you&apos;d like to dine to see results.</p><Link href="/dashboard/luxury-services/restaurants?path=search" className="btn btn--gold">Start a search</Link></div></>);
  }

  const result = await provider.search({ location, term: term || undefined, price: priceToLevels(get("price")), openNow: get("open") === "1", sortBy: (get("sort") as "best_match") || undefined, limit: 20 });

  if (!result || result.businesses.length === 0) {
    return (
      <>
        {header}
        <div className="cx-empty">
          <p>{result ? "No matching restaurants came back for that search." : "We couldn't reach the restaurant provider just now."} You can adjust your search or ask our Concierge Team to help.</p>
          <OpenConciergeButton className="btn btn--gold" seed={`Please help me find a restaurant in ${location}.`}>Ask the Concierge</OpenConciergeButton>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <p className="rc-attrib">Showing {result.businesses.length} of {result.total} results · {result.attribution}. Prices, ratings, and details are provided by {result.provider} and may change. Reserving sends a request to our concierge — nothing is booked or charged until confirmed.</p>
      <div className="rc-grid">
        {result.businesses.map((b) => <Card key={b.id} b={b} carry={carry} />)}
      </div>
    </>
  );
}
