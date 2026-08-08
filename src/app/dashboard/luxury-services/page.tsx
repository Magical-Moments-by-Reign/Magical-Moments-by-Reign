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
const FEATURED: { name: string; img: string; href: string }[] = [
  { name: "Amalfi Coast", img: "/gallery/italy/03-positano.jpg", href: "/dashboard/luxury-services/vacation-packages" },
  { name: "Tuscan Wine Country", img: "/gallery/italy/13-tuscansunset.jpg", href: "/dashboard/luxury-services/vacation-packages" },
  { name: "Italian Fine Dining", img: "/gallery/italy/12-trattoria.jpg", href: "/dashboard/luxury-services/restaurants" },
  { name: "Island Getaways", img: "/story/vacation.jpg", href: "/dashboard/luxury-services/vacation-packages" },
  { name: "Destination Weddings", img: "/gallery/smith/07-sunset.jpg", href: "/dashboard/luxury-services/experiences" },
  { name: "Romantic Escapes", img: "/journeys/relationship/romantic-experiences.jpg", href: "/dashboard/luxury-services/hotels" },
];

// ── Curated Collections ──────────────────────────────────────────
// Each links to a real service flow. `img` uses photography we already
// ship; the rest render an on-brand plate with the category icon. Drop a
// file at any `img` path to make that tile photographic.
type Collection = { title: string; desc: string; href: string; action: string; icon: string; img?: string; tint?: [string, string] };
const COLLECTIONS: Collection[] = [
  { title: "Private & Commercial Flights", desc: "Whether first class or private charter, arrive beautifully.", href: "/dashboard/luxury-services/flights", action: "Explore Flights", icon: "✈️", tint: ["#4a3320", "#271a10"] },
  { title: "Luxury Hotels & Resorts", desc: "Boutique escapes, iconic destinations, and unforgettable stays.", href: "/dashboard/luxury-services/hotels", action: "Find Your Stay", icon: "🏨", tint: ["#46311f", "#241710"] },
  { title: "Fine Dining", desc: "Michelin stars, hidden gems, rooftop lounges, and unforgettable culinary experiences.", href: "/dashboard/luxury-services/restaurants", action: "Reserve a Table", icon: "🍽️", img: "/gallery/italy/12-trattoria.jpg" },
  { title: "Signature Getaways", desc: "Curated itineraries designed around the moments you'll remember forever.", href: "/dashboard/luxury-services/vacation-packages", action: "Explore Packages", icon: "🌅", img: "/gallery/italy/03-positano.jpg" },
  { title: "Luxury Transportation", desc: "Executive vehicles, limousines, chauffeurs, and airport transfers.", href: "/dashboard/luxury-services/transportation", action: "Arrange Transportation", icon: "🚙", tint: ["#3d3526", "#201a10"] },
  { title: "Ocean & River Cruises", desc: "Luxury voyages, expedition adventures, and unforgettable destinations.", href: "/dashboard/luxury-services/cruises", action: "Browse Cruises", icon: "🛳️", tint: ["#2f4553", "#16232c"] },
  { title: "Private Villas & Homes", desc: "Exclusive homes for families, celebrations, and extended stays.", href: "/dashboard/luxury-services/vacation-homes", action: "View Homes", icon: "🏡", img: "/journeys/home/vacation.jpg" },
  { title: "Events & Experiences", desc: "Concerts, Broadway, sporting events, VIP access, and unforgettable nights.", href: "/dashboard/luxury-services/experiences", action: "Discover Events", icon: "🎭", img: "/gallery/karlie/12-celebration.jpg" },
  { title: "Flowers & Gifts", desc: "Thoughtful gifts, floral arrangements, and elegant surprises delivered with care.", href: "/dashboard/luxury-services/flowers-gifts", action: "Send a Gift", icon: "💐", img: "/gallery/smith/04-bouquet.jpg" },
  { title: "Photography & Videography", desc: "Professional photographers and cinematic storytelling for life's biggest moments.", href: "/dashboard/luxury-services/photography", action: "Book a Photographer", icon: "📸", tint: ["#4b3721", "#251810"] },
  { title: "Wellness & Spa Retreats", desc: "Rejuvenate your mind, body, and soul in the world's most incredible locations.", href: "/dashboard/luxury-services/wellness", action: "Explore Retreats", icon: "💆", tint: ["#3a4a35", "#1e2a1a"] },
  { title: "Golf Experiences", desc: "World-class courses, private access, and unforgettable rounds.", href: "/dashboard/luxury-services/custom", action: "Book a Tee Time", icon: "⛳", tint: ["#3d4a2a", "#1f2a12"] },
];

function collectionImgStyle(c: Collection): CSSProperties {
  if (c.img) {
    return { backgroundImage: `linear-gradient(180deg, rgba(30,20,12,0), rgba(30,20,12,.18)), url(${c.img})` };
  }
  const [a, b] = c.tint ?? ["#3a281a", "#241610"];
  return { backgroundImage: `linear-gradient(135deg, ${a}, ${b})` };
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
              <span className="lx-feat__img" style={{ backgroundImage: `url(${f.img})` }} />
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
              <span className="lx-col__img" style={collectionImgStyle(c)}>
                {!c.img && <span className="lx-col__icon" aria-hidden="true">{c.icon}</span>}
              </span>
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
