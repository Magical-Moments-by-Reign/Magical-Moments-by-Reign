import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home Estate", robots: { index: false } };

// The member's personal "home" inside Magical Moments — family, celebrations,
// and memories at a glance. Distinct from the Dashboard (which is about your
// Journeys/work). All data is account-keyed with honest empty states.
export default async function HomeEstatePage() {
  const account = await requireAccount("/dashboard/home");

  const [upcoming, memories, uploads, shared] = await Promise.all([
    prisma.libraryEntry.findMany({ where: { accountId: account.id, archived: false, kind: "UPCOMING_EVENT" }, orderBy: { occurredAt: "asc" }, take: 5, select: { id: true, title: true, subtitle: true, occurredAt: true } }).catch(() => []),
    prisma.libraryEntry.count({ where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY"] } } }).catch(() => 0),
    prisma.libraryEntry.findMany({ where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY"] } }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, title: true, kind: true, createdAt: true } }).catch(() => []),
    prisma.experience.findMany({ where: { accountId: account.id, visibility: { not: "PRIVATE" } }, orderBy: { updatedAt: "desc" }, take: 5, select: { slug: true, title: true } }).catch(() => []),
  ]);

  const fmt = (d: Date | null) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your home</span>
        <h1 className="pg-title">Home Estate</h1>
        <p className="pg-sub">Your family&rsquo;s home base — celebrations, memories, and the people who matter most.</p>
        <div className="pg-actions">
          <Link href="/dashboard/create" className="btn btn--gold">Create a Moment</Link>
          <Link href="/dashboard/media" className="btn btn--ghost">My Memories</Link>
        </div>
      </div>

      <div className="grid grid--stats">
        <Link href="/dashboard/media" className="stat"><span className="stat__n">{memories}</span><span className="stat__k">Saved Memories</span></Link>
        <Link href="/dashboard/home" className="stat"><span className="stat__n">{upcoming.length}</span><span className="stat__k">Upcoming Celebrations</span></Link>
        <Link href="/dashboard/journeys" className="stat"><span className="stat__n">{shared.length}</span><span className="stat__k">Shared Journeys</span></Link>
      </div>

      <div className="grid grid--cards sec">
        <div className="card">
          <h3>Upcoming celebrations</h3>
          {upcoming.length ? (
            <div className="list">{upcoming.map((u) => <div key={u.id} className="row"><div className="row__main"><div className="row__t">{u.title}</div><div className="row__s">{fmt(u.occurredAt)}{u.subtitle ? ` · ${u.subtitle}` : ""}</div></div></div>)}</div>
          ) : <p className="note">No celebrations on the calendar yet. Add an important date when you build a Journey.</p>}
        </div>

        <div className="card">
          <h3>Recent uploads</h3>
          {uploads.length ? (
            <div className="list">{uploads.map((u) => <div key={u.id} className="row"><div className="row__main"><div className="row__t">{u.title}</div><div className="row__s">{u.kind.toLowerCase()} · {fmt(u.createdAt)}</div></div></div>)}</div>
          ) : <p className="note">Nothing uploaded yet. Your photos and videos will appear here.</p>}
        </div>

        <div className="card">
          <h3>Shared Journeys</h3>
          {shared.length ? (
            <div className="list">{shared.map((s) => <div key={s.slug} className="row"><div className="row__main"><div className="row__t">{s.title}</div></div><a className="btn btn--sm btn--ghost" href={`/${s.slug}`} target="_blank" rel="noreferrer">View</a></div>)}</div>
          ) : <p className="note">You haven&rsquo;t shared a Journey yet. Publish one to share it with family.</p>}
        </div>

        <div className="card">
          <h3>Family members</h3>
          <p className="note">Add the people who share your Journeys and memories.</p>
          <div className="soon-row" style={{ marginTop: ".7rem" }}><span>Manage family members</span><span className="badge badge--soon">Coming Soon</span></div>
        </div>
      </div>
    </>
  );
}
