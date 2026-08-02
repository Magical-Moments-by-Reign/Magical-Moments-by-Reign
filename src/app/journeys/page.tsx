import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import OccasionIcon from "@/components/OccasionIcon";
import { EXPERIENCE_TYPES } from "@/lib/experience-types";
import { STORY_PHOTOS } from "@/lib/story-photos";
import { journeyDuration } from "@/lib/journey-preview";
import { getPlan, formatPrice } from "@/lib/plans";
import "./journeys.css";

const START_PRICE = getPlan("silver")?.price ?? 249; // 1-year unlock
const LIFETIME_PRICE = getPlan("lifetime")?.price ?? 2499;

export const metadata: Metadata = {
  title: "Explore the Journeys",
  description:
    "Take a guided tour of every Magical Moments by Reign Journey before you decide — weddings, babies, vacations, new homes, graduations, celebrations of life, and more.",
};

export default function JourneysIndexPage() {
  return (
    <div className="jxi">
      <SiteNav active="experiences" />
      <header className="jxi-hero">
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Explore before you decide</span>
          <h1>Take a guided tour of every Journey</h1>
          <p>Click any Journey to explore everything included — with Magical AI as your guide, a sample website, planning timeline, and pricing — before you add it to your cart.</p>
        </div>
      </header>

      <main className="container jxi-main">
        <div className="jxi-grid">
          {EXPERIENCE_TYPES.map((t) => {
            const photo = STORY_PHOTOS[t.id];
            const style = { "--c1": t.gradient[0], "--c2": t.gradient[1] } as CSSProperties;
            return (
              <Link key={t.id} href={`/journeys/${t.id}`} className="jxi-card" style={style}>
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="jxi-card__photo" src={photo} alt="" aria-hidden="true" loading="lazy" />
                )}
                <span className="jxi-card__scrim" />
                <span className="jxi-card__icon"><OccasionIcon name={t.icon} size={26} /></span>
                <span className="jxi-card__body">
                  <span className="jxi-card__dur">{journeyDuration(t.id)}</span>
                  <span className="jxi-card__label">{t.label}</span>
                  <span className="jxi-card__desc">{t.description}</span>
                  <span className="jxi-card__price">Unlock from {formatPrice(START_PRICE)} · Lifetime {formatPrice(LIFETIME_PRICE)}</span>
                  <span className="jxi-card__cta">✦ Preview Journey →</span>
                </span>
              </Link>
            );
          })}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
