import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="site-footer__brand">
            Magical <span>by Reign</span>
          </p>
          <p className="site-footer__tag">Every memory deserves a masterpiece.</p>
        </div>
        <nav className="site-footer__links" aria-label="Footer">
          <Link href="/create">Create an experience</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/#how">How it works</Link>
        </nav>
      </div>
      <div className="container site-footer__legal">
        <small>© {new Date().getFullYear()} Magical Moments by Reign · Founded by Tabitha Turner</small>
      </div>
    </footer>
  );
}
