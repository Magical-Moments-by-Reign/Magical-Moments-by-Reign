import type { Metadata } from "next";
import Link from "next/link";
import ScrollCue from "@/components/site/ScrollCue";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import "./about-story.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About — Our Story",
  description:
    "How Magical Moments by Reign began — one place to plan, celebrate, and preserve life's biggest moments. Founded by Tabitha Turner.",
};

export default async function AboutPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="abs">
      <PublicNav active="about" signedIn={signedIn} />

      <div className="abs-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="abs-logo" src="/brand/logo-champagne.png" alt="Magical Moments by Reign" width={170} height={170} />
        <span className="abs-eyebrow">Our Story</span>
        <h1 className="abs-title">About Magical Moments by Reign</h1>
        <div className="abs-rule" aria-hidden="true" />
        <ScrollCue />

        <p className="abs-p">Magical Moments by Reign was created from one simple belief: life&apos;s biggest moments deserve one place to be planned, celebrated, and preserved.</p>
        <p className="abs-p">Our platform brings together life&apos;s most meaningful journeys—from weddings, babies, homes, vacations, graduations, businesses, and beyond—into one organized experience.</p>
        <p className="abs-p">We exist to reduce stress, save time, protect memories, and help families stay ahead through every chapter of life.</p>
        <p className="abs-p">More than a platform, Magical Moments by Reign is your family&apos;s digital home for today, tomorrow, and generations to come.</p>

        {/* Pillars */}
        <div className="abs-pillars">
          <div className="abs-pillar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" /></svg>
            <b>Capture</b><span>every memory</span>
          </div>
          <span className="abs-pillar__div" aria-hidden="true" />
          <div className="abs-pillar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /><path d="M12 12.3l.85 1.75 1.95.28-1.4 1.37.33 1.94L12 16.9l-1.73.72.33-1.94-1.4-1.37 1.95-.28z" /></svg>
            <b>Celebrate</b><span>every milestone</span>
          </div>
          <span className="abs-pillar__div" aria-hidden="true" />
          <div className="abs-pillar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><rect x="9.5" y="11" width="5" height="4.5" rx="1" /><path d="M10.6 11v-1a1.4 1.4 0 0 1 2.8 0v1" /></svg>
            <b>Cherish</b><span>forever</span>
          </div>
        </div>

        <Link href="/get-started" className="abs-cta">Explore Magical Moments <span aria-hidden="true">✦</span></Link>

        {/* The founder's origin story — real, authentic brand content */}
        <section className="abs-origin">
          <h2 className="abs-origin__h">How it began</h2>
          <p>Before Magical Moments by Reign was a platform… it was an idea. An idea born from watching life move faster than people can keep up with.</p>
          <p>Families are busy. Parents are overwhelmed. Important moments pass too quickly. Important documents get misplaced. Photos stay trapped on old phones. Memories fade. Life keeps moving.</p>
          <p>Magical Moments by Reign exists for one simple reason: <strong>to help people stay ahead while preserving what matters most.</strong> Not because technology is the goal — but because <em>peace of mind is.</em></p>
          <p className="abs-quote">&ldquo;How can we make life a little easier today?&rdquo;</p>
          <div className="abs-sign">
            <span className="abs-sign__name">Tabitha Turner</span>
            <span className="abs-sign__role">Founder &amp; Visionary</span>
            <span className="abs-sign__role">Magical Moments by Reign</span>
          </div>
        </section>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
