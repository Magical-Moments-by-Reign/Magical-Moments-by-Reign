"use client";

// ── Member dashboard shell ──────────────────────────────────────
// One shared chrome for every /dashboard/* page: fixed sidebar on desktop,
// slide-in drawer on mobile, a top bar, and the active menu item highlighted
// from the real URL (usePathname). Every link points to a real route — no
// placeholder hrefs. The Concierge is mounted alongside (see dashboard/layout).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import "./dashboard-ui.css";

interface NavItem { id: string; label: string; href: string; icon: ReactNode }

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></> },
  { id: "home", label: "Home Estate", href: "/dashboard/home", icon: <path d="M4 12 L12 5 L20 12 M6 11V20H18V11" /> },
  { id: "journeys", label: "My Journeys", href: "/dashboard/journeys", icon: <path d="M12 3 3 8l9 5 9-5z M3 13l9 5 9-5" /> },
  { id: "create", label: "Create a Moment", href: "/dashboard/create", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
  { id: "family-vault", label: "Family Vault", href: "/dashboard/family-vault", icon: <path d="M3 7h6l2 2h10v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /> },
  { id: "social-studio", label: "Social Studio", href: "/dashboard/social-studio", icon: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 L15.8 7 M8.2 13 L15.8 17" /></> },
  { id: "purchases", label: "Purchases", href: "/dashboard/purchases", icon: <><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-3" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></> },
  { id: "sharing", label: "Sharing", href: "/dashboard/sharing", icon: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 L15.8 7 M8.2 13 L15.8 17" /></> },
  { id: "messages", label: "Messages", href: "/dashboard/messages", icon: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></> },
  { id: "settings", label: "Account & Settings", href: "/dashboard/settings", icon: <><circle cx="12" cy="12" r="3.3" /><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M7.2 7.2 5.7 5.7M18.3 18.3 16.8 16.8M7.2 16.8 5.7 18.3M18.3 5.7 16.8 7.2" /></> },
];

const OWNER_ITEM: NavItem = { id: "owner-demo", label: "Owner Demo Studio", href: "/dashboard/owner-demo", icon: <path d="M12 3 L14.5 9 L21 9.5 L16 13.8 L17.5 20 L12 16.6 L6.5 20 L8 13.8 L3 9.5 L9.5 9 Z" /> };

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function DashboardChrome({
  initial, unread, isOwner, children,
}: { initial: string; unread: number; isOwner: boolean; children: ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const [drawer, setDrawer] = useState(false);
  const items = isOwner ? [...NAV, OWNER_ITEM] : NAV;
  const current = items.find((i) => isActive(pathname, i.href));

  function openConcierge() {
    setDrawer(false);
    window.dispatchEvent(new CustomEvent("mmr:open-concierge"));
  }

  const sidebar = (
    <>
      <Link href="/home" className="dsh-brand" onClick={() => setDrawer(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-champagne.png" alt="" width={34} height={34} />
        <span className="dsh-brand__t"><b>MAGICAL MOMENTS</b><i>BY REIGN</i></span>
      </Link>
      <nav className="dsh-nav">
        {items.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            data-tour={it.id}
            className={`dsh-navi${isActive(pathname, it.href) ? " is-on" : ""}`}
            aria-current={isActive(pathname, it.href) ? "page" : undefined}
            onClick={() => setDrawer(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{it.icon}</svg>
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>
      <div className="dsh-scard" data-tour="concierge">
        <div className="dsh-scard__t">Concierge<br /><i>at your service</i></div>
        <div className="dsh-scard__p">Plan, organize, and bring your moments to life.</div>
        <button type="button" className="dsh-scard__b" onClick={openConcierge}>OPEN CONCIERGE</button>
      </div>
    </>
  );

  return (
    <div className="dsh">
      {/* Desktop sidebar */}
      <aside className="dsh-side">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer && <div className="dsh-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside className={`dsh-drawer${drawer ? " is-open" : ""}`} aria-hidden={!drawer}>{sidebar}</aside>

      <div className="dsh-col">
        <header className="dsh-top">
          <button type="button" className="dsh-burger" onClick={() => setDrawer(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <span className="dsh-top__title">{current?.label ?? "Dashboard"}</span>
          <div className="dsh-top__r">
            <Link href="/dashboard/messages" className="dsh-top__ic" aria-label={`Messages${unread ? ` (${unread} unread)` : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
              {unread > 0 && <span className="dsh-top__dot">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href="/dashboard/settings" className="dsh-av" aria-label="Account &amp; settings">{initial}</Link>
          </div>
        </header>

        <main className="dsh-main">{children}</main>
      </div>
    </div>
  );
}
