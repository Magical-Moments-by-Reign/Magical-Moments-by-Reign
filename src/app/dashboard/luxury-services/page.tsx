import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { listReservations } from "@/lib/reservations/service";
import { listSaved } from "@/lib/reservations/saved";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "./luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Luxury Services", robots: { index: false } };

// ── Featured This Month ──────────────────────────────────────────
// Editorial inspiration. Real photography we already ship; each opens the
// relevant service flow. No prices or availability are implied here.
// Exact mockup names → image slots under /public/luxury/featured. Drop a
// matching .jpg at each path and the tile becomes photographic; until then a
// warm luxury gradient shows (never a broken image).
const FEATURED: { name: string; img: string; href: string }[] = [
  { name: "Maldives Escape", img: "/luxury/featured/maldives.jpg", href: "/dashboard/luxury-services/vacation-packages" },
  { name: "Christmas Markets", img: "/luxury/featured/christmas-markets.jpg", href: "/dashboard/luxury-services/vacation-packages" },
  { name: "Napa Valley Wine Tours", img: "/luxury/featured/napa.jpg", href: "/dashboard/luxury-services/experiences" },
  { name: "Broadway Week", img: "/luxury/featured/broadway.jpg", href: "/dashboard/luxury-services/experiences" },
  { name: "Hawaii Escape", img: "/luxury/featured/hawaii.jpg", href: "/dashboard/luxury-services/vacation-packages" },
  { name: "Monaco Grand Prix", img: "/luxury/featured/monaco.jpg", href: "/dashboard/luxury-services/experiences" },
];

// ── Curated Collections ──────────────────────────────────────────
// Each links to a real service flow. `img` uses photography we already
// ship; the rest render an on-brand plate with the category icon. Drop a
// file at any `img` path to make that tile photographic.
// Exact 12 collections from the mockup. Each points to an image slot under
// /public/luxury/collections; `tint` is the graceful fallback shown until the
// photo is uploaded (never a broken image).
type Collection = { title: string; desc: string; href: string; action: string; img: string; tint: [string, string] };
const COLLECTIONS: Collection[] = [
  { title: "Private & Commercial Flights", desc: "Whether first class or private charter, arrive beautifully.", href: "/dashboard/luxury-services/flights", action: "Explore Flights", img: "/luxury/collections/flights.jpg", tint: ["#4a3320", "#271a10"] },
  { title: "Luxury Hotels & Resorts", desc: "Boutique escapes, iconic destinations, and unforgettable stays.", href: "/dashboard/luxury-services/hotels", action: "Find Your Stay", img: "/luxury/collections/hotels.jpg", tint: ["#46311f", "#241710"] },
  { title: "Fine Dining", desc: "Michelin stars, hidden gems, rooftop lounges, and unforgettable culinary experiences.", href: "/dashboard/luxury-services/restaurants", action: "Reserve a Table", img: "/luxury/collections/dining.jpg", tint: ["#4a3320", "#241610"] },
  { title: "Signature Getaways", desc: "Curated itineraries designed around the moments you'll remember forever.", href: "/dashboard/luxury-services/vacation-packages", action: "Explore Packages", img: "/luxury/collections/getaways.jpg", tint: ["#46311f", "#241710"] },
  { title: "Luxury Transportation", desc: "Executive vehicles, limousines, chauffeurs, and airport transfers.", href: "/dashboard/luxury-services/transportation", action: "Arrange Transportation", img: "/luxury/collections/transportation.jpg", tint: ["#3d3526", "#201a10"] },
  { title: "Ocean & River Cruises", desc: "Luxury voyages, expedition adventures, and unforgettable destinations.", href: "/dashboard/luxury-services/cruises", action: "Browse Cruises", img: "/luxury/collections/cruises.jpg", tint: ["#2f4553", "#16232c"] },
  { title: "Private Villas & Homes", desc: "Exclusive homes for families, celebrations, and extended stays.", href: "/dashboard/luxury-services/vacation-homes", action: "View Homes", img: "/luxury/collections/villas.jpg", tint: ["#46311f", "#241710"] },
  { title: "Events & Experiences", desc: "Concerts, Broadway, sporting events, VIP access, and unforgettable nights.", href: "/dashboard/luxury-services/experiences", action: "Discover Events", img: "/luxury/collections/events.jpg", tint: ["#4b3721", "#251810"] },
  { title: "Flowers & Gifts", desc: "Thoughtful gifts, floral arrangements, and elegant surprises delivered with care.", href: "/dashboard/luxury-services/flowers-gifts", action: "Send a Gift", img: "/luxury/collections/flowers.jpg", tint: ["#4a2f3a", "#2a1720"] },
  { title: "Photography & Videography", desc: "Professional photographers and cinematic storytelling for life's biggest moments.", href: "/dashboard/luxury-services/photography", action: "Book a Photographer", img: "/luxury/collections/photography.jpg", tint: ["#4b3721", "#251810"] },
  { title: "Wellness & Spa Retreats", desc: "Rejuvenate your mind, body, and soul in the world's most incredible locations.", href: "/dashboard/luxury-services/wellness", action: "Explore Retreats", img: "/luxury/collections/wellness.jpg", tint: ["#3a4a35", "#1e2a1a"] },
  { title: "Golf Experiences", desc: "World-class courses, private access, and unforgettable rounds.", href: "/dashboard/luxury-services/custom", action: "Book a Tee Time", img: "/luxury/collections/golf.jpg", tint: ["#3d4a2a", "#1f2a12"] },
];

// Photo layered over a luxury gradient fallback — if the file isn't uploaded
// yet the gradient shows through, so the tile is always elegant, never broken.
function collectionImgStyle(c: Collection): CSSProperties {
  const [a, b] = c.tint;
  return { backgroundImage: `linear-gradient(180deg, rgba(30,20,12,0), rgba(30,20,12,.18)), url(${c.img}), linear-gradient(135deg, ${a}, ${b})` };
}

export default async function LuxuryServicesPage() {
  const account = await requireAccount("/dashboard/luxury-services");
  const [reservations, saved] = await Promise.all([
    listReservations(account.id).catch(() => []),
    listSaved(account.id).catch(() => []),
  ]);

  return (
    <div className="lx">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="lx-hero">
        <div className="lx-hero__text">
          <h1 className="lx-hero__title">Luxury Services</h1>
          <div className="lx-hero__rule">✦ ✦ ✦</div>
          <p className="lx-hero__eyebrow">Where unforgettable moments begin with extraordinary experiences</p>
          <p className="lx-hero__lede">
            Whether you&apos;re planning a romantic getaway, a family vacation, celebrating a milestone,
            or arranging the perfect surprise, Luxury Services brings together premium travel, dining,
            entertainment, transportation, and concierge planning — all in one beautifully curated experience.
          </p>
        </div>
        <div className="lx-hero__media" aria-hidden="true" />
      </section>

      {/* ── THREE PATHS ──────────────────────────────────────── */}
      <div className="lx-paths">
        <div className="lx-path">
          <span className="lx-path__icon" aria-hidden="true">🧭</span>
          <span className="lx-path__t">Explore</span>
          <span className="lx-path__d">Browse our curated collection of luxury experiences at your own pace.</span>
          <a href="#lx-collections" className="btn btn--gold">Explore Services →</a>
        </div>
        <div className="lx-path">
          <span className="lx-path__icon" aria-hidden="true">✨</span>
          <span className="lx-path__t">Journey AI</span>
          <span className="lx-path__d">Describe what you&apos;re planning, and Journey will create personalized recommendations just for you.</span>
          <OpenConciergeButton className="btn btn--gold" seed="I'd like Journey's help planning something special. Here's what I have in mind:">Start Planning →</OpenConciergeButton>
        </div>
        <div className="lx-path">
          <span className="lx-path__icon" aria-hidden="true">🛎️</span>
          <span className="lx-path__t">Private Concierge</span>
          <span className="lx-path__d">Let our concierge team coordinate every detail from beginning to end.</span>
          <OpenConciergeButton className="btn btn--gold" seed="I'd like a member of the Concierge team to help me with a Luxury Services request:">Request Concierge →</OpenConciergeButton>
        </div>
      </div>

      {/* Quick access to the member's own items */}
      <div className="lx-quicklinks">
        <Link href="/dashboard/luxury-services/saved" className="lx-quicklink">❤️ My Saved{saved.length ? ` (${saved.length})` : ""}</Link>
        <Link href="/dashboard/luxury-services/reservations" className="lx-quicklink">🧾 My Reservations{reservations.length ? ` (${reservations.length})` : ""}</Link>
      </div>

      {/* ── FEATURED THIS MONTH ──────────────────────────────── */}
      <section className="lx-sec">
        <div className="lx-sec__head">
          <span className="lx-sec__eyebrow">Featured This Month</span>
          <a href="#lx-collections" className="ls-link">View All Inspiration →</a>
        </div>
        <div className="lx-feat">
          {FEATURED.map((f) => (
            <Link key={f.name} href={f.href} className="lx-feat__c">
              <span className="lx-feat__img" style={{ backgroundImage: `url(${f.img}), linear-gradient(135deg, #2f2015, #17100a)` }} />
              <span className="lx-feat__cap">{f.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CURATED COLLECTIONS ──────────────────────────────── */}
      <section className="lx-collections" id="lx-collections">
        <div className="lx-sec__head">
          <span className="lx-sec__eyebrow">Curated Collections</span>
        </div>
        <div className="lx-colgrid">
          {COLLECTIONS.map((c) => (
            <Link key={c.title} href={c.href} className="lx-col">
              <span className="lx-col__img" style={collectionImgStyle(c)} />
              <span className="lx-col__body">
                <span className="lx-col__t">{c.title}</span>
                <span className="lx-col__d">{c.desc}</span>
                <span className="lx-col__go">{c.action} →</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PURCHASE-REVIEW PROMISE ──────────────────────────── */}
      <section className="lx-promise">
        <span className="lx-promise__icon" aria-hidden="true">🛡️</span>
        <div className="lx-promise__body">
          <span className="lx-promise__t">Every reservation is reviewed before purchase.</span>
          <p className="lx-promise__p">
            Your travel, reservations, tickets, and experiences are never automatically purchased. Journey reviews
            every detail with you before checkout, ensuring every Magical Moment is exactly as planned. Prices,
            availability, and confirmations are only ever shown from a real connected provider.
          </p>
        </div>
        <span className="lx-promise__sig">Journey<br /><i>by Reign</i></span>
      </section>
    </div>
  );
}
