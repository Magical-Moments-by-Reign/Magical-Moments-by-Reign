import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { Icon, JOURNEY_TILES } from "@/components/dashboard/nav-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Member overview — the approved luxury home dashboard. The LAYOUT is fixed, but
// every number and list is REAL, account-keyed data with an honest empty state
// (never the sample data from a mockup). The Journey tiles are category entry
// points; unbuilt ones open an honest Coming-Soon page.
export default async function DashboardPage() {
  const account = await requireAccount("/dashboard");

  const [journeys, upcoming, notifs, unread, docCount] = await Promise.all([
    prisma.experience.findMany({
      where: { accountId: account.id },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true, status: true, updatedAt: true },
    }).catch(() => []),
    prisma.libraryEntry.findMany({
      where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" },
      orderBy: { occurredAt: "asc" }, take: 3,
      select: { id: true, title: true, subtitle: true, occurredAt: true },
    }).catch(() => []),
    prisma.notification.findMany({
      where: { accountId: account.id, archivedAt: null },
      orderBy: { createdAt: "desc" }, take: 3,
      select: { id: true, title: true, body: true, readAt: true, createdAt: true },
    }).catch(() => []),
    prisma.notification.count({ where: { accountId: account.id, archivedAt: null, readAt: null } }).catch(() => 0),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: { in: ["RECEIPT", "ORDER"] } } }).catch(() => 0),
  ]);

  const active = journeys.filter((j) => j.status === "PUBLISHED");
  const first = account.firstName || "friend";

  const monthShort = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "");
  const dayNum = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { day: "2-digit" }) : "");
  const timeAgo = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const initials = (s: string) => (s.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "•";

  const STATS = [
    { icon: "events", n: upcoming.length, k: "Upcoming Events", href: "/dashboard/explore/active-projects" },
    { icon: "projects", n: active.length, k: "Active Projects", href: "/dashboard/journeys" },
    { icon: "messages", n: unread, k: "Messages", href: "/dashboard/messages" },
    { icon: "documents", n: docCount, k: "Documents", href: "/dashboard/explore/documents" },
  ];

  const QUICK = [
    { label: "My Documents", icon: "documents", href: "/dashboard/explore/documents" },
    { label: "My Favorites", icon: "favorites", href: "/dashboard/explore/favorites" },
    { label: "Saved Searches", icon: "dashboard", href: "/dashboard/explore/search" },
    { label: "Notes & Ideas", icon: "resources", href: "/dashboard/explore/resources" },
    { label: "Payment Center", icon: "messages", href: "/dashboard/purchases" },
  ];

  return (
    <div className="db">
      {/* Brand banner — the first thing a member sees */}
      <section className="db-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/memories-magic.png" alt="Magical Moments by Reign — Where Your Memories Become Magic. A beautiful online space to celebrate, share, and preserve life's most meaningful moments." />
      </section>
      <p className="db-welcome">Welcome back, <b>{first}</b> ✦ Let&rsquo;s create more magical moments together.</p>

      {/* Stat cards */}
      <section className="db-stats">
        {STATS.map((s) => (
          <Link key={s.k} href={s.href} className="db-stat">
            <span className="db-stat__ic"><Icon name={s.icon} /></span>
            <span className="db-stat__body">
              <span className="db-stat__k">{s.k}</span>
              <span className="db-stat__n">{s.n}</span>
              <span className="db-stat__link">View all</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Your Magical Journeys — the home world entry points. */}
      <section className="db-sec">
        <div className="db-sec__h">
          <h2 className="db-sec__t">Your Magical Journeys</h2>
          <Link href="/dashboard/journeys" className="db-sec__link">View all journeys →</Link>
        </div>
        <div className="db-tiles">
          {JOURNEY_TILES.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className="db-tile"
              data-id={t.id}
              style={t.image ? { backgroundImage: `linear-gradient(180deg, rgba(28,19,12,.18), rgba(28,19,12,.72)), url(${t.image})` } : undefined}
            >
              {t.status === "soon" && <span className="db-tile__soon">Coming Soon</span>}
              <span className="db-tile__icon"><Icon name={t.icon} /></span>
              <span className="db-tile__title">{t.title}</span>
              <span className="db-tile__tag">{t.tagline}</span>
              <span className="db-tile__cta">EXPLORE</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Two-column: events / messages + projects / promo */}
      <div className="db-cols">
        <div className="db-colA">
          {/* Upcoming Events */}
          <div className="db-card">
            <div className="db-card__h"><h3>Upcoming Events</h3><Link href="/dashboard/explore/active-projects" className="db-card__link">View all →</Link></div>
            {upcoming.length ? (
              <div className="db-events">
                {upcoming.map((u) => (
                  <div key={u.id} className="db-event">
                    <span className="db-event__date"><b>{monthShort(u.occurredAt)}</b><i>{dayNum(u.occurredAt)}</i></span>
                    <span className="db-event__main"><span className="db-event__t">{u.title}</span>{u.subtitle && <span className="db-event__s">{u.subtitle}</span>}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="db-empty">No events scheduled yet. Dates you add to a Journey will appear here.</p>
            )}
          </div>

          {/* Latest Messages */}
          <div className="db-card">
            <div className="db-card__h"><h3>Latest Messages</h3><Link href="/dashboard/messages" className="db-card__link">View all →</Link></div>
            {notifs.length ? (
              <div className="db-msgs">
                {notifs.map((n) => (
                  <div key={n.id} className="db-msg">
                    <span className="db-msg__av">{initials(n.title)}</span>
                    <span className="db-msg__main">
                      <span className="db-msg__t">{n.title}{!n.readAt && <span className="db-dot" aria-label="unread" />}</span>
                      {n.body && <span className="db-msg__s">{n.body}</span>}
                    </span>
                    <span className="db-msg__time">{timeAgo(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="db-empty">No messages yet. Notes from your Concierge and collaborators will appear here.</p>
            )}
          </div>
        </div>

        <div className="db-colB">
          {/* Active Projects */}
          <div className="db-card">
            <div className="db-card__h"><h3>Active Projects</h3><Link href="/dashboard/journeys" className="db-card__link">View all →</Link></div>
            {active.length ? (
              <div className="db-projects">
                {active.slice(0, 3).map((p) => (
                  <Link key={p.slug} href={`/${p.slug}`} className="db-project">
                    <span className="db-project__main">
                      <span className="db-project__t">{p.title}</span>
                      <span className="db-project__s">Published Journey</span>
                    </span>
                    <span className="db-project__go">Open →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="db-empty">No active projects yet. Start a Journey and it will appear here.</p>
            )}
          </div>

          {/* Promo */}
          <div className="db-promo">
            <div className="db-promo__body">
              <h3>Every moment<br />is magical</h3>
              <p>Let us help you create memories that last a lifetime.</p>
              <Link href="/dashboard/journeys" className="db-promo__b">EXPLORE MORE</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <section className="db-quick">
        <span className="db-quick__label">Quick Access</span>
        <div className="db-quick__row">
          {QUICK.map((q) => (
            <Link key={q.label} href={q.href} className="db-quick__item">
              <Icon name={q.icon} /><span>{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="db-foot">
        <span>© {new Date().getFullYear()} Magical Moments by Reign. All rights reserved.</span>
        <span className="db-foot__links"><Link href="/dashboard/explore/privacy">Privacy Policy</Link> <i>|</i> <Link href="/dashboard/explore/terms">Terms of Service</Link></span>
      </footer>
    </div>
  );
}
