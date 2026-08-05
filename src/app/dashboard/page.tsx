import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import { getEstate } from "@/lib/estates/registry";
import EstateIcon from "@/components/estate/EstateIcon";
import { logoutAction } from "../account/actions";
import "./dashboard-home.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// The member console. Every number and list below is REAL, per-account data
// with an honest empty state — no fabricated events, projects, or messages.
// The Home journeys are config-driven doors into the Home Estate.
export default async function DashboardPage() {
  const account = await requireAccount("/dashboard");
  const home = getEstate("home");
  const initial = (account.firstName?.[0] ?? "M").toUpperCase();

  const [upcomingCount, journeysCount, memoriesCount, unread, events, journeys, notifs] = await Promise.all([
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" } }),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: "EXPERIENCE" } }),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY"] } } }),
    unreadCount(account.id),
    prisma.libraryEntry.findMany({
      where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" },
      orderBy: { occurredAt: "asc" }, take: 3,
      select: { id: true, title: true, subtitle: true, occurredAt: true },
    }),
    prisma.libraryEntry.findMany({
      where: { accountId: account.id, archived: false, kind: "EXPERIENCE" },
      orderBy: { updatedAt: "desc" }, take: 3,
      select: { id: true, title: true, subtitle: true, updatedAt: true },
    }),
    prisma.notification.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" }, take: 3,
      select: { id: true, title: true, body: true, createdAt: true },
    }),
  ]);

  // Owner-only surfaces (Owner Demo Studio). staffRoles is server-authoritative.
  const ownerRow = await prisma.account.findUnique({ where: { id: account.id }, select: { staffRoles: true } });
  let isOwner = false;
  try { isOwner = (JSON.parse(ownerRow?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { isOwner = false; }

  const NAV = [
    { label: "Dashboard", href: "/dashboard", on: true, icon: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></> },
    { label: "Home Estate", href: "/estate/home", icon: <path d="M4 12 L12 5 L20 12 M6 11V20H18V11" /> },
    { label: "My Journeys", href: "/journeys", icon: <path d="M12 3 3 8l9 5 9-5z M3 13l9 5 9-5" /> },
    { label: "Create a Moment", href: "/create", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
    { label: "Family Vault", href: "/dashboard/vault", icon: <path d="M3 7h6l2 2h10v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /> },
    { label: "Social Studio", href: "/dashboard/social", icon: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 L15.8 7 M8.2 13 L15.8 17" /></> },
    { label: "Purchases", href: "/dashboard/purchases", icon: <><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-3" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></> },
    { label: "Sharing", href: "/dashboard/shares", icon: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 L15.8 7 M8.2 13 L15.8 17" /></> },
    { label: "Messages", href: "/notifications", icon: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></> },
    { label: "Account & Settings", href: "/account", icon: <><circle cx="12" cy="12" r="3.3" /><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M7.2 7.2 5.7 5.7M18.3 18.3 16.8 16.8M7.2 16.8 5.7 18.3M18.3 5.7 16.8 7.2" /></> },
    ...(isOwner ? [{ label: "Owner Demo Studio", href: "/dashboard/owner-demo", icon: <><path d="M12 3 L14.5 9 L21 9.5 L16 13.8 L17.5 20 L12 16.6 L6.5 20 L8 13.8 L3 9.5 L9.5 9 Z" /></> }] : []),
  ];

  const stats = [
    { k: "Upcoming Events", n: upcomingCount, href: "/dashboard", icon: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></> },
    { k: "Active Journeys", n: journeysCount, href: "/journeys", icon: <path d="M4 12 L12 5 L20 12 M6 11V20H18V11" /> },
    { k: "Messages", n: unread, href: "/notifications", icon: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></> },
    { k: "Memories", n: memoriesCount, href: "/dashboard/media", icon: <path d="M12 4 L13.4 10 L19.5 12 L13.4 14 L12 20 L10.6 14 L4.5 12 L10.6 10 Z" /> },
  ];

  const monthDay = (d: Date) => ({
    m: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    d: d.toLocaleDateString("en-US", { day: "numeric" }),
  });
  const timeAgo = (d: Date) => {
    const days = Math.round((Date.now() - d.getTime()) / 86400000);
    if (days < 1) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="dh">
      <aside className="dh-side">
        <Link href="/home" className="dh-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-champagne.png" alt="" width={60} height={60} />
          <span className="n">MAGICAL MOMENTS</span>
          <span className="b">BY REIGN</span>
        </Link>
        {NAV.map((item) => (
          <Link key={item.label} href={item.href} className={`dh-nav${item.on ? " dh-nav--on" : ""}`}>
            <svg className="dh-ni" viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
            <span>{item.label}</span>
          </Link>
        ))}
        <div className="dh-scard">
          <div className="dh-scard__t">Concierge<br />at your service</div>
          <div className="dh-scard__p">Need help with anything? We&apos;re here for you.</div>
          <Link href="/contact" className="dh-scard__b">CONTACT CONCIERGE</Link>
        </div>
      </aside>

      <main className="dh-main">
        <div className="dh-tbar">
          <Link href="/notifications" className="dh-tb" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
            {unread > 0 && <span className="dh-tb__dot">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <Link href="/account" className="dh-av" aria-label="Account &amp; settings">{initial}</Link>
          <form action={logoutAction}><button type="submit" className="dh-out">Sign out</button></form>
        </div>

        <div className="dh-hero">
          <div>
            <span className="dh-hero__eye">Welcome back</span>
            <h1 className="dh-hero__t">Welcome to Your <i>Magical Space</i></h1>
            <p className="dh-hero__s">Let&apos;s create more magical moments together, {account.firstName}.</p>
          </div>
          <div className="dh-hero__img" aria-hidden="true" />
        </div>

        <div className="dh-bar">
          {stats.map((s, i) => (
            <div key={s.k} style={{ display: "contents" }}>
              {i > 0 && <span className="dh-st__d" aria-hidden="true" />}
              <Link href={s.href} className="dh-st">
                <svg className="dh-sti" viewBox="0 0 24 24" aria-hidden="true">{s.icon}</svg>
                <div>
                  <span className="dh-st__k">{s.k}</span>
                  <span className="dh-st__n">{s.n}</span>
                  <span className="dh-st__v">View all</span>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="dh-sec-h">
          <h2>Your Magical Journeys</h2>
          <Link href="/estate/home">View all journeys →</Link>
        </div>
        <div className="dh-jgrid">
          {(home?.destinations ?? []).map((d) => (
            <Link key={d.id} href="/estate/home/learn" className="dh-jt">
              <span className="dh-jt__ov" aria-hidden="true" />
              <span className="dh-jt__ic"><EstateIcon name={d.icon} size={26} /></span>
              <span className="dh-jt__t">{d.title}</span>
              <span className="dh-jt__s">{d.tagline}</span>
              <span className="dh-jt__b">Explore</span>
            </Link>
          ))}
        </div>

        <div className="dh-cols">
          <div className="dh-panel">
            <div className="ph"><h3>Upcoming Events</h3><Link href="/dashboard">View all →</Link></div>
            {events.length ? events.map((e) => {
              const md = e.occurredAt ? monthDay(e.occurredAt) : null;
              return (
                <div key={e.id} className="dh-ev">
                  <span className="dh-ev__d">{md ? <><b>{md.m}</b>{md.d}</> : <b>SOON</b>}</span>
                  <div className="dh-ev__b">
                    <span className="dh-ev__t">{e.title}</span>
                    {e.subtitle && <span className="dh-ev__ti">{e.subtitle}</span>}
                  </div>
                </div>
              );
            }) : <p className="dh-empty">No upcoming events yet — when you plan one, it will appear here.</p>}
          </div>

          <div className="dh-panel">
            <div className="ph"><h3>Active Journeys</h3><Link href="/journeys">View all →</Link></div>
            {journeys.length ? journeys.map((j) => (
              <div key={j.id} className="dh-ev">
                <span className="dh-ev__d"><b></b>✦</span>
                <div className="dh-ev__b">
                  <span className="dh-ev__t">{j.title}</span>
                  <span className="dh-ev__ti">{j.subtitle ?? `Updated ${timeAgo(j.updatedAt)}`}</span>
                </div>
              </div>
            )) : <p className="dh-empty">No active journeys yet — begin one from the Home Estate above.</p>}
          </div>
        </div>

        <div className="dh-cols">
          <div className="dh-panel">
            <div className="ph"><h3>Latest Messages</h3><Link href="/notifications">View all →</Link></div>
            {notifs.length ? notifs.map((n) => (
              <div key={n.id} className="dh-ms">
                <span className="dh-ms__av" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></svg></span>
                <div className="dh-ms__b">
                  <span className="dh-ms__n">{n.title}</span>
                  {n.body && <span className="dh-ms__t">{n.body}</span>}
                </div>
                <span className="dh-ms__ti">{timeAgo(n.createdAt)}</span>
              </div>
            )) : <p className="dh-empty">No messages yet — updates from your concierge and journeys will arrive here.</p>}
          </div>

          <div className="dh-promo">
            <div>
              <h3>Every moment<br />is magical</h3>
              <p>Let us help you create memories that last a lifetime.</p>
              <Link href="/estate/home">Explore more</Link>
            </div>
          </div>
        </div>

        <div className="dh-qwrap">
          <h3>Quick Access</h3>
          <div className="dh-qrow">
            <Link href="/dashboard/vault" className="dh-qa"><svg className="dh-qai" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg><span>Family Vault</span></Link>
            <Link href="/dashboard/media" className="dh-qa"><svg className="dh-qai" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M5 18l5-4 4 3 3-2 2 3" /></svg><span>My Memories</span></Link>
            <Link href="/estate/home/learn" className="dh-qa"><svg className="dh-qai" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v13H4z" /><path d="M8 9h8M8 13h5" /></svg><span>Learning Center</span></Link>
            <Link href="/notifications" className="dh-qa"><svg className="dh-qai" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg><span>Notifications</span></Link>
            <Link href="/account" className="dh-qa"><svg className="dh-qai" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.3" /><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2" /></svg><span>Settings</span></Link>
          </div>
        </div>

        <div className="dh-foot">
          <span>© {new Date().getFullYear()} Magical Moments by Reign. All rights reserved.</span>
          <Link href="/home" style={{ color: "var(--champ-d)", textDecoration: "none" }}>Your Magical Space →</Link>
        </div>
      </main>
    </div>
  );
}
