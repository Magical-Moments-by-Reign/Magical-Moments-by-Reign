import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import "./legacy.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Legacy & Memories — Magical Moments by Reign",
  description: "Preserve your family's story — the people, the places, and the memories made along the way — treasured today and remembered forever.",
};

const PILLARS = [
  { t: "Our Story", s: "Gather the moments, milestones, and voices that make your family who you are." },
  { t: "Treasured Today", s: "Keep photos, letters, and keepsakes beautifully organized and always at hand." },
  { t: "Remembered Forever", s: "Pass it all down — your past, your present, and their future — in one lasting place." },
];

export default async function LegacyPage() {
  const account = await currentAccount();
  const signedIn = Boolean(account);

  return (
    <div className="lg">
      <PublicNav active={null} signedIn={signedIn} />

      <section className="lg-hero">
        <div className="lg-hero__media" aria-hidden="true" />
        <div className="lg-hero__scrim" aria-hidden="true" />
        <div className="lg-hero__in">
          <span className="lg-hero__eye">Legacy &amp; Memories</span>
          <h1 className="lg-hero__t">Treasured today.<br /><i>Remembered forever.</i></h1>
          <p className="lg-hero__s">The best things in life are the people we love, the places we&rsquo;ve been, and the memories we&rsquo;ve made along the way. Keep them all in one beautiful place.</p>
          <div className="lg-hero__cta">
            <Link href={signedIn ? "/dashboard/create" : "/get-started"} className="lg-btn lg-btn--gold">Begin your Legacy</Link>
            <Link href="/experiences" className="lg-btn">Explore Journeys</Link>
          </div>
        </div>
      </section>

      <section className="lg-pillars">
        {PILLARS.map((p) => (
          <div key={p.t} className="lg-pillar">
            <span className="lg-pillar__mark" aria-hidden="true">✦</span>
            <h3>{p.t}</h3>
            <p>{p.s}</p>
          </div>
        ))}
      </section>

      <section className="lg-band">
        <div className="lg-band__in">
          <h2>Every family has a story worth keeping.</h2>
          <p>From the earliest photographs to the milestones still to come, Legacy &amp; Memories keeps your family&rsquo;s story safe, private, and always yours — ready to share with the people who matter most.</p>
          <Link href={signedIn ? "/dashboard/media" : "/membership"} className="lg-btn lg-btn--gold">{signedIn ? "Open My Memories" : "View Memberships"}</Link>
        </div>
      </section>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
