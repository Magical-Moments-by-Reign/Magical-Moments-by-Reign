import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { VENDOR_CATEGORIES, BECOME_A_VENDOR, VENDOR_NOTICE } from "@/lib/vendors";
import "./vendors.css";

export const metadata: Metadata = {
  title: "Vendor Marketplace — Become a Vendor",
  description:
    "Connect with families celebrating life's biggest moments. Discover trusted vendors — or join the Magical Moments Vendor Marketplace.",
};

export default function VendorsPage() {
  return (
    <div className="vm">
      <SiteNav active="vendors" />
      <main className="vm-main">
        {/* Hero */}
        <header className="vm-hero">
          <div className="vm-inner">
            <span className="vm-eyebrow">Vendor Marketplace</span>
            <h1 className="vm-title">Become a Vendor</h1>
            <p className="vm-tagline">{BECOME_A_VENDOR.tagline}</p>
            <Link href="/vendors/apply" className="btn-gold vm-cta">{BECOME_A_VENDOR.cta}</Link>
          </div>
        </header>

        <div className="vm-inner vm-body">
          {/* Browse filters (shell — live results need approved vendors + storage) */}
          <section className="vm-browse" aria-labelledby="vm-browse-h">
            <h2 id="vm-browse-h" className="vm-h2">Browse Vendors</h2>
            <form className="vm-filters" role="search" aria-label="Filter vendors">
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
            </form>

            {/* Honest empty state — no invented vendors before real listings exist. */}
            <div className="vm-empty" role="status">
              <p className="vm-empty__lead">Our Vendor Marketplace is launching soon.</p>
              <p className="vm-empty__sub">
                Trusted businesses are being welcomed now. Are you a vendor? Be among the first families discover.
              </p>
              <Link href="/vendors/apply" className="btn-outline-gold">{BECOME_A_VENDOR.cta}</Link>
            </div>
          </section>

          {/* Categories */}
          <section className="vm-cats" aria-labelledby="vm-cats-h">
            <h2 id="vm-cats-h" className="vm-h2">Vendor Categories</h2>
            <ul className="vm-cats__grid">
              {VENDOR_CATEGORIES.map((c) => <li key={c.id}>{c.label}</li>)}
            </ul>
            <p className="vm-cats__note">…and additional categories added over time.</p>
          </section>

          {/* Become a Vendor */}
          <section className="vm-join" aria-labelledby="vm-join-h">
            <h2 id="vm-join-h" className="vm-h2">{BECOME_A_VENDOR.headline}</h2>
            <p className="vm-join__body">{BECOME_A_VENDOR.body}</p>
            <Link href="/vendors/apply" className="btn-gold vm-cta">{BECOME_A_VENDOR.cta}</Link>
          </section>

          {/* Vendor Notice */}
          <section className="vm-notice" aria-label="Vendor Notice">
            <h3 className="vm-notice__title">{VENDOR_NOTICE.title}</h3>
            <p className="vm-notice__text">{VENDOR_NOTICE.text}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
