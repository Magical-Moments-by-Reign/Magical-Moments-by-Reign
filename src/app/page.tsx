import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import "./landing.css";

export const dynamic = "force-dynamic";

// The public front door. A luxury arrival, not a brochure: living estate hero,
// an honest feature story, a quiet quote, a warm invitation. Auth-aware — a
// signed-in member is invited straight into their Magical Space. Footer links
// point only to pages that genuinely exist (no dead or invented links).
export default async function LandingPage() {
  const account = await currentAccount();
  const signedIn = Boolean(account);

  return (
    <div className="lp">
      {/* Living estate hero */}
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true" />
        <div className="lp-hero__grad" aria-hidden="true" />
        <div className="lp-hero__sun" aria-hidden="true" />

        <nav className="lp-nav">
          <Link href="/" className="lp-nav__l" aria-label="Magical Moments by Reign">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" width={44} height={44} />
            <span className="lp-nav__n"><b>MAGICAL MOMENTS</b><span>BY REIGN</span></span>
          </Link>
          <div className="lp-nav__m">
            <Link href="/about">About</Link>
            <Link href="/journeys">Experiences</Link>
            <Link href="/inspiration">Inspiration</Link>
            <Link href="/membership">Membership</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="lp-nav__r">
            {signedIn ? (
              <Link href="/home" className="lp-btn-g">Enter your Space</Link>
            ) : (
              <>
                <Link href="/login" className="lp-btn-o">Sign In</Link>
                <Link href="/signup" className="lp-btn-g">Get Started</Link>
              </>
            )}
          </div>
        </nav>

        <div className="lp-hero__in">
          <svg className="lp-spark" viewBox="0 0 44 24" aria-hidden="true">
            <path d="M22 2l1.6 6.4L30 10l-6.4 1.6L22 18l-1.6-6.4L14 10l6.4-1.6z" />
            <path d="M33 5l.8 2.6L36 8l-2.2.4L33 11l-.8-2.6L30 8l2.2-.4z" opacity=".8" />
          </svg>
          <h1 className="lp-h1">Welcome to Your <i>Magical Space</i></h1>
          <div className="lp-hdiv" aria-hidden="true" />
          <p className="lp-hsub">What beautiful chapter of life<br />are we creating together today?</p>
          {signedIn ? (
            <Link href="/home" className="lp-hcta">Enter your Magical Space</Link>
          ) : (
            <Link href="/login" className="lp-hcta">Sign in to begin your journey</Link>
          )}
        </div>
      </section>

      {/* The honest feature story */}
      <section className="lp-sec">
        <h2 className="lp-sec__t">Everything you need. <i>All in one place.</i></h2>
        <div className="lp-sec__d" aria-hidden="true" />
        <div className="lp-feats">
          <div className="lp-feat">
            <span className="lp-feat__ic"><svg className="lp-fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 L12 5 L20 12 M6 11V20H18V11" /></svg></span>
            <span className="lp-feat__t">Your Journeys</span>
            <span className="lp-feat__s">Buy, build, renovate, invest and more.</span>
          </div>
          <span className="lp-feat__div" aria-hidden="true" />
          <div className="lp-feat">
            <span className="lp-feat__ic"><svg className="lp-fi" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /><path d="M12 12.3l.85 1.75 1.95.28-1.4 1.37.33 1.94L12 16.9l-1.73.72.33-1.94-1.4-1.37 1.95-.28z" /></svg></span>
            <span className="lp-feat__t">Special Moments</span>
            <span className="lp-feat__s">Events, celebrations and memories.</span>
          </div>
          <span className="lp-feat__div" aria-hidden="true" />
          <div className="lp-feat">
            <span className="lp-feat__ic"><svg className="lp-fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14M6.5 17a5.5 5.5 0 0 1 11 0M12 6.5V4.6M10.2 4.6h3.6" /></svg></span>
            <span className="lp-feat__t">Lifestyle Concierge</span>
            <span className="lp-feat__s">We handle the details so you enjoy the life.</span>
          </div>
          <span className="lp-feat__div" aria-hidden="true" />
          <div className="lp-feat">
            <span className="lp-feat__ic"><svg className="lp-fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg></span>
            <span className="lp-feat__t">Everything Organized</span>
            <span className="lp-feat__s">Documents, messages and important details.</span>
          </div>
          <span className="lp-feat__div" aria-hidden="true" />
          <div className="lp-feat">
            <span className="lp-feat__ic"><svg className="lp-fi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8" /><path d="M5 20a7 7 0 0 1 14 0" /></svg></span>
            <span className="lp-feat__t">Built for You</span>
            <span className="lp-feat__s">Personalized experiences designed around you.</span>
          </div>
        </div>
        <Link href="/membership" className="lp-explore">Explore all features</Link>
      </section>

      {/* A quiet moment */}
      <div className="lp-qband">
        <div className="lp-qband__wrap">
          <div className="lp-qband__q" aria-hidden="true">&ldquo;</div>
          <p className="lp-qband__t">The best things in life aren&rsquo;t things. <i>They&rsquo;re moments we create.</i></p>
        </div>
      </div>

      {/* Warm invitation */}
      <section className="lp-cta">
        <h2 className="lp-cta__t">Ready to create something magical?</h2>
        <p className="lp-cta__s">Join now and start your journey.</p>
        <Link href={signedIn ? "/home" : "/signup"} className="lp-btn-g" style={{ padding: "1rem 2.2rem", fontSize: "0.76rem" }}>
          {signedIn ? "Enter your Magical Space" : "Get Started Today"}
        </Link>
      </section>

      {/* Footer — real, working links only */}
      <footer className="lp-foot">
        <div className="lp-foot__in">
          <div className="lp-fb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" width={52} height={52} />
            <div className="fn">MAGICAL MOMENTS</div>
            <div className="ft">BY REIGN</div>
            <p>Your lifestyle. Your moments.<br />All in one magical place.</p>
          </div>
          <div className="lp-fcol">
            <h4>Company</h4>
            <Link href="/about">About Us</Link>
            <Link href="/membership">How It Works</Link>
            <Link href="/business">For Business</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="lp-fcol">
            <h4>Explore</h4>
            <Link href="/journeys">Experiences</Link>
            <Link href="/inspiration">Inspiration</Link>
            <Link href="/vendors">Partners</Link>
            <Link href="/pricing">Membership</Link>
          </div>
          <div className="lp-fcol">
            <h4>Get Started</h4>
            <Link href="/signup">Create Account</Link>
            <Link href="/login">Sign In</Link>
            <Link href="/contact">Support</Link>
          </div>
        </div>
        <div className="lp-fbar">© {new Date().getFullYear()} Magical Moments by Reign. All rights reserved.</div>
      </footer>
    </div>
  );
}
