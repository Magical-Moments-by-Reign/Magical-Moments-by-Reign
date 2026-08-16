import Link from "next/link";
import { Icon } from "@/components/dashboard/nav-config";

// Sports-section-only left nav, matching the Owner's approved mockup —
// nested inside the existing global dashboard chrome (which already
// provides the top-level app sidebar, search, notifications, and account
// menu), not a replacement for it. Every entry routes to a real page or a
// real section on this one; nothing here is a placeholder link.
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
  { href: "/dashboard/discovery/sports", label: "Sports Home", icon: "home" },
  { href: "/dashboard/discovery/sports/my-teams", label: "My Teams", icon: "favorites" },
  { href: "/dashboard/discovery/sports#game-day", label: "Game Day", icon: "events", live: true },
  { href: "/dashboard/discovery/sports/picks", label: "Magical Picks", icon: "star" },
  { href: "/dashboard/discovery/sports/picks", label: "Polls", icon: "projects" },
  { href: "/dashboard/discovery/sports#leaderboard", label: "Leaderboards", icon: "trophy" },
  { href: "/dashboard/discovery/sports#leaderboard", label: "Family & Friends", icon: "family" },
  { href: "/dashboard/discovery/sports#tickets", label: "Tickets & Events", icon: "events" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function SportsSidebar({ active }: { active: string }) {
  return (
    <aside className="sph-side">
      <nav className="sph-side__nav" aria-label="Sports">
        {ITEMS.map((it) => (
          <Link key={it.label} href={it.href} className={`sph-side__i${active === it.label ? " is-on" : ""}`} aria-current={active === it.label ? "page" : undefined}>
            {it.icon === "trophy" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" /><path d="M7 5H4v1a4 4 0 0 0 4 4M17 5h3v1a4 4 0 0 1-4 4" /><path d="M12 12v4M9 20h6M10 16h4v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z" /></svg>
            ) : (
              <Icon name={it.icon} />
            )}
            <span>{it.label}</span>
            {it.live && <em className="sph-side__live">LIVE</em>}
          </Link>
        ))}
      </nav>

      <div className="sph-side__promo">
        <b>Bring the magic to game day!</b>
        <p>Create polls, invite your people, and make every game more memorable.</p>
        <Link href="/dashboard/discovery/sports/picks" className="sph-side__promo-btn">+ Create a Poll</Link>
      </div>
    </aside>
  );
}
