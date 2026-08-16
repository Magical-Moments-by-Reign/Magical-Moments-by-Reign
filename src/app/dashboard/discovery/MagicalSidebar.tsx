import Link from "next/link";
import { Icon } from "@/components/dashboard/nav-config";

// Shared left nav for Discovery-area pages with their own dedicated
// section chrome (Sports Home, Events & Tickets, …) — matching the
// Owner's approved mockups. Nested inside the existing global dashboard
// chrome (which already provides the top-level app sidebar, search,
// notifications, and account menu), not a replacement for it. Every entry
// routes to a real page or a real section; nothing here is a placeholder
// link.
//
// High School Sports deliberately isn't in this list: API-Sports (now
// confirmed Pro/working for the sports it does cover) has no U.S.
// high-school football data source, so it can't be presented as a live,
// working tab next to sports that actually are. The underlying concept
// (HighSchoolPendingProvider, the honest "coming soon" page at
// ?sport=high_school) is untouched and still reachable — this only stops
// advertising it as equivalent to the real, live sports above until a real
// provider is connected.
const ITEMS: { href: string; label: string; icon: string; live?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/journeys", label: "Magical Occasions", icon: "events" },
  { href: "/dashboard/luxury-services", label: "Luxury Services", icon: "concierge" },
  { href: "/dashboard/discovery", label: "Magical Discovery", icon: "discovery" },
  { href: "/dashboard/discovery/sports/my-teams", label: "My Teams", icon: "favorites" },
  { href: "/dashboard/discovery/sports#game-day", label: "Game Day", icon: "events", live: true },
  { href: "/dashboard/discovery/sports/picks", label: "Magical Picks", icon: "star" },
  { href: "/dashboard/discovery/sports/picks", label: "Polls", icon: "projects" },
  { href: "/dashboard/discovery/sports#leaderboard", label: "Leaderboards", icon: "trophy" },
  { href: "/dashboard/discovery/sports#leaderboard", label: "Family & Friends", icon: "family" },
  { href: "/dashboard/discovery/near-you", label: "Events and Tickets", icon: "events" },
  { href: "/dashboard/messages", label: "Messages", icon: "messages" },
  { href: "/notifications", label: "Notifications", icon: "birthday" },
  { href: "/dashboard/vault", label: "Memories Vault", icon: "moments" },
  { href: "/dashboard/home", label: "Journey", icon: "travel" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function MagicalSidebar({ active, promo }: { active: string; promo: { title: string; body: string; ctaLabel: string; ctaHref: string } }) {
  return (
    <aside className="mm-side">
      <nav className="mm-side__nav" aria-label="Magical Moments">
        {ITEMS.map((it) => (
          <Link key={it.label} href={it.href} className={`mm-side__i${active === it.label ? " is-on" : ""}`} aria-current={active === it.label ? "page" : undefined}>
            {it.icon === "trophy" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" /><path d="M7 5H4v1a4 4 0 0 0 4 4M17 5h3v1a4 4 0 0 1-4 4" /><path d="M12 12v4M9 20h6M10 16h4v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z" /></svg>
            ) : (
              <Icon name={it.icon} />
            )}
            <span>{it.label}</span>
            {it.live && <em className="mm-side__live">LIVE</em>}
          </Link>
        ))}
      </nav>

      <div className="mm-side__promo">
        <b>{promo.title}</b>
        <p>{promo.body}</p>
        <Link href={promo.ctaHref} className="mm-side__promo-btn">{promo.ctaLabel}</Link>
      </div>
    </aside>
  );
}
