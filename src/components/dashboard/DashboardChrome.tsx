"use client";

// ── Member dashboard shell ──────────────────────────────────────
// One shared chrome for every /dashboard/* page: chocolate sidebar on desktop,
// slide-in drawer on mobile, a top bar with search + notifications + avatar, and
// the active menu item highlighted from the real URL. Every link points to a
// real route (unbuilt categories go to an honest /dashboard/explore Coming-Soon
// page — never a dead href). The Concierge card opens the in-app assistant.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SIDE_NAV, OWNER_NAV, Icon } from "./nav-config";
import "./dashboard-ui.css";

// Active-menu detection that respects `?area=` on shared paths (e.g. the Home
// world), so exactly one item highlights.
function isActive(pathname: string, currentArea: string | null, href: string): boolean {
  const [p, qs] = href.split("?");
  if (p === "/dashboard") return pathname === "/dashboard";
  const pathMatch = pathname === p || pathname.startsWith(p + "/");
  if (!pathMatch) return false;
  const area = qs ? new URLSearchParams(qs).get("area") : null;
  if (area) return currentArea === area;         // area item: match the query
  return !currentArea || pathname !== p;         // base item: only when no area is active on the same path
}

export default function DashboardChrome({
  initial, unread, isOwner, children,
}: { initial: string; unread: number; isOwner: boolean; children: ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const currentArea = useSearchParams().get("area");
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const items = isOwner ? [...SIDE_NAV, OWNER_NAV] : SIDE_NAV;

  function openConcierge() {
    setDrawer(false);
    window.dispatchEvent(new CustomEvent("mmr:open-concierge"));
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(`/dashboard/explore/search${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  }

  const sidebar = (
    <>
      <Link href="/" className="dsh-brand" onClick={() => setDrawer(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-champagne.png" alt="" width={40} height={40} />
        <span className="dsh-brand__t"><b>MAGICAL MOMENTS</b><i>BY REIGN</i></span>
      </Link>
      <nav className="dsh-nav">
        {items.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            data-tour={it.id}
            className={`dsh-navi${isActive(pathname, currentArea, it.href) ? " is-on" : ""}`}
            aria-current={isActive(pathname, currentArea, it.href) ? "page" : undefined}
            onClick={() => setDrawer(false)}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>
      <div className="dsh-scard" data-tour="concierge">
        <div className="dsh-scard__t">Concierge<br /><i>at your service</i></div>
        <div className="dsh-scard__p">Need help with anything? We&rsquo;re here for you.</div>
        <button type="button" className="dsh-scard__b" onClick={openConcierge}>CONTACT CONCIERGE</button>
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

          <form className="dsh-search" onSubmit={onSearch} role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search anything…"
              aria-label="Search"
            />
          </form>

          <div className="dsh-top__r">
            <Link href="/dashboard/messages" className="dsh-top__ic" aria-label={`Messages${unread ? ` (${unread} unread)` : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
              {unread > 0 && <span className="dsh-top__dot">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href="/dashboard/settings" className="dsh-avwrap" aria-label="Account &amp; settings">
              <span className="dsh-av">{initial}</span>
              <svg className="dsh-av__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </Link>
          </div>
        </header>

        <main className="dsh-main">{children}</main>
      </div>
    </div>
  );
}
