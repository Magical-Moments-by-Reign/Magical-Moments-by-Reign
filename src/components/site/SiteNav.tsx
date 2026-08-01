import Link from "next/link";

/** Site-wide navigation with the Magical Moments by Reign logo. */
export default function SiteNav({ active }: { active?: string }) {
  const links = [
    { label: "Home", href: "/", key: "home" },
    { label: "Experiences", href: "/create", key: "experiences" },
    { label: "Inspiration Gallery", href: "/dashboard", key: "gallery" },
    { label: "Pricing", href: "/pricing", key: "pricing" },
    { label: "About", href: "/#how", key: "about" },
    { label: "Contact", href: "/#contact", key: "contact" },
  ];

  return (
    <nav className="site-nav">
      <Link href="/" className="site-logo" aria-label="Magical Moments by Reign — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="site-logo__mark" src="/brand/logo-mark.png" alt="" width={44} height={44} />
        <span className="site-logo__words">
          <span className="site-logo__name">Magical Moments</span>
          <span className="site-logo__sub">by reign</span>
        </span>
      </Link>

      <div className="site-nav__links">
        {links.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            className={active === l.key ? "is-active" : undefined}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="site-nav__actions">
        <Link href="/dashboard" className="btn-outline-gold">
          Log in
        </Link>
        <Link href="/create" className="btn-gold">
          Start your magic ✦
        </Link>
      </div>
    </nav>
  );
}
