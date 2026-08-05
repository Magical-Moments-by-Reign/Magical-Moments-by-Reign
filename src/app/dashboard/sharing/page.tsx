import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sharing", robots: { index: false } };

// Sharing. Share TOKENS are never rendered — only a masked label, link type,
// views, and expiry. Links are scoped to the signed-in owner.
export default async function SharingPage() {
  const account = await requireAccount("/dashboard/sharing");
  const links = await prisma.shareLink.findMany({
    where: { ownerId: account.id, revokedAt: null },
    orderBy: { id: "desc" }, take: 25,
    select: { id: true, title: true, linkType: true, viewCount: true, expiresAt: true, paused: true },
  }).catch(() => []);

  const fmt = (d: Date | null) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No expiry";

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Access &amp; links</span>
        <h1 className="pg-title">Sharing</h1>
        <p className="pg-sub">Manage who can see your Journeys. Create private or public links, set expirations, and revoke access anytime.</p>
        <div className="pg-actions">
          <span className="btn btn--gold" aria-disabled="true" style={{ opacity: .8, cursor: "default" }}>Create link <span className="badge badge--soon" style={{ marginLeft: ".4rem" }}>Coming Soon</span></span>
        </div>
      </div>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Active share links</h2></div>
        {links.length ? (
          <div className="list">
            {links.map((l) => (
              <div key={l.id} className="row">
                <div className="row__main">
                  <div className="row__t">{l.title || "Untitled link"} <span className="badge badge--soon">{l.linkType}</span></div>
                  <div className="row__s">{l.viewCount} view{l.viewCount === 1 ? "" : "s"} · Expires {fmt(l.expiresAt)}{l.paused ? " · Paused" : ""}</div>
                </div>
                <span className="badge badge--soon">Manage · Coming Soon</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__mark"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 L15.8 7 M8.2 13 L15.8 17" /></svg></div>
            <p className="empty__t">No share links yet</p>
            <p className="empty__s">When you share a Journey, its links, guest access, and view counts will appear here — always under your control.</p>
          </div>
        )}
        <div className="list" style={{ marginTop: "1rem" }}>
          <div className="soon-row"><span>Create public / private / expiring links · QR codes · collaborators · revoke</span><span className="badge badge--soon">Coming Soon</span></div>
        </div>
        <p className="note" style={{ marginTop: ".8rem" }}>Your share tokens are kept private and never displayed here.</p>
      </section>
    </>
  );
}
