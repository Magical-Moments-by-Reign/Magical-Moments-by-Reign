import Link from "next/link";
import ScrollCue from "@/components/site/ScrollCue";
import { currentAccount } from "@/lib/auth-session";
import { allEstates } from "@/lib/estates/registry";
import { LIFETIME_COLLECTIONS, PRICING_CONFIG, formatUSD } from "@/lib/pricing-engine";
import "./landing.css";

export const dynamic = "force-dynamic";

// ── The public homepage ─────────────────────────────────────────
// The complete public marketing site: it introduces Magical Moments by Reign
// to a first-time visitor, explains the vision, shows the Life Estates, how it
// works, memberships & pricing (real numbers from the pricing engine), and an
// honest word of trust — before ever asking anyone to sign in. "Your Magical
// Space" is member language and appears only after authentication. Auth-aware:
// a signed-in member is warmly invited into their Space, but the page a visitor
// lands on is always the full public homepage. Every figure is real; nothing
// (prices, estates, testimonials) is invented.
export default async function LandingPage() {
  const account = await currentAccount();
  const signedIn = Boolean(account);

  // Real, live Life Estates come from the registry — no invented worlds shown
  // as available. Home is the flagship that's open today; the rest of the
  // vision is presented honestly as "in creation."
  const liveEstates = allEstates();
  const estatePhoto: Record<string, string> = { home: "/story/newhome.jpg" };
  const comingEstates = [
    { icon: "💍", name: "Weddings", tagline: "Two stories becoming one.", photo: "/story/wedding.jpg" },
    { icon: "🍼", name: "New Baby", tagline: "The first chapter of a new life.", photo: "/story/baby.jpg" },
    { icon: "🎉", name: "Celebrations", tagline: "Every milestone, beautifully kept.", photo: "/story/birthday.jpg" },
    { icon: "✈️", name: "Travel", tagline: "Journeys worth remembering.", photo: "/story/vacation.jpg" },
    { icon: "👔", name: "Business", tagline: "Build your legacy by design.", photo: "" },
    { icon: "🕊️", name: "Legacy", tagline: "Love, preserved for generations.", photo: "" },
  ];

  const monthlyFrom = PRICING_CONFIG.firstOccasion.monthly;
  const lifetimeFrom = LIFETIME_COLLECTIONS[0].price;

  return (
    <div className="lp">
      {/* ── Hero — introduce the company ── */}
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
            <Link href="/">Home</Link>
            <Link href="/get-started">Get Started</Link>
            <Link href="/membership">Memberships</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="lp-nav__r">
            {signedIn ? (
              <Link href="/home" className="lp-btn-g">Enter your Space</Link>
            ) : (
              <>
                <Link href="/login" className="lp-btn-o">Sign In</Link>
                <Link href="/get-started" className="lp-btn-g">Get Started</Link>
              </>
            )}
          </div>
        </nav>

        <div className="lp-hero__in">
          <svg className="lp-spark" viewBox="0 0 44 24" aria-hidden="true">
            <path d="M22 2l1.6 6.4L30 10l-6.4 1.6L22 18l-1.6-6.4L14 10l6.4-1.6z" />
            <path d="M33 5l.8 2.6L36 8l-2.2.4L33 11l-.8-2.6L30 8l2.2-.4z" opacity=".8" />
          </svg>
          <span className="lp-heyebrow">The world&rsquo;s first Luxury Life Operating System</span>
          <h1 className="lp-h1">Life is more magical when it&rsquo;s <i>designed with intention.</i></h1>
          <div className="lp-hdiv" aria-hidden="true" />
          <p className="lp-hsub">
            Magical Moments by Reign is a luxury lifestyle membership for families who design,
            celebrate, and preserve every meaningful chapter of life &mdash; from the homes you build
            to the moments you&rsquo;ll treasure forever.
          </p>
          <div className="lp-hcta-row">
            {signedIn ? (
              <Link href="/home" className="lp-hcta">Enter your Magical Space</Link>
            ) : (
              <>
                <Link href="/get-started" className="lp-hcta">Get Started</Link>
                <Link href="/login" className="lp-hcta lp-hcta--ghost">Sign In</Link>
              </>
            )}
          </div>
          <ScrollCue />
        </div>
      </section>

      {/* ── The vision ── */}
      <section className="lp-vision">
        <span className="lp-eyebrow">Our vision</span>
        <h2 className="lp-vision__t">One home for your family&rsquo;s <i>entire life.</i></h2>
        <p className="lp-vision__p">
          We are not an app. Magical Moments by Reign is a luxury lifestyle brand &mdash; a single,
          beautiful place where every journey you take, every celebration you host, and every memory
          you make can live together. Guided by a personal concierge. Organized without effort.
          Preserved for the generations who come after you.
        </p>
      </section>

      {/* ── The Life Estates ── */}
      <section className="lp-estates">
        <div className="lp-estates__head">
          <span className="lp-eyebrow">The Life Estates</span>
          <h2 className="lp-sec__t">Worlds within <i>your world.</i></h2>
          <p className="lp-estates__lede">
            Each Life Estate is a beautifully designed world for one part of life. Enter the ones that
            matter to you. Begin with Home &mdash; open today &mdash; as more estates are lovingly crafted.
          </p>
        </div>
        <div className="lp-est-grid">
          {liveEstates.map((e) => (
            <Link
              key={e.key}
              href={signedIn ? `/estate/${e.key}` : "/get-started"}
              className={`lp-est lp-est--open${estatePhoto[e.key] ? " lp-est--photo" : ""}`}
              style={estatePhoto[e.key] ? { backgroundImage: `url(${estatePhoto[e.key]})` } : undefined}
            >
              <span className="lp-est__ic" aria-hidden="true">{e.icon}</span>
              <span className="lp-est__badge lp-est__badge--open">Now open</span>
              <span className="lp-est__meta">
                <span className="lp-est__name">{e.name}</span>
                <span className="lp-est__tag">{e.tagline}</span>
              </span>
            </Link>
          ))}
          {comingEstates.map((e) => (
            <div
              key={e.name}
              className={`lp-est${e.photo ? " lp-est--photo" : ""}`}
              aria-disabled="true"
              style={e.photo ? { backgroundImage: `url(${e.photo})` } : undefined}
            >
              <span className="lp-est__ic" aria-hidden="true">{e.icon}</span>
              <span className="lp-est__badge">In creation</span>
              <span className="lp-est__meta">
                <span className="lp-est__name">{e.name}</span>
                <span className="lp-est__tag">{e.tagline}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-how">
        <span className="lp-eyebrow">How it works</span>
        <h2 className="lp-sec__t" style={{ color: "#f4ecdd" }}>Three steps to a <i>life by design.</i></h2>
        <div className="lp-steps">
          <div className="lp-step">
            <span className="lp-step__n">01</span>
            <h3 className="lp-step__t">Choose your chapter</h3>
            <p className="lp-step__p">Tell us the part of life you&rsquo;re in. Begin free &mdash; no pressure, no commitment.</p>
          </div>
          <div className="lp-step">
            <span className="lp-step__n">02</span>
            <h3 className="lp-step__t">Build your membership</h3>
            <p className="lp-step__p">Add the occasions that matter and choose your term. One honest price &mdash; never a hidden fee.</p>
          </div>
          <div className="lp-step">
            <span className="lp-step__n">03</span>
            <h3 className="lp-step__t">Live it, together</h3>
            <p className="lp-step__p">Your concierge guides you, organizes everything, connects trusted professionals &mdash; and preserves it forever.</p>
          </div>
        </div>
      </section>

      {/* ── What's inside — honest feature story ── */}
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
      </section>

      {/* ── Memberships & pricing (real numbers from the engine) ── */}
      <section className="lp-plans">
        <span className="lp-eyebrow">Memberships &amp; pricing</span>
        <h2 className="lp-sec__t">Begin free. <i>Stay forever.</i></h2>
        <div className="lp-sec__d" aria-hidden="true" />
        <div className="lp-plan-grid">
          <div className="lp-plan">
            <span className="lp-plan__k">Free Forever</span>
            <span className="lp-plan__price">{formatUSD(0)}</span>
            <span className="lp-plan__note">Our gift to every family. Begin organizing and preserving today.</span>
          </div>
          <div className="lp-plan lp-plan--feature">
            <span className="lp-plan__k">Build Your Membership</span>
            <span className="lp-plan__price">from {formatUSD(monthlyFrom)}<small>/mo</small></span>
            <span className="lp-plan__note">Add the occasions you love. Pay monthly, yearly, or for years at a time.</span>
          </div>
          <div className="lp-plan">
            <span className="lp-plan__k">Lifetime Collections</span>
            <span className="lp-plan__price">from {formatUSD(lifetimeFrom)}</span>
            <span className="lp-plan__note">Kept for generations &mdash; from Legacy to the complete Magical collection.</span>
          </div>
        </div>
        <Link href="/membership" className="lp-explore">View all memberships &amp; pricing</Link>
      </section>

      {/* ── A quiet moment ── */}
      <div className="lp-qband">
        <div className="lp-qband__wrap">
          <div className="lp-qband__q" aria-hidden="true">&ldquo;</div>
          <p className="lp-qband__t">The best things in life aren&rsquo;t things. <i>They&rsquo;re moments we create.</i></p>
        </div>
      </div>

      {/* ── A word of trust (honest promises, never invented reviews) ── */}
      <section className="lp-trust">
        <span className="lp-eyebrow">Why families trust us</span>
        <h2 className="lp-sec__t">Luxury you can <i>believe in.</i></h2>
        <div className="lp-sec__d" aria-hidden="true" />
        <div className="lp-pillars">
          <div className="lp-pillar">
            <h3 className="lp-pillar__t">Honest pricing, always</h3>
            <p className="lp-pillar__p">You&rsquo;ll only ever see one real price. No hidden fees, no inflated &ldquo;discounts.&rdquo;</p>
          </div>
          <div className="lp-pillar">
            <h3 className="lp-pillar__t">Your privacy is sacred</h3>
            <p className="lp-pillar__p">Your memories are yours. Private by default, shared only when you choose.</p>
          </div>
          <div className="lp-pillar">
            <h3 className="lp-pillar__t">Real people, real advice</h3>
            <p className="lp-pillar__p">We connect you only with vetted, genuine professionals &mdash; never paid placements dressed as guidance.</p>
          </div>
          <div className="lp-pillar">
            <h3 className="lp-pillar__t">Built to last generations</h3>
            <p className="lp-pillar__p">Everything you create is preserved &mdash; so the story outlives the moment.</p>
          </div>
        </div>
      </section>

      {/* ── Warm invitation ── */}
      <section className="lp-cta">
        <h2 className="lp-cta__t">What beautiful chapter of life are we <i>creating together?</i></h2>
        <p className="lp-cta__s">Begin free today. Design the rest at your own pace.</p>
        <Link href={signedIn ? "/home" : "/get-started"} className="lp-btn-g" style={{ padding: "1rem 2.2rem", fontSize: "0.76rem" }}>
          {signedIn ? "Enter your Magical Space" : "Get Started Today"}
        </Link>
      </section>

      {/* ── Footer — real, working links only ── */}
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
            <Link href="/membership">Membership</Link>
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
