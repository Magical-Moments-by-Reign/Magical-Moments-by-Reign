import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { VENDOR_CATEGORIES, BECOME_A_VENDOR, VENDOR_NOTICE } from "@/lib/vendors";
import "./vendors-market.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Vendor Marketplace — Magical Moments by Reign",
  description:
    "Connect with families celebrating life's most meaningful moments. Discover trusted vendors — or join the Magical Moments Vendor Marketplace.",
};

// Featured categories shown as tiles (a curated subset of the full catalog),
// each with a champagne line icon. The full list lives in VENDOR_CATEGORIES.
const FEATURED: { label: string; match: string; icon: ReactElement }[] = [
  { label: "Wedding Venues", match: "wedding-venues", icon: <><circle cx="9" cy="13" r="3.4" /><circle cx="15" cy="13" r="3.4" /><path d="M9 8l1.3-2.5M15 8l-1.3-2.5" /></> },
  { label: "Photographers", match: "photographers", icon: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.4" /><path d="M8 7l1.5-2h5L16 7" /></> },
  { label: "Florists", match: "florists", icon: <><path d="M12 11c0-3 2-4 2-6 0 0-2 0-3 1.5C10 5 8 5 8 5c0 2 2 3 2 6" /><path d="M12 11v9M8.5 15c-2-1-4 .5-4 .5s1.5 2 3.5 1.5M15.5 15c2-1 4 .5 4 .5s-1.5 2-3.5 1.5" /></> },
  { label: "Cake Designers", match: "cake-designers", icon: <><path d="M4 21h16v-7H4z" /><path d="M4 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /><path d="M12 6v4M12 4v.01" /></> },
  { label: "Event Planners", match: "wedding-planners", icon: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10l1.5 1.5L13 9M9 15h6" /></> },
  { label: "Caterers", match: "caterers", icon: <><path d="M4 16h16M12 16V8" /><path d="M6 12a6 6 0 0 1 12 0z" /></> },
];

export default async function VendorsPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="vmk">
      <PublicNav active="get-started" signedIn={signedIn} />

      <div className="vmk-wrap">
        {/* Hero */}
        <header className="vmk-hero">
          <div>
            <span className="vmk-eye"><span aria-hidden="true">✦</span> Vendor Marketplace</span>
            <h1 className="vmk-h1">Connect with families celebrating life&apos;s <i>most meaningful moments.</i></h1>
            <div className="vmk-rule" aria-hidden="true" />
            <p className="vmk-hero__s">Join a trusted community of vendors and get discovered by families planning weddings, birthdays, baby showers, graduations, and more.</p>
            <div className="vmk-actions">
              <Link href="/vendors/apply" className="vmk-cta">{BECOME_A_VENDOR.cta} <span aria-hidden="true">+</span></Link>
              <a href="#how-it-works" className="vmk-how"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span> How it works</a>
            </div>
          </div>
          <div className="vmk-crest" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" />
          </div>
        </header>

        {/* Browse */}
        <section className="vmk-panel" aria-labelledby="vmk-browse">
          <h2 id="vmk-browse" className="vmk-panel__h">Browse Vendors</h2>
          <form className="vmk-filters" role="search" aria-label="Filter vendors" action="/vendors">
            <label>Category
              <select name="category" defaultValue="">
                <option value="">All categories</option>
                {VENDOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label>City <input type="text" name="city" placeholder="e.g. Dallas" /></label>
            <label>State <input type="text" name="state" placeholder="e.g. TX" maxLength={2} /></label>
            <label>Minimum rating
              <select name="minRating" defaultValue="">
                <option value="">Any</option>
                <option value="4">4★ &amp; up</option>
                <option value="4.5">4.5★ &amp; up</option>
              </select>
            </label>
            <button type="submit" className="vmk-search">Search <span aria-hidden="true">+</span></button>
          </form>

          <div className="vmk-cats">
            {FEATURED.map((c) => (
              <Link key={c.label} href={`/vendors?category=${c.match}`} className="vmk-ct">
                <svg viewBox="0 0 24 24" aria-hidden="true">{c.icon}</svg>
                <span>{c.label}</span>
              </Link>
            ))}
            <Link href="/vendors/apply" className="vmk-ct">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
              <span>View All Categories</span>
            </Link>
          </div>
          {/* Honest: no vendors are invented before real, approved listings exist. */}
          <p className="vmk-note">Our Vendor Marketplace is launching soon — trusted businesses are being welcomed now. Search results will appear here as vendors are approved.</p>
        </section>

        {/* For families / for vendors */}
        <section className="vmk-panel" id="how-it-works">
          <div className="vmk-two">
            <div>
              <div className="vmk-col__h">
                <span className="vmk-col__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" /></svg></span>
                <div><div className="vmk-col__t">For Families</div><div className="vmk-col__s">Find trusted vendors for every moment that matters.</div></div>
              </div>
              <ul className="vmk-list">
                <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg> Search and compare top-rated vendors</li>
                <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg> Read reviews from real customers</li>
                <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg> Book with confidence</li>
              </ul>
              <Link href="/vendors" className="vmk-col__cta">Browse Vendors <span aria-hidden="true">→</span></Link>
            </div>

            <div className="vmk-mid" aria-hidden="true">
              <span className="vmk-mid__mm">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/logo-champagne.png" alt="" /></span>
            </div>

            <div>
              <div className="vmk-col__h">
                <span className="vmk-col__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13z" /></svg></span>
                <div><div className="vmk-col__t">For Vendors</div><div className="vmk-col__s">Grow your business and be seen by families who value quality.</div></div>
              </div>
              <ul className="vmk-list">
                <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg> Get discovered by families planning celebrations</li>
                <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg> Showcase your work and services</li>
                <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg> Build your reputation and grow</li>
              </ul>
              <Link href="/vendors/apply" className="vmk-col__cta">Become a Vendor <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>

        {/* Vendor notice / disclaimer */}
        <section className="vmk-panel" aria-label="Vendor Notice">
          <div className="vmk-notice">
            <svg className="vmk-notice__shield" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><rect x="9" y="11" width="6" height="5" rx="1" /><path d="M10.2 11V9.8a1.8 1.8 0 0 1 3.6 0V11" /></svg>
            <div>
              <div className="vmk-notice__t">{VENDOR_NOTICE.title}</div>
              <p className="vmk-notice__x">Magical Moments by Reign provides this marketplace solely to connect customers with independent vendors. Vendors are responsible for their services, pricing, contracts, and customer experience.</p>
              <details>
                <summary>Read full disclaimer</summary>
                <p className="vmk-notice__full">{VENDOR_NOTICE.text}</p>
              </details>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="vmk-notice__mm" src="/brand/logo-champagne.png" alt="" />
          </div>
        </section>

        {/* Closing band */}
        <section className="vmk-band">
          <div>
            <h2 className="vmk-band__t">Be part of something magical.</h2>
            <p className="vmk-band__s">Help families create memories that last a lifetime.</p>
          </div>
          <Link href="/vendors/apply" className="vmk-cta">{BECOME_A_VENDOR.cta} <span aria-hidden="true">+</span></Link>
        </section>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
