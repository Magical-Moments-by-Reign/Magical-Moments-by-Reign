import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import { getConcierge, needsWelcome } from "@/lib/concierge";
import ConciergeWelcome from "@/components/home/ConciergeWelcome";
import { logoutAction } from "../account/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Magical Space", robots: { index: false } };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; error?: string }>;
}) {
  const account = await requireAccount("/home");
  const sp = await searchParams;
  const concierge = await getConcierge(account.id);

  // First meeting — or re-invoked via the gentle "give me a name" nudge.
  if (needsWelcome(concierge) || sp.welcome === "1") {
    return <ConciergeWelcome firstName={account.firstName} error={sp.error} />;
  }

  // REAL, per-account data. Every count is account-keyed and is 0 for a new
  // member — honest, never fabricated sample numbers.
  const [upcoming, journeys, memories, peopleAgg, unread] = await Promise.all([
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" } }),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: "EXPERIENCE" } }),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY"] } } }),
    prisma.account.findUnique({ where: { id: account.id }, select: { _count: { select: { invitationsSent: true } } } }),
    unreadCount(account.id),
  ]);
  const people = peopleAgg?._count.invitationsSent ?? 0;
  const initial = (account.firstName?.[0] ?? "M").toUpperCase();

  const stats = [
    { key: "upcoming", num: upcoming, unit: "Upcoming", sub: "Events", href: "/dashboard" },
    { key: "journeys", num: journeys, unit: "Active", sub: "Journeys", href: "/journeys" },
    { key: "memories", num: memories, unit: "Memories", sub: "Captured", href: "/dashboard/media" },
    { key: "people", num: people, unit: "People", sub: "Connected", href: "/account/family" },
  ];

  return (
    <>
      {/* The living arrival hero */}
      <section className="msp-hero">
        <div className="msp-hero__bg" aria-hidden="true" />
        <div className="msp-hero__grad" aria-hidden="true" />
        <div className="msp-hero__sun" aria-hidden="true" />
        <div className="msp-hero__shimmer" aria-hidden="true" />

        <header className="msp-hdr">
          <Link href="/home" className="msp-brand" aria-label="Magical Moments by Reign">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" width={44} height={44} />
            <span className="msp-brand__t">
              <span className="msp-brand__n">MAGICAL MOMENTS</span>
              <span className="msp-brand__b">BY REIGN</span>
            </span>
          </Link>
          <div className="msp-hdr__r">
            <Link href="/notifications" className="msp-hicon" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
              {unread > 0 && <span className="msp-hicon__dot">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href="/account" className="msp-avatar" aria-label="Account &amp; settings">{initial}</Link>
            <form action={logoutAction}><button type="submit" className="msp-out">Sign out</button></form>
          </div>
        </header>

        <div className="msp-hero__in">
          <svg className="msp-spark" viewBox="0 0 40 22" aria-hidden="true"><path d="M20 2 L22 9 L29 11 L22 13 L20 20 L18 13 L11 11 L18 9 Z" /></svg>
          <h1 className="msp-h1">Welcome to Your <i>Magical Space</i></h1>
          <div className="msp-div" aria-hidden="true"><span>✦</span></div>
          <p className="msp-sub">What beautiful chapter of life<br />are we creating together today?</p>
        </div>
      </section>

      {/* Summary — everything at a glance, real numbers, into the dashboard */}
      <div className="msp-wrap">
        <div className="msp-summary">
          <div>
            <h2 className="msp-sm__t">Everything you need. <i>All in one place.</i></h2>
            <Link className="msp-sm__btn" href="/dashboard">
              View my dashboard
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="msp-stats">
            {stats.map((s, i) => (
              <div key={s.key} className="msp-stat-cell">
                {i > 0 && <span className="msp-stat__div" aria-hidden="true" />}
                <Link href={s.href} className="msp-stat">
                  <StatIcon name={s.key} />
                  <span className="msp-stat__k">{s.unit}</span>
                  <span className="msp-stat__n">{s.num}</span>
                  <span className="msp-stat__s">{s.sub}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* A quiet moment */}
      <div className="msp-qband">
        <div className="msp-qband__l">
          <span className="msp-qband__q" aria-hidden="true">&ldquo;</span>
          <p className="msp-qband__t">The best things in life aren&rsquo;t things. <i>They&rsquo;re moments we create.</i></p>
        </div>
        <div className="msp-qband__r" aria-hidden="true" />
      </div>

      <footer className="msp-foot">
        <div className="msp-foot__in">
          <div className="msp-foot__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" width={52} height={52} />
            <div className="msp-fn">MAGICAL MOMENTS</div>
            <div className="msp-fb">BY REIGN</div>
          </div>
          <div className="msp-fcol">
            <h4>Your Space</h4>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/estate/home">Home Estate</Link>
            <Link href="/journeys">Journeys</Link>
            <Link href="/account">Account &amp; Settings</Link>
          </div>
          <div className="msp-fcol">
            <h4>Explore</h4>
            <Link href="/inspiration">Inspiration</Link>
            <Link href="/pricing">Membership</Link>
            <Link href="/about">Our Story</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="msp-fcol">
            <h4>Support</h4>
            <Link href="/notifications">Notifications</Link>
            <Link href="/contact">Help</Link>
            <Link href="/account">Privacy &amp; Security</Link>
          </div>
        </div>
        <div className="msp-fbar">© {new Date().getFullYear()} Magical Moments by Reign. All rights reserved.</div>
      </footer>
    </>
  );
}

// Champagne line icons for the summary stats (no emojis on the luxury surfaces).
function StatIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactElement> = {
    upcoming: (<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>),
    journeys: (<path d="M4 12 L12 5 L20 12 M6 11 V20 H18 V11" />),
    memories: (<><path d="M12 4 L14.2 9.4 L20 10 L15.6 13.8 L17 20 L12 16.6 L7 20 L8.4 13.8 L4 10 L9.8 9.4 Z" /></>),
    people: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>),
  };
  return (
    <svg className="msp-sti" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
  );
}
