import Link from "next/link";

const TABS: { href: string; label: string }[] = [
  { href: "/dashboard/discovery/today", label: "News Today" },
  { href: "/dashboard/discovery/watch", label: "Watch" },
  { href: "/dashboard/discovery/movies", label: "Movies" },
  { href: "/dashboard/discovery/music", label: "Music" },
  { href: "/dashboard/discovery/near-you", label: "Events and Tickets" },
  { href: "/dashboard/discovery/sports", label: "Sports" },
  { href: "/dashboard/discovery/trending", label: "Trending" },
];

/** The internal Magical Discovery nav — these are tabs WITHIN Discovery, not
 *  separate Hub sidebar items. `active` matches one of TABS' hrefs exactly. */
export default function DiscoveryNav({ active }: { active: string }) {
  return (
    <nav className="disc-nav" aria-label="Magical Discovery categories">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active === t.href ? "page" : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}
