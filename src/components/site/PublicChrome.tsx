import Link from "next/link";
import "../../app/get-started/get-started.css";

// Shared chrome for the PUBLIC website's interior pages (Get Started, FAQs,
// Success Stories, Experiences, Inspiration, Build Your Membership). Solid
// ivory nav + dark footer, champagne accents. The public nav is deliberately
// simple — Home · Get Started · About · Contact — because Get Started is where
// discovery lives. The homepage keeps its own transparent-over-hero nav.

type Active = "home" | "get-started" | "about" | "contact" | null;

export function PublicNav({ active = null, signedIn = false }: { active?: Active; signedIn?: boolean }) {
  const items: { label: string; href: string; key: Active }[] = [
    { label: "Home", href: "/", key: "home" },
    { label: "Get Started", href: "/get-started", key: "get-started" },
    { label: "About", href: "/about", key: "about" },
    { label: "Contact", href: "/contact", key: "contact" },
  ];
  return (
    <nav className="gs-nav">
      <Link href="/" className="gs-nav__l" aria-label="Magical Moments by Reign — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-champagne.png" alt="" width={44} height={44} />
        <span className="gs-nav__n"><b>MAGICAL MOMENTS</b><span>BY REIGN</span></span>
      </Link>
      <div className="gs-nav__m">
        {items.map((it) => (
          <Link key={it.key} href={it.href} className={active === it.key ? "on" : undefined}>{it.label}</Link>
        ))}
      </div>
      <div className="gs-nav__r">
        {signedIn ? (
          <Link href="/home" className="gs-g">Enter your Space</Link>
        ) : (
          <>
            <Link href="/login" className="gs-o">Sign In</Link>
            <Link href="/signup" className="gs-g">Join Now</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export function PublicFooter({ year }: { year: number }) {
  return (
    <footer className="gs-foot">
      <div className="gs-foot__in">
        <div className="gs-fb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-champagne.png" alt="" width={52} height={52} />
          <div className="fn">MAGICAL MOMENTS</div>
          <div className="ft">BY REIGN</div>
          <p>Life is made of magical moments.<br />We help you capture them all.</p>
        </div>
        <div className="gs-fcol">
          <h4>Company</h4>
          <Link href="/about">About Us</Link>
          <Link href="/membership">How It Works</Link>
          <Link href="/business">For Business</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div className="gs-fcol">
          <h4>Explore</h4>
          <Link href="/get-started">Get Started</Link>
          <Link href="/experiences">Journeys</Link>
          <Link href="/inspiration">Inspiration</Link>
          <Link href="/membership">Memberships</Link>
        </div>
        <div className="gs-fcol">
          <h4>Get Started</h4>
          <Link href="/signup">Create Your Space</Link>
          <Link href="/login">Sign In</Link>
          <Link href="/contact">Support</Link>
        </div>
      </div>
      <div className="gs-fbar">© {year} Magical Moments by Reign. All rights reserved.</div>
    </footer>
  );
}
