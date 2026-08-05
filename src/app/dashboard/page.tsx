import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { MEMBERSHIP_LABEL } from "@/lib/membership-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Member overview. Every number and list is REAL, account-keyed data with an
// honest empty state — never fabricated. The chrome (sidebar/topbar/Concierge)
// comes from dashboard/layout.tsx.
export default async function DashboardPage() {
  const account = await requireAccount("/dashboard");

  const [journeys, upcoming, notifs] = await Promise.all([
    prisma.experience.findMany({
      where: { accountId: account.id },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true, type: true, status: true, updatedAt: true },
    }).catch(() => []),
    prisma.libraryEntry.findMany({
      where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" },
      orderBy: { occurredAt: "asc" }, take: 4,
      select: { id: true, title: true, subtitle: true, occurredAt: true },
    }).catch(() => []),
    prisma.notification.findMany({
      where: { accountId: account.id, archivedAt: null },
      orderBy: { createdAt: "desc" }, take: 4,
      select: { id: true, title: true, body: true, readAt: true, createdAt: true },
    }).catch(() => []),
  ]);

  const active = journeys.filter((j) => j.status === "PUBLISHED");
  const drafts = journeys.filter((j) => j.status === "DRAFT");
  const tier = MEMBERSHIP_LABEL[account.membershipTier] ?? account.membershipTier;
  const fmt = (d: Date | null) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your Magical Space</span>
        <h1 className="pg-title">Welcome back, {account.firstName || "friend"}.</h1>
        <p className="pg-sub">Everything you&rsquo;re planning, creating, and preserving — all in one place.</p>
        <div className="pg-actions">
          <Link href="/dashboard/create" className="btn btn--gold">Create a Moment</Link>
          <Link href="/dashboard/journeys" className="btn btn--ghost">My Journeys</Link>
        </div>
      </div>

      <div className="grid grid--stats">
        <Link href="/dashboard/journeys" className="stat"><span className="stat__n">{active.length}</span><span className="stat__k">Active Journeys</span></Link>
        <Link href="/dashboard/journeys" className="stat"><span className="stat__n">{drafts.length}</span><span className="stat__k">Draft Journeys</span></Link>
        <Link href="/dashboard/media" className="stat"><span className="stat__n">{upcoming.length}</span><span className="stat__k">Upcoming Dates</span></Link>
        <div className="stat"><span className="stat__n">{tier}</span><span className="stat__k">Membership</span></div>
      </div>

      {/* Continue editing (drafts) */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Continue editing</h2><Link href="/dashboard/journeys" className="btn btn--sm btn--ghost">View all</Link></div>
        {drafts.length ? (
          <div className="list">
            {drafts.slice(0, 4).map((d) => (
              <div key={d.slug} className="row">
                <div className="row__main">
                  <div className="row__t">{d.title} <span className="badge badge--draft">Draft</span></div>
                  <div className="row__s">Updated {fmt(d.updatedAt)}</div>
                </div>
                <div className="row__actions">
                  <a className="btn btn--sm btn--ghost" href={`/${d.slug}`} target="_blank" rel="noreferrer">Preview</a>
                  <a className="btn btn--sm btn--gold" href={`/${d.slug}`}>Continue</a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></div>
            <p className="empty__t">No drafts in progress</p>
            <p className="empty__s">Start a Journey and it&rsquo;ll wait for you here until you&rsquo;re ready to finish it.</p>
            <Link href="/dashboard/create" className="btn btn--gold">Create a Moment</Link>
          </div>
        )}
      </section>

      <div className="grid grid--cards sec">
        {/* Upcoming */}
        <div className="card">
          <h3>Upcoming dates</h3>
          {upcoming.length ? (
            <div className="list">
              {upcoming.map((u) => (
                <div key={u.id} className="row"><div className="row__main"><div className="row__t">{u.title}</div><div className="row__s">{fmt(u.occurredAt)}{u.subtitle ? ` · ${u.subtitle}` : ""}</div></div></div>
              ))}
            </div>
          ) : <p className="note">No upcoming dates yet — add one when you build a Journey.</p>}
        </div>

        {/* Notifications / recent activity */}
        <div className="card">
          <h3>Recent activity</h3>
          {notifs.length ? (
            <div className="list">
              {notifs.map((n) => (
                <div key={n.id} className="row"><div className="row__main"><div className="row__t">{n.title}{!n.readAt && <span className="badge badge--pub" style={{ marginLeft: ".4rem" }}>New</span>}</div><div className="row__s">{n.body}</div></div></div>
              ))}
            </div>
          ) : <p className="note">No activity yet. Updates from your Journeys and Concierge will appear here.</p>}
          <div style={{ marginTop: ".8rem" }}><Link href="/dashboard/messages" className="btn btn--sm btn--ghost">Open Messages</Link></div>
        </div>
      </div>
    </>
  );
}
