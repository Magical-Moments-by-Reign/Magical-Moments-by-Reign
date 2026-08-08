import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getServiceCategory, intakeFor, pathsFor, RESTAURANT_FILTERS, type IntakeField, type ServicePath } from "@/lib/reservations/catalog";
import { restaurantDiscoveryConfigured } from "@/lib/reservations/providers";
import HotelDestinationInput from "@/components/luxury/HotelDestinationInput";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import { createRequestAction, saveServiceAction } from "../actions";
import "../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Luxury Services", robots: { index: false } };

type Svc = NonNullable<ReturnType<typeof getServiceCategory>>;

// ── Per-service luxury hero (elegant title, subtitle, and imagery) ──
// `img` uses photography we already ship; the rest render an on-brand
// gradient. Drop a file at an img path to make that hero photographic.
const HERO: Record<string, { title: string; sub: string; img?: string; tint?: [string, string] }> = {
  flights: { title: "Take Flight in Comfort", sub: "First class, private charter, or the perfect connection — thoughtfully arranged. Nothing is booked or charged until you review every detail.", tint: ["#4a3320", "#241610"] },
  hotels: { title: "Rest in Extraordinary Places", sub: "Boutique escapes, iconic destinations, and unforgettable stays — explore, save, or hand the details to our concierge.", tint: ["#46311f", "#241710"] },
  restaurants: { title: "Reserve an Extraordinary Table", sub: "Discover acclaimed restaurants, hidden gems, and unforgettable dining experiences. Your table is only confirmed after our team reviews and personally confirms every detail.", img: "/gallery/italy/12-trattoria.jpg" },
  "vacation-packages": { title: "Journeys Curated End to End", sub: "The whole trip — flights, stays, and the moments in between — designed around what you'll remember forever.", img: "/gallery/italy/03-positano.jpg" },
  "rental-cars": { title: "The Keys to the Open Road", sub: "The right vehicle, ready when you arrive. We source real options and confirm every detail with you first.", tint: ["#3d3526", "#201a10"] },
  cruises: { title: "Set Sail in Style", sub: "Luxury voyages and expedition adventures to unforgettable destinations, arranged with care.", tint: ["#2f4553", "#16232c"] },
  "vacation-homes": { title: "A Home Away From Home", sub: "Exclusive homes for families, celebrations, and extended stays — space for everyone to gather.", img: "/journeys/home/vacation.jpg" },
  entertainment: { title: "Nights to Remember", sub: "Shows, tickets, and unforgettable nights. Tell us the occasion and we'll help you find the moment.", tint: ["#4b3721", "#251810"] },
  experiences: { title: "Unforgettable Experiences", sub: "The once-in-a-lifetime moments you'll talk about for years — sourced and confirmed by our team.", img: "/gallery/karlie/12-celebration.jpg" },
  "flowers-gifts": { title: "The Perfect Gesture", sub: "Thoughtful gifts, floral arrangements, and elegant surprises, delivered with care.", img: "/gallery/smith/04-bouquet.jpg" },
  transportation: { title: "Arrive in Comfort", sub: "Executive vehicles, chauffeurs, and airport transfers — on time, every time.", tint: ["#3d3526", "#201a10"] },
  photography: { title: "Keep the Moment Forever", sub: "Professional photographers and cinematic storytelling for life's biggest moments.", tint: ["#4b3721", "#251810"] },
  "event-services": { title: "Every Detail, Handled", sub: "Everything the occasion needs, coordinated by a team that treats it like their own.", tint: ["#46311f", "#241710"] },
  wellness: { title: "Rest, Restore, Renew", sub: "Spa retreats and wellness escapes to help you look and feel your very best.", tint: ["#3a4a35", "#1e2a1a"] },
  custom: { title: "Anything You Can Imagine", sub: "If it can be arranged, our concierge will find a way. Tell us what you have in mind.", tint: ["#4a3320", "#241610"] },
};

function heroFor(svc: Svc) {
  return HERO[svc.id] ?? { title: svc.brandedLabel, sub: svc.description, tint: ["#2f2015", "#17100a"] as [string, string] };
}

const TRUST = [
  { ic: "💎", t: "Handpicked Selections", d: "Curated by our team for exceptional quality." },
  { ic: "🤝", t: "Personally Confirmed", d: "Every reservation is reviewed before it's confirmed." },
  { ic: "🛎️", t: "Concierge Assisted", d: "We handle the details so you can simply enjoy." },
  { ic: "🔒", t: "Secure & Private", d: "Your information is always protected." },
];

// Shared luxury chrome: breadcrumb → image hero → content card → trust bar.
function Shell({ svc, children }: { svc: Svc; children: ReactNode }) {
  const h = heroFor(svc);
  const [a, b] = h.tint ?? ["#2f2015", "#17100a"];
  const bg = h.img ? `url(${h.img})` : `linear-gradient(135deg, ${a}, ${b})`;
  return (
    <>
      <nav className="lxp-crumb">
        <Link href="/dashboard/luxury-services">← Luxury Services</Link>
        <span aria-hidden="true">⤳</span>
        <b>{svc.brandedLabel}</b>
      </nav>
      <header className="lxp-hero" style={{ backgroundImage: bg }}>
        <h1 className="lxp-hero__title">{h.title}</h1>
        <div className="lxp-hero__rule">✦ ✦ ✦</div>
        <p className="lxp-hero__sub">{h.sub}</p>
      </header>
      <div className="lxp-card">{children}</div>
      <div className="lxp-trust">
        {TRUST.map((x) => (
          <div key={x.t} className="lxp-trust__item">
            <span className="lxp-trust__ic" aria-hidden="true">{x.ic}</span>
            <span>
              <span className="lxp-trust__t">{x.t}</span>
              <span className="lxp-trust__d">{x.d}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function Field({ f }: { f: IntakeField }) {
  const id = `f_${f.key}`;
  return (
    <label className="cx-field" htmlFor={id}>
      <span className="cx-field__label">{f.label}{f.required ? " *" : ""}</span>
      {f.type === "textarea" ? (
        <textarea id={id} name={f.key} required={f.required} placeholder={f.placeholder} rows={3} />
      ) : f.type === "select" ? (
        <select id={id} name={f.key} defaultValue="">
          <option value="" disabled>Select…</option>
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={id} name={f.key} type={f.type} required={f.required} placeholder={f.placeholder} />
      )}
    </label>
  );
}

export default async function ServicePage({
  params, searchParams,
}: {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { service } = await params;
  const { path: rawPath } = await searchParams;
  await requireAccount(`/dashboard/luxury-services/${service}`);
  const svc = getServiceCategory(service);
  if (!svc) notFound();

  const offered = pathsFor(svc);
  const path = (rawPath && (offered as string[]).includes(rawPath) ? rawPath : undefined) as ServicePath | undefined;
  // Restaurants become truly connected once a discovery provider (Yelp) is wired.
  const liveDiscovery = svc.id === "restaurants" && restaurantDiscoveryConfigured();
  const notConnected = svc.connection !== "connected" && !liveDiscovery;

  // ── Choice screen — the client always chooses first ──
  if (!path) {
    return (
      <Shell svc={svc}>
        <h2 className="lxp-card__h">How would you like to begin?</h2>
        <p className="lxp-card__p">Whether you&apos;d like to explore on your own or have Journey help you find exactly the right thing — it&apos;s entirely your call.</p>
        <div className="ls-choice">
          {offered.includes("search") && (
            <Link href={`/dashboard/luxury-services/${service}?path=search`} className="ls-choice__card">
              <span className="ls-choice__icon">🔍</span>
              <span className="ls-choice__t">Search {svc.label} Myself</span>
              <span className="ls-choice__b">Explore options on your own.</span>
            </Link>
          )}
          <Link href={`/dashboard/luxury-services/${service}?path=help`} className="ls-choice__card">
            <span className="ls-choice__icon">✨</span>
            <span className="ls-choice__t">Help Me Find the Perfect {svc.label}</span>
            <span className="ls-choice__b">Answer a few questions and Journey will guide you.</span>
          </Link>
          <OpenConciergeButton className="ls-choice__card ls-choice__card--btn" seed={`I'd like the Concierge team to help me with ${svc.brandedLabel}.`}>
            <span className="ls-choice__icon">👤</span>
            <span className="ls-choice__t">Ask the Concierge</span>
            <span className="ls-choice__b">Hand it to our team — we&apos;ll take it from here.</span>
          </OpenConciergeButton>
        </div>
      </Shell>
    );
  }

  // Hotels: self-serve search goes to the Expedia/Hotelbeds-backed results page.
  if (service === "hotels" && path === "search") {
    return (
      <Shell svc={svc}>
        <form action="/dashboard/luxury-services/hotels/results" className="cx-form">
          <div className="cx-form__grid">
            <HotelDestinationInput />
            <label className="cx-field"><span className="cx-field__label">Check-in</span><input name="checkIn" type="date" /></label>
            <label className="cx-field"><span className="cx-field__label">Check-out</span><input name="checkOut" type="date" /></label>
            <label className="cx-field"><span className="cx-field__label">Guests</span><input name="guests" type="number" placeholder="2" /></label>
          </div>
          <div className="cx-honest">Hotel results, prices, and availability come only from our connected provider and are subject to change until booked. Nothing is booked or charged until you review it in Purchase Review.</div>
          <div className="cx-form__actions">
            <button type="submit" className="btn btn--gold">Search Hotels</button>
            <Link href="/dashboard/luxury-services/hotels?path=help" className="btn btn--ghost">Help me find a stay instead</Link>
          </div>
        </form>
        <p className="lxp-cardlink"><Link href="/dashboard/luxury-services/hotels/reservations" className="ls-link">View my hotel reservations →</Link></p>
      </Shell>
    );
  }

  const fields = intakeFor(service, path);
  const submit = createRequestAction.bind(null, service, path);
  const save = saveServiceAction.bind(null, service);
  const isRestaurantSearch = service === "restaurants" && path === "search";

  return (
    <Shell svc={svc}>
      {service === "flights" && path === "search" && (
        <p className="note" style={{ marginBottom: "1rem" }}>Looking for the whole trip? <Link href="/dashboard/luxury-services/vacation-packages?path=help" className="ls-link">Price a Vacation Package →</Link></p>
      )}

      {liveDiscovery && path === "search" ? (
        // Live restaurant discovery (Yelp connected): a real search → results.
        <form action="/dashboard/luxury-services/restaurants/results" className="cx-form">
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Where are you dining? *</span><input name="location" required placeholder="City, neighborhood, or address" /></label>
            <label className="cx-field"><span className="cx-field__label">Cuisine or keywords</span><input name="term" placeholder="e.g. Italian, steakhouse, sushi" /></label>
            <label className="cx-field"><span className="cx-field__label">Date</span><input name="date" type="date" /></label>
            <label className="cx-field"><span className="cx-field__label">Time</span><input name="time" type="time" /></label>
            <label className="cx-field"><span className="cx-field__label">Guests</span><input name="guests" type="number" placeholder="2" /></label>
            <label className="cx-field"><span className="cx-field__label">Price</span>
              <select name="price" defaultValue=""><option value="">Any Price</option><option value="$">$</option><option value="$$">$$</option><option value="$$$">$$$</option><option value="$$$$">$$$$</option></select>
            </label>
            <label className="cx-field"><span className="cx-field__label">Sort by</span>
              <select name="sort" defaultValue="best_match"><option value="best_match">Best Match</option><option value="rating">Rating</option><option value="review_count">Most reviewed</option><option value="distance">Distance</option></select>
            </label>
            <label className="cx-field"><span className="cx-field__label">Open now</span><span className="ls-chip"><input type="checkbox" name="open" value="1" /> Only show open now</span></label>
          </div>
          <div className="cx-honest">Live results are provided by Yelp and may change. Reserving a table sends a request to our concierge — nothing is booked or charged until confirmed, and every purchase goes through Purchase Review.</div>
          <div className="cx-form__actions">
            <button type="submit" className="btn btn--gold">Search Restaurants</button>
            <Link href="/dashboard/luxury-services/restaurants?path=help" className="btn btn--ghost">Help me choose instead</Link>
          </div>
        </form>
      ) : (
        <form action={submit} className="cx-form">
          <div className="cx-form__grid">
            {fields.map((f) => <Field key={f.key} f={f} />)}
          </div>

          {isRestaurantSearch && (
            <div className="ls-filters">
              <p className="ls-filters__intro">Refine your search:</p>
              {RESTAURANT_FILTERS.map((g) => (
                <div key={g.id} className="ls-filtergroup">
                  <span className="ls-filtergroup__t">{g.label}</span>
                  <div className="ls-chips">
                    {g.options.map((o) => (
                      <label key={o} className="ls-chip">
                        <input type="checkbox" name={`filter_${g.id}`} value={o} /> {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HONESTY: no live provider is connected — we never show fake results,
              prices, availability, ratings, or confirmation numbers. */}
          <div className="cx-honest">
            {notConnected ? (
              <>This service isn&apos;t connected to a live provider yet, so we won&apos;t show prices, availability, or ratings we can&apos;t verify. Submit your request and our Concierge Team will gladly source real options — you&apos;ll review and approve everything, and no payment happens without Purchase Review.</>
            ) : (
              <>Prices and availability come from our partners and are subject to change until purchased. You&apos;ll always review everything in Purchase Review before any payment.</>
            )}
          </div>

          <div className="cx-form__actions">
            <button type="submit" className="btn btn--gold">{notConnected ? "Send to Concierge" : "Search"}</button>
            <button type="submit" formAction={save} className="btn btn--ghost">Save for Later</button>
            <button type="submit" name="_action" value="draft" className="btn btn--ghost">Save as draft</button>
          </div>
        </form>
      )}
    </Shell>
  );
}
