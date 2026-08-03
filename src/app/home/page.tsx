import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import {
  getConcierge, conciergeDisplayName, needsWelcome, hasNamedConcierge, shouldNudgeForName,
} from "@/lib/concierge";
import AskMagicalPanel from "@/components/home/AskMagicalPanel";
import ConciergeWelcome from "@/components/home/ConciergeWelcome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home", robots: { index: false } };

// Curated inspiration is editorial (not user data), so it's honest to show it
// as a real, prepared suggestion rather than a "coming soon".
const INSPIRATION = {
  icon: "🕯",
  title: "Timeless Elegance",
  desc: "Curated ideas to elevate your next magical moment.",
};

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString();
}

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

  const conciergeName = conciergeDisplayName(concierge);
  const named = hasNamedConcierge(concierge);
  const nudge = shouldNudgeForName(concierge);

  // Everything below is REAL, per-account data (LibraryEntry is account-keyed;
  // People Connected counts invitations this account has sent). Values are 0
  // for a new member — honest, never fabricated. Tasks & Storage are shown as
  // honest "coming soon" because no truthful per-account source exists yet.
  const [upcoming, journeys, memories, peopleAgg, upcomingList, notifs] = await Promise.all([
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" } }),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: "EXPERIENCE" } }),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY"] } } }),
    prisma.account.findUnique({ where: { id: account.id }, select: { _count: { select: { invitationsSent: true } } } }),
    prisma.libraryEntry.findMany({
      where: { accountId: account.id, archived: false },
      orderBy: [{ occurredAt: "desc" }, { updatedAt: "desc" }],
      take: 3,
      select: { id: true, title: true, subtitle: true, occurredAt: true },
    }),
    prisma.notification.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);
  const peopleConnected = peopleAgg?._count.invitationsSent ?? 0;

  const stats = [
    { icon: "🗓", num: upcoming, label: "Upcoming Moments", href: "/dashboard" },
    { icon: "🧭", num: journeys, label: "Active Journeys", href: "/journeys" },
    { icon: "💎", num: memories, label: "Memories Captured", href: "/dashboard/media" },
    { icon: "🤍", num: peopleConnected, label: "People Connected", href: "/account/family" },
  ];

  return (
    <div className="home-space">
      {/* Welcome hero */}
      <header className="home-hero">
        <div>
          <span className="home-hero__crown" aria-hidden="true">♛</span>
          <h1 className="home-hero__title">Welcome Home, {account.firstName}</h1>
          <p className="home-hero__sub">Every moment has a purpose. Let&apos;s create more magic together.</p>
        </div>
        <Link href="/journeys" className="home-hero__cta"><span aria-hidden="true">＋</span> Create New Moment</Link>
      </header>

      {/* Stat cards + concierge */}
      <section className="home-stats" aria-label="Your life at a glance">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="panel statcard">
            <span className="statcard__ic" aria-hidden="true">{s.icon}</span>
            <span className="statcard__num">{s.num}</span>
            <span className="statcard__label">{s.label}</span>
            <span className="statcard__link">View all →</span>
          </Link>
        ))}

        <div className="panel concierge-card" id="concierge">
          <div className="concierge-card__head">
            <span className="concierge-card__bell" aria-hidden="true">🔔</span>
            <span>
              <span className="concierge-card__name" style={{ display: "block" }}>Your Concierge</span>
              <span className="concierge-card__powered">Powered by Magical</span>
            </span>
          </div>
          <AskMagicalPanel conciergeName={conciergeName} nudgeForName={nudge} />
        </div>
      </section>

      {/* Upcoming Moments · Inspiration · Tasks */}
      <section className="home-cols">
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Your Upcoming Moments</h2>
            <Link href="/dashboard" className="panel__link">View all</Link>
          </div>
          {upcomingList.length ? (
            upcomingList.map((m) => (
              <div key={m.id} className="moment">
                <span className="moment__thumb" aria-hidden="true">✨</span>
                <div className="moment__body">
                  <div className="moment__row">
                    <span className="moment__title">{m.title}</span>
                  </div>
                  <div className="moment__meta">
                    {m.occurredAt ? m.occurredAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : (m.subtitle ?? "In your Library")}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="home-empty">Your story starts with a single moment. Let&apos;s begin one together.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Inspiration For You</h2>
          </div>
          <div className="inspo__img" aria-hidden="true">{INSPIRATION.icon}</div>
          <h3 className="inspo__title">{INSPIRATION.title}</h3>
          <p className="inspo__desc">{INSPIRATION.desc}</p>
          <Link href="/inspiration" className="panel__link" style={{ display: "inline-block", marginTop: "0.7rem" }}>Explore inspiration →</Link>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Tasks &amp; Reminders</h2>
          </div>
          <p className="home-soon">
            <span className="home-soon__tag">Coming soon</span>
          </p>
          <p className="home-empty">{conciergeName} will keep your checklists and reminders here — one less thing to hold in your head.</p>
        </div>
      </section>

      {/* Recent Activity · Storage */}
      <section className="home-cols home-cols--two">
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recent Activity</h2>
            <Link href="/notifications" className="panel__link">View all</Link>
          </div>
          {notifs.length ? (
            <ul className="activity">
              {notifs.map((n) => (
                <li key={n.id}>
                  <span className="activity__ic" aria-hidden="true">✦</span>
                  <div className="activity__body">
                    <div className="activity__text">{n.title}</div>
                    <div className="activity__meta">{relativeTime(n.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="home-empty">Everything you do together will gather here, gently.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Storage</h2>
          </div>
          <p className="home-soon"><span className="home-soon__tag">Coming soon</span></p>
          <p className="home-empty">Your Magical Moments Library keeps everything safe — detailed storage insights are on the way.</p>
        </div>
      </section>

      <p className="home-foot">
        Account &amp; settings &mdash; profile, family, security, billing &mdash; live under{" "}
        <Link href="/account" className="home-foot__link">Account Settings</Link>.
      </p>
    </div>
  );
}
