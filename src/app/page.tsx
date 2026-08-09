import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import "./landing.css";

export const dynamic = "force-dynamic";

const chapters = [
  ["♢", "Wedding"], ["♧", "Baby"], ["◇", "Graduation"], ["✈", "Travel"],
  ["⌂", "New Home"], ["♙", "Family"], ["✦", "Celebrations"], ["♧", "Legacy"],
];

const promises = [
  ["♢", "Private by design", "Your moments, your data, always protected."],
  ["▣", "Plan beautifully", "Smart tools to help you plan with ease."],
  ["♡", "Experience fully", "Live in the moment while we handle the details."],
  ["▤", "Preserve forever", "Memories organized and saved for generations."],
  ["♧", "Concierge service", "You ask. We handle the rest."],
];

export default async function LandingPage() {
  const signedIn = Boolean(await currentAccount());
  const spaceHref = signedIn ? "/home" : "/login";

  return (
    <main className="lp">
      {/* Recolors the existing logo-watermark.png (a very pale/low-alpha
          watermark asset) to the site's own gold on render — no new image
          asset, same file, same position/size. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="mm-gold-logo" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
          <feComponentTransfer in="SourceGraphic" result="boosted">
            <feFuncA type="linear" slope="7" intercept="0" />
          </feComponentTransfer>
          <feColorMatrix in="boosted" type="matrix" values="0 0 0 0 0.6784  0 0 0 0 0.4627  0 0 0 0 0.1451  0 0 0 1 0" />
        </filter>
      </svg>
      <section className="lp-hero">
        <nav className="lp-nav" aria-label="Main navigation">
          <Link className="lp-brand" href="/" aria-label="Magical Moments by Reign home">
            <img src="/brand/logo-watermark.png" alt="" width="58" height="58" />
            <span><b>MAGICAL MOMENTS</b><small>BY REIGN</small></span>
          </Link>
          <div className="lp-navlinks">
            <Link href="/">Home</Link><Link href="/get-started">Get Started</Link>
            <Link href="/membership">Memberships</Link><Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <Link className="lp-enter" href={spaceHref}>Enter your space</Link>
        </nav>

        <div className="lp-hero-copy">
          <h1><small>Life is more</small>magical <em>when it&rsquo;s designed<br />with intention.</em></h1>
          <div className="lp-rule">✦</div>
          <p>Your private space to plan life&rsquo;s meaningful experiences, <br />enjoy every moment, and preserve the memories <br />that matter most.</p>
          <div className="lp-actions">
            <Link className="lp-gold-btn" href={spaceHref}>Enter your magical space</Link>
            <Link className="lp-text-btn" href="#experience">Explore the experience <span>→</span></Link>
          </div>
        </div>
      </section>

      <section className="lp-chapters" id="experience">
        <h2><span />One space. Every part of your story.<span /></h2>
        <div className="lp-chapter-grid">
          {chapters.map(([icon, name]) => <Link href="/membership" key={name}><b>{icon}</b><span>{name}</span></Link>)}
        </div>
      </section>

      <section className="lp-luxury">
        <h2>Luxury, curated for you</h2>
        <div className="lp-service-grid">
          <Link href="/membership" className="lp-service lp-service--air"><div><h3>Private Air Travel</h3><p>Fly private. Arrive effortlessly.</p><b>Starting at $7,500</b><b>Explore flights →</b></div></Link>
          <Link href="/membership" className="lp-service lp-service--villa"><div><h3>Luxury Villas &amp; Homes</h3><p>Stay somewhere unforgettable.</p><b>Starting at $2,250 / night</b><b>Explore stays →</b></div></Link>
          <Link href="/membership" className="lp-service lp-service--yacht"><div><h3>Yacht Charters</h3><p>Your moment. Your horizon.</p><b>Starting at $12,000</b><b>Explore yachts →</b></div></Link>
        </div>
        <Link className="lp-view-all" href="/experiences">View all luxury services →</Link>
      </section>

      <section className="lp-mission">
        <div className="lp-mission-copy"><div className="lp-mini-rule">✦</div><h2>We all deserve<br /><em>concierge services.</em></h2>
          <p>Journey will be here to assist you with yours. Whether it&rsquo;s planning a trip, <br />a relaxing day at the spa or just a girls trip, Journey is at your service.</p>
          <strong>starting at $19.00 per month.</strong>
          <div><Link className="lp-gold-btn" href="/membership">Explore luxury services</Link><Link className="lp-outline-btn" href="/concierge">Ask for assistance</Link></div>
        </div>
      </section>

      <section className="lp-why">
        <h2><span />Why choose Magical Moments?<span /></h2>
        <div className="lp-promise-grid">{promises.map(([icon, title, copy]) => <div key={title}><b>{icon}</b><p><strong>{title}</strong><span>{copy}</span></p></div>)}</div>
      </section>

      <section className="lp-panels">
        <article className="lp-panel lp-date"><div><h3>Date Night</h3><p><b>We plan it.</b> You enjoy it.</p><small>From reservations to<br />the perfect details.</small><Link href="/get-started">Explore experiences →</Link></div></article>
        <article className="lp-panel lp-flight"><div><h3>Book with confidence</h3><p>Flights, hotels, cars and more.<br />We find the best so you don&rsquo;t have to.</p><Link href="/get-started">Book your trip →</Link></div></article>
        <article className="lp-panel lp-checkin"><Link href="/get-started">Chat with Journey →</Link></article>
      </section>

      <section className="lp-final">
        <div><b>♙</b><p><strong>Explore freely</strong>See what&rsquo;s possible.</p></div><div><b>▣</b><p><strong>Pick your plan</strong>Choose what fits your life.</p></div><div><b>✦</b><p><strong>Make it yours</strong>Create your Magical Space.</p></div><div><b>♡</b><p><strong>Keep it forever</strong>Cherish for a lifetime.</p></div>
        <Link className="lp-gold-btn" href="/get-started">Begin your magical journey</Link>
      </section>
    </main>
  );
}
