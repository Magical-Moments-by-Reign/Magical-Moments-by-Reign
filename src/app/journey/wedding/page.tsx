import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import WeddingJourney from "@/components/wedding/WeddingJourney";
import "./wedding.css";

export const metadata: Metadata = {
  title: "Wedding Journey — From Yes… to I Do.",
  description:
    "A calm, guided wedding planning experience from Magical Moments by Reign — a personalized roadmap, checklist, countdown, and budget, all in one place.",
};

export default function WeddingJourneyPage() {
  return (
    <div className="wjp">
      <SiteNav />
      <header className="wjp-hero">
        <div className="container">
          <span className="eyebrow wjp-hero__eyebrow">Wedding Journey</span>
          <h1>From <em>Yes…</em> to <em>I Do.</em></h1>
          <p>Not just a wedding website — a calm, guided planning experience that grows with you, from engagement into married life.</p>
        </div>
      </header>
      <main className="container wjp-main">
        <WeddingJourney />
      </main>
      <SiteFooter />
    </div>
  );
}
