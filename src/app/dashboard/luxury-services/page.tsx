import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { listReservations } from "@/lib/reservations/service";
import { listSaved } from "@/lib/reservations/saved";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "./luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Luxury Services", robots: { index: false } };

// ── Curated Collections ──────────────────────────────────────────
// Each collection keeps its existing service route. All twelve photos are
// now cropped from the Owner's uploaded marketing artwork
// (public/luxury/collections/*).
type Collection = { category: string; title: string; desc: string; href: string; img: string };
const COLLECTIONS: Collection[] = [
  { category: "Flights", title: "Private & Commercial Flights", desc: "First-class journeys and private charter, arranged beautifully.", href: "/dashboard/luxury-services/flights", img: "/luxury/collections/flights.jpg" },
  { category: "Hotels & Resorts", title: "Luxury Hotels & Resorts", desc: "Exceptional stays in the world’s most memorable places.", href: "/dashboard/luxury-services/hotels", img: "/luxury/collections/hotels.jpg" },
  { category: "Dining", title: "Fine Dining", desc: "Beautiful tables, remarkable cuisine, and warm hospitality.", href: "/dashboard/luxury-services/restaurants", img: "/luxury/collections/dining.jpg" },
  { category: "Travel", title: "Signature Getaways", desc: "Thoughtful escapes shaped around the way you love to travel.", href: "/dashboard/luxury-services/vacation-packages", img: "/luxury/collections/travel.jpg" },
  { category: "Transportation", title: "Luxury Transportation", desc: "Private drivers and polished arrivals, wherever you are going.", href: "/dashboard/luxury-services/transportation", img: "/luxury/collections/transportation.jpg" },
  { category: "Cruises", title: "Ocean & River Cruises", desc: "Unhurried voyages through extraordinary destinations.", href: "/dashboard/luxury-services/cruises", img: "/luxury/collections/cruises.jpg" },
  { category: "Private Stays", title: "Private Villas & Homes", desc: "Beautiful private spaces for gathering, resting, and celebrating.", href: "/dashboard/luxury-services/vacation-homes", img: "/luxury/collections/private-stays.jpg" },
  { category: "Experiences", title: "Events & Experiences", desc: "Special access and unforgettable evenings, thoughtfully arranged.", href: "/dashboard/luxury-services/experiences", img: "/luxury/collections/experiences.jpg" },
  { category: "Gifting", title: "Flowers & Gifts", desc: "Elegant gestures chosen and delivered with care.", href: "/dashboard/luxury-services/flowers-gifts", img: "/luxury/collections/gifts.jpg" },
  { category: "Storytelling", title: "Photography & Videography", desc: "Quietly beautiful storytelling for life’s defining moments.", href: "/dashboard/luxury-services/photography", img: "/luxury/collections/photography.jpg" },
  { category: "Wellness", title: "Wellness & Spa Retreats", desc: "Restorative experiences in serene, exceptional surroundings.", href: "/dashboard/luxury-services/wellness", img: "/luxury/collections/wellness.jpg" },
  { category: "Leisure", title: "Golf Experiences", desc: "Remarkable courses, private access, and effortless days away.", href: "/dashboard/luxury-services/custom", img: "/luxury/collections/golf.jpg" },
];

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
          <p className="lx-hero__eyebrow">LUXURY, CURATED FOR YOU</p>
          <h1 className="lx-hero__title">Luxury Services</h1>
          <p className="lx-hero__sub">Extraordinary experiences, thoughtfully arranged.</p>
          <p className="lx-hero__lede">Explore independently, plan with Journey, or let our concierge take care of the details.</p>
        </div>
        <div className="lx-hero__photo" aria-hidden="true" />
      </section>

      {/* ── THREE PATHS ──────────────────────────────────────── */}
      <nav className="lx-paths" aria-label="Luxury service planning options">
        <div className="lx-path">
          <span className="lx-path__icon" aria-hidden="true">◇</span>
          <span className="lx-path__t">Explore</span>
          <span className="lx-path__d">Discover luxury experiences at your own pace.</span>
          <a href="#lx-collections" className="lx-path__go">Explore Services →</a>
        </div>
        <div className="lx-path">
          <span className="lx-path__icon" aria-hidden="true">✦</span>
          <span className="lx-path__t">Journey AI</span>
          <span className="lx-path__d">Tell Journey what you have in mind.</span>
          <OpenConciergeButton className="lx-path__go" seed="I'd like Journey's help planning something special. Here's what I have in mind:">Start Planning →</OpenConciergeButton>
        </div>
        <div className="lx-path">
          <span className="lx-path__icon" aria-hidden="true">◇</span>
          <span className="lx-path__t">Private Concierge</span>
          <span className="lx-path__d">Let us coordinate every detail for you.</span>
          <OpenConciergeButton className="lx-path__go" seed="I'd like a member of the Concierge team to help me with a Luxury Services request:">Request Concierge →</OpenConciergeButton>
        </div>
      </nav>

      {/* ── CURATED COLLECTIONS ──────────────────────────────── */}
      <section className="lx-collections" id="lx-collections">
        <div className="lx-sec__head">
          <span><span className="lx-sec__eyebrow">CURATED FOR EVERY JOURNEY</span><h2 className="lx-sec__title">Luxury Experience Collection</h2></span>
          <span className="lx-quicklinks">
            <Link href="/dashboard/luxury-services/saved" className="lx-quicklink">My Saved{saved.length ? ` (${saved.length})` : ""}</Link>
            <Link href="/dashboard/luxury-services/reservations" className="lx-quicklink">My Reservations{reservations.length ? ` (${reservations.length})` : ""}</Link>
          </span>
        </div>
        <div className="lx-colgrid">
          {COLLECTIONS.map((c) => (
            <Link key={c.title} href={c.href} className="lx-col">
              <span className="lx-col__img" style={{ backgroundImage: `url(${c.img})` }} />
              <span className="lx-col__body">
                <span className="lx-col__category">{c.category}</span>
                <span className="lx-col__t">{c.title}</span>
                <span className="lx-col__d">{c.desc}</span>
                <span className="lx-col__go">Explore →</span>
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
