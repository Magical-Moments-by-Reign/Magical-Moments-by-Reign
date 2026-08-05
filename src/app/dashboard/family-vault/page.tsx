import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Family Vault", robots: { index: false } };

const CATS = [
  { key: "Photos", kinds: ["PHOTO"], icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 17l-5-5-4 4-2-2-4 4" /></> },
  { key: "Videos", kinds: ["VIDEO"], icon: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></> },
  { key: "Documents", kinds: ["RECEIPT", "ORDER"], icon: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 12h6M9 16h6" /></> },
  { key: "Albums", kinds: ["GALLERY"], icon: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 15l4-4 4 4 3-3 5 5" /></> },
];

// Private family vault. STRICTLY account-scoped: every query is keyed to the
// signed-in account, so a member can never see another family's files.
export default async function FamilyVaultPage() {
  const account = await requireAccount("/dashboard/family-vault");

  const entries = await prisma.libraryEntry.findMany({
    where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY", "RECEIPT", "ORDER"] } },
    orderBy: { createdAt: "desc" }, take: 24,
    select: { id: true, title: true, kind: true, createdAt: true },
  }).catch(() => []);
  const counts = (kinds: string[]) => entries.filter((e) => kinds.includes(e.kind)).length;
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Private &amp; secure</span>
        <h1 className="pg-title">Family Vault</h1>
        <p className="pg-sub">A private home for your family&rsquo;s photos, videos, documents, and keepsakes. Only you and the people you invite can ever see what&rsquo;s here.</p>
        <div className="pg-actions">
          <span className="btn" aria-disabled="true" style={{ opacity: .7, cursor: "default" }}>Upload <span className="badge badge--soon" style={{ marginLeft: ".4rem" }}>Coming Soon</span></span>
          <Link href="/dashboard/media" className="btn btn--ghost">My Memories</Link>
        </div>
      </div>

      <div className="cat-grid">
        {CATS.map((c) => (
          <div key={c.key} className="cat"><span className="cat__ic"><svg viewBox="0 0 24 24" aria-hidden="true">{c.icon}</svg></span><span className="cat__n">{counts(c.kinds)}</span><span className="cat__k">{c.key}</span></div>
        ))}
      </div>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">In your vault</h2></div>
        {entries.length ? (
          <div className="grid grid--gallery">
            {entries.map((e) => <div key={e.id} className="card" style={{ padding: ".8rem" }}><div className="row__t" style={{ fontSize: ".92rem" }}>{e.title}</div><div className="row__s">{e.kind.toLowerCase()} · {fmt(e.createdAt)}</div></div>)}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg></div>
            <p className="empty__t">Your vault is empty</p>
            <p className="empty__s">Photos, videos, documents, and audio memories you add to your Journeys are safely kept here — private to your family.</p>
            <Link href="/dashboard/create" className="btn btn--gold">Create a Journey</Link>
          </div>
        )}
        <div className="soon-row" style={{ marginTop: "1rem" }}><span>Upload · download · move · tags · audio memories · private sharing</span><span className="badge badge--soon">Coming Soon</span></div>
      </section>
    </>
  );
}
