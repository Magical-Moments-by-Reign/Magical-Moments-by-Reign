import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brandcol">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="site-footer__logo"
            src="/brand/logo.png"
            alt="Magical Moments by Reign"
            width={220}
            height={220}
          />
          <p className="site-footer__tag">Capture. Celebrate. Cherish Forever.</p>
        </div>
        <nav className="site-footer__links" aria-label="Footer">
          <Link href="/create">Create an experience</Link>
          <Link href="/membership">Build membership</Link>
          <Link href="/journey/wedding">Wedding Journey</Link>
          <Link href="/housing-hub">Housing Hub</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/vendors">Vendor Marketplace</Link>
          <Link href="/vendors/login">Vendor Login</Link>
          <Link href="/#how">How it works</Link>
        </nav>
      </div>
      <div className="container site-footer__legal">
        <small>© {new Date().getFullYear()} Magical Moments by Reign · Founded by Tabitha Turner</small>
        <nav className="site-footer__legallinks" aria-label="Legal">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </nav>
      </div>
    </footer>
  );
}
