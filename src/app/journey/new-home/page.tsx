import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import BuildHome from "@/components/newhome/BuildHome";
import "./new-home.css";

export const metadata: Metadata = {
  title: "Build a Home — New Home Journey",
  description:
    "A guided Build-a-Home experience from Magical Moments by Reign — from your first floor plan through construction, closing, and move-in, with a personalized roadmap and a 28-stage construction timeline.",
};

export default function BuildHomePage() {
  return (
    <div className="bhp">
      <SiteNav />
      <header className="bhp-hero">
        <div className="container">
          <span className="eyebrow bhp-hero__eyebrow">New Home Journey</span>
          <h1>Build a Home — <em>from blueprint to front-door key</em></h1>
          <p>From your first idea and floor plan through construction, final inspection, closing, and move-in — organized in one calm place that becomes the permanent history of your home.</p>
        </div>
      </header>
      <main className="container bhp-main">
        <BuildHome />
      </main>
      <SiteFooter />
    </div>
  );
}
