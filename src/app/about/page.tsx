import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import "./about.css";

export const metadata: Metadata = {
  title: "About — Our Story",
  description:
    "How Magical Moments by Reign began — one place to plan, celebrate, and preserve life's biggest moments. Founded by Tabitha Turner.",
};

export default function AboutPage() {
  return (
    <div className="ab">
      <SiteNav active="about" />
      <main className="ab-main">
        <div className="ab-inner">
          {/* Logo at the top */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ab-logo" src="/brand/logo.png" alt="Magical Moments by Reign" width={260} height={260} />

          <span className="ab-eyebrow">Our Story</span>
          <h1 className="ab-title">About Magical Moments by Reign</h1>

          <p className="ab-lead">
            Magical Moments by Reign was created from one simple belief: life&apos;s biggest
            moments deserve one place to be planned, celebrated, and preserved. Our platform
            brings together life&apos;s most meaningful journeys—from weddings, babies, homes,
            vacations, graduations, businesses, and beyond—into one organized experience.
            We exist to reduce stress, save time, protect memories, and help families stay
            ahead through every chapter of life. More than a platform, Magical Moments by
            Reign is your family&apos;s digital home for today, tomorrow, and generations to come.
          </p>

          <div className="ab-divider" aria-hidden="true">✦</div>

          {/* How the vision started — the Founder's own words */}
          <section className="ab-origin">
            <h2 className="ab-h2">How it began</h2>
            <p>
              Before Magical Moments by Reign was a platform… it was an idea. An idea born
              from watching life move faster than people can keep up with.
            </p>
            <p>
              Families are busy. Parents are overwhelmed. Important moments pass too quickly.
              Important documents get misplaced. Photos stay trapped on old phones. Memories
              fade. Life keeps moving.
            </p>
            <p>
              Magical Moments by Reign exists for one simple reason: <strong>to help people
              stay ahead while preserving what matters most.</strong> Not because technology
              is the goal — but because <em>peace of mind is.</em>
            </p>
            <p className="ab-question">&ldquo;How can we make life a little easier today?&rdquo;</p>
          </section>

          {/* Founder signature */}
          <div className="ab-signoff">
            <span className="ab-sign">Tabitha Turner</span>
            <span className="ab-role">Founder &amp; Visionary</span>
            <span className="ab-role">Magical Moments by Reign</span>
          </div>

          <p className="ab-tag">Capture. Celebrate. Cherish Forever.</p>

          <div className="ab-cta">
            <Link href="/journeys" className="btn btn-gold">Explore the Journeys ✦</Link>
            <Link href="/create" className="btn btn-outline-gold">Start your story</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
