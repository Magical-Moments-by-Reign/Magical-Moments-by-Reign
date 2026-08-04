import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import "./get-started.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Get Started — Magical Moments by Reign",
  description: "Take a guided tour of everything Magical Moments offers — explore at your own pace before you ever create an account.",
};

// The Get Started discovery experience — part of the PUBLIC website. It is not
// a signup form: it invites visitors to explore before deciding. Each card
// leads to a real section; account creation ("Create Your Space") comes only
// at the end of the journey.
interface Card { title: string; desc: string; href: string; icon: ReactElement }

const CARDS: Card[] = [
  { title: "Inspiration", desc: "Daily motivation, affirmations, and beautiful content to keep you inspired and aligned.", href: "/inspiration",
    icon: <><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" /><path d="M18.5 4 L19 6 L21 6.5 L19 7 L18.5 9 L18 7 L16 6.5 L18 6 Z" /></> },
  { title: "Memberships & Pricing", desc: "Find the perfect plan for you or your family. Flexible options for every chapter of life.", href: "/pricing",
    icon: <><path d="M4 8 L7.5 11 L12 5 L16.5 11 L20 8 L18.5 18 H5.5 Z" /></> },
  { title: "Build Your Membership", desc: "Customize your experience and choose the features that fit your lifestyle.", href: "/membership",
    icon: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /><path d="M18 4l.7 1.8L20.5 6.5 18.7 7.2 18 9l-.7-1.8L15.5 6.5 17.3 5.8Z" /></> },
  { title: "Business Edition", desc: "Powerful tools and resources designed for entrepreneurs, professionals, and teams.", href: "/business",
    icon: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /></> },
  { title: "Vendor Network", desc: "Connect with trusted vendors and partners to bring your vision to life.", href: "/vendors",
    icon: <><path d="M3 12l3-3 4 3 2-1 3 3-2 2-3-2" /><path d="M14 8l3-2 4 4-2 2" /></> },
  { title: "Experiences", desc: "Celebrate every occasion with curated ideas, planning tools, and unforgettable moments.", href: "/experiences",
    icon: <><path d="M12 21V11" /><path d="M12 11c-3-4-7-3-8.5-1M12 11c3-4 7-3 8.5-1" /></> },
  { title: "Success Stories", desc: "Real stories from members who are living their best and creating magical moments.", href: "/success-stories",
    icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" /> },
  { title: "FAQs", desc: "Get answers to common questions and learn how Magical Moments works.", href: "/faqs",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 1.8-2 3.2" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></> },
  { title: "Why Choose Us", desc: "Discover what makes Magical Moments different from everything else.", href: "/about",
    icon: <path d="M12 3 L14.5 9 L21 9.5 L16 13.8 L17.5 20 L12 16.6 L6.5 20 L8 13.8 L3 9.5 L9.5 9 Z" /> },
  { title: "Create Your Space", desc: "Ready to begin? Create your Magical Space and start building your legacy.", href: "/signup",
    icon: <><path d="M12 21s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 12c0 4.7-7 9-7 9z" /><path d="M12 9v5M9.5 11.5h5" /></> },
];

const TRUST = [
  { t: "Your Privacy Matters", s: "Bank-level security to keep your memories safe.", icon: <><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></> },
  { t: "Access Anywhere", s: "Your Magical Space is always with you.", icon: <><path d="M6 16a5 5 0 0 1 1-9.9A6 6 0 0 1 19 8a4 4 0 0 1 0 8" /><path d="M12 12v6M9.5 15.5 12 13l2.5 2.5" /></> },
  { t: "Made with Love", s: "Thoughtfully designed for life's most meaningful moments.", icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" /> },
  { t: "We're Here for You", s: "Real support from real people whenever you need us.", icon: <><path d="M5 13a7 7 0 0 1 14 0" /><rect x="3.5" y="13" width="3.5" height="6" rx="1.5" /><rect x="17" y="13" width="3.5" height="6" rx="1.5" /></> },
];

export default async function GetStartedPage() {
  const account = await currentAccount();
  const signedIn = Boolean(account);

  return (
    <div className="gs">
      <PublicNav active="get-started" signedIn={signedIn} />

      <section className="gs-hero">
        <div className="gs-hero__l">
          <span className="gs-hero__eye">Get Started</span>
          <h1 className="gs-hero__t">Begin Your <i>Magical</i> Journey</h1>
          <p className="gs-hero__s">Discover everything Magical Moments has to offer and build a space that celebrates your life, your memories, and your dreams.</p>
          <a href="#explore" className="gs-hero__cta">Explore All Features <span aria-hidden="true">→</span></a>
          <span className="gs-hero__note">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L13.5 9 L19 10 L13.5 11 L12 17 L10.5 11 L5 10 L10.5 9 Z" /></svg>
            No commitment. Explore at your own pace.
          </span>
        </div>
        <div className="gs-hero__r" aria-hidden="true" />
      </section>

      <section className="gs-sec" id="explore">
        <h2 className="gs-sec__t">Everything <i>Magical</i>, All in One Place</h2>
        <div className="gs-sec__d" aria-hidden="true" />
        <p className="gs-sec__s">Explore each section below to see how we help you create, organize, and celebrate life&apos;s most important moments.</p>
        <div className="gs-grid">
          {CARDS.map((c) => (
            <Link key={c.title} href={c.href} className="gs-card">
              <span className="gs-card__ic"><svg viewBox="0 0 24 24" aria-hidden="true">{c.icon}</svg></span>
              <h3 className="gs-card__t">{c.title}</h3>
              <p className="gs-card__s">{c.desc}</p>
              <span className="gs-card__go">Explore <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <div className="gs-band">
        <div>
          <h3 className="gs-band__t">Your story is unique. <i>Your magical space should be too.</i></h3>
          <p className="gs-band__s">Take your time, explore, and get inspired. When you&apos;re ready, we&apos;ll be here to help you create something unforgettable.</p>
        </div>
        <Link href={signedIn ? "/home" : "/signup"} className="gs-band__cta">
          {signedIn ? "Enter your Space" : "Start Exploring"} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="gs-trust">
        {TRUST.map((t) => (
          <div key={t.t} className="gs-tr">
            <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
            <div><b>{t.t}</b><span>{t.s}</span></div>
          </div>
        ))}
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
