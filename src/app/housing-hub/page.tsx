import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import OccasionIcon from "@/components/OccasionIcon";
import { HOUSING_PATHWAYS, HOUSING_TOOLS } from "@/lib/housing-hub";
import "./housing-hub.css";

export const metadata: Metadata = {
  title: "Housing Hub — your complete housing ecosystem",
  description:
    "Housing Hub from Magical Moments by Reign — search for land, buy, build, renovate, sell, lease, or manage property, all guided in one trusted place from beginning to end.",
};

export default function HousingHubPage() {
  return (
    <div className="hh">
      <SiteNav />
      <header className="hh-hero">
        <div className="container">
          <span className="eyebrow hh-hero__eyebrow">Housing Hub</span>
          <h1>Every housing milestone, <em>one trusted guide</em></h1>
          <p>Search for land, buy a home, build your dream, renovate, sell, lease, or manage property — organized, educated, and preserved from beginning to end. You should never have to search a dozen websites again.</p>
        </div>
      </header>

      <main className="container hh-main">
        <h2 className="hh-h2">Choose your path</h2>
        <div className="hh-grid">
          {HOUSING_PATHWAYS.map((p) => {
            const inner = (
              <>
                <span className="hh-card__icon"><OccasionIcon name={p.icon} size={28} /></span>
                <span className="hh-card__label">{p.label}</span>
                <span className="hh-card__blurb">{p.blurb}</span>
                <span className={`hh-card__status hh-card__status--${p.status}`}>
                  {p.status === "live" ? "Open now →" : "In development"}
                </span>
              </>
            );
            return p.href ? (
              <Link key={p.id} href={p.href} className="hh-card hh-card--live">{inner}</Link>
            ) : (
              <div key={p.id} className="hh-card hh-card--soon" aria-disabled="true">{inner}</div>
            );
          })}
        </div>

        <section className="hh-tools">
          <h2 className="hh-h2">Shared tools across every path</h2>
          <p className="hh-muted">These power every pathway. Being built out as Housing Hub grows — and gated behind real data &amp; partners so we never fake a listing, a partner, or a document.</p>
          <div className="hh-tools__grid">
            {HOUSING_TOOLS.map((t) => (
              <div key={t.id} className="hh-tool">
                <span className="hh-tool__label">{t.label}</span>
                <span className="hh-tool__blurb">{t.blurb}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="hh-disclaimer">Housing Hub organizes your journey, simplifies decisions, preserves every document, and connects you with trusted professionals. It provides organizational &amp; educational assistance — it does not replace licensed professionals, and it is not mortgage, legal, engineering, or construction advice.</p>

        <section className="hh-cta">
          <p>Ready to start building? <Link href="/journey/new-home">Open the Build-a-Home experience →</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
