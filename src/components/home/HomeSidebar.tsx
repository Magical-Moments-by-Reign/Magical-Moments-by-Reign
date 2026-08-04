"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The estate directory. Emotional language, not technical — Account Settings
// support the experience; they are never its center. Rooms we haven't opened
// yet are shown honestly as "soon" rather than as dead links.
interface NavItem { label: string; href?: string; icon: string; match?: string; soon?: boolean; }

const NAV: NavItem[] = [
  { label: "Home", href: "/estate/home", icon: "🏡", match: "/estate/home" },
  { label: "My Moments", href: "/dashboard", icon: "✨", match: "/dashboard" },
  { label: "My Journeys", href: "/journeys", icon: "🧭", match: "/journeys" },
  { label: "Events", icon: "🎉", soon: true },
  { label: "Templates", icon: "🕊", soon: true },
  { label: "Uploads", href: "/dashboard/media", icon: "🖼", match: "/dashboard/media" },
  { label: "Domains", icon: "🌐", soon: true },
  { label: "Messages", href: "/notifications", icon: "✉️", match: "/notifications" },
  { label: "Ask Magical AI", href: "/home#concierge", icon: "🔔" },
  { label: "Account Settings", href: "/account", icon: "⚙️", match: "/account" },
  { label: "Support", href: "/contact", icon: "❔", match: "/contact" },
];

export default function HomeSidebar({ memberSince }: { memberSince: string }) {
  const pathname = usePathname();
  return (
    <aside className="home__side">
      <Link href="/home" className="home__brand" aria-label="Magical Moments — home">
        {/* Champagne-gold finish of the SAME mark — the quiet, refined presentation
            for inside the member space. The colorful original stays on the public site. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-champagne.png" alt="" className="home__brand-mark" width={58} height={58} />
        <span className="home__brand-name">Magical Moments</span>
        <span className="home__brand-sub">Your Space</span>
      </Link>

      <nav className="home__nav" aria-label="Your estate">
        {NAV.map((item) => {
          if (item.soon || !item.href) {
            return (
              <span key={item.label} className="home__navlink is-soon" aria-disabled="true">
                <span className="ic" aria-hidden="true">{item.icon}</span>
                {item.label}
                <span className="home__soontag">Soon</span>
              </span>
            );
          }
          const active = item.match ? pathname === item.match : false;
          return (
            <Link key={item.label} href={item.href} className={`home__navlink${active ? " is-active" : ""}`}>
              <span className="ic" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="home__member">
        <span className="home__member-ic" aria-hidden="true">💎</span>
        <span className="home__member-txt">
          <span className="home__member-tier">Member</span>
          <span className="home__member-since">Since {memberSince}</span>
        </span>
      </div>
    </aside>
  );
}
