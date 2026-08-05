import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages", robots: { index: false } };

// In-app message center. Notifications are the real, account-keyed feed. The
// Concierge is a live chat (opened in-app, never email-first). Email is offered
// only as a human-support backup.
export default async function MessagesPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const account = await requireAccount("/dashboard/messages");
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();

  const notifs = await prisma.notification.findMany({
    where: { accountId: account.id, archivedAt: null },
    orderBy: { createdAt: "desc" }, take: 50,
    select: { id: true, title: true, body: true, readAt: true, actionUrl: true, createdAt: true },
  }).catch(() => []);
  const shown = q ? notifs.filter((n) => (n.title + n.body).toLowerCase().includes(q)) : notifs;
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your inbox</span>
        <h1 className="pg-title">Messages</h1>
        <p className="pg-sub">Updates from your Journeys, your Concierge, and support — all in one place.</p>
        <div className="pg-actions">
          <OpenConciergeButton className="btn btn--gold">Start a Concierge chat</OpenConciergeButton>
        </div>
      </div>

      <form className="jf" method="get">
        <input className="jf__q" type="search" name="q" defaultValue={sp.q || ""} placeholder="Search messages…" aria-label="Search messages" />
        <button className="btn btn--sm btn--ghost" type="submit">Search</button>
      </form>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Notifications</h2></div>
        {shown.length ? (
          <div className="list">
            {shown.map((n) => (
              <div key={n.id} className="row">
                <div className="row__main">
                  <div className="row__t">{n.title}{!n.readAt && <span className="badge badge--pub" style={{ marginLeft: ".4rem" }}>New</span>}</div>
                  <div className="row__s">{n.body} · {fmt(n.createdAt)}</div>
                </div>
                {n.actionUrl && <a className="btn btn--sm btn--ghost" href={n.actionUrl}>Open</a>}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__mark"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></svg></div>
            <p className="empty__t">{notifs.length ? "No messages match" : "No messages yet"}</p>
            <p className="empty__s">Updates from your Journeys and your Concierge will arrive here.</p>
            <OpenConciergeButton className="btn btn--gold">Chat with your Concierge</OpenConciergeButton>
          </div>
        )}
        <div className="soon-row" style={{ marginTop: "1rem" }}><span>Collaborator threads · archive · saved Concierge history</span><span className="badge badge--soon">Coming Soon</span></div>
        <p className="note" style={{ marginTop: ".8rem" }}>Need a person? Email <a href="mailto:info@magicalmomentsbyreign.com">info@magicalmomentsbyreign.com</a> — a real human backup, not the primary experience.</p>
      </section>
    </>
  );
}
