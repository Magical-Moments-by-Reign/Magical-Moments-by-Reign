import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Memories", robots: { index: false } };

const CATS = [
  { key: "Photos", kinds: ["PHOTO"], icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 17l-5-5-4 4-2-2-4 4" /></> },
  { key: "Videos", kinds: ["VIDEO"], icon: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></> },
  { key: "Stories", kinds: ["EXPERIENCE"], icon: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 9h8M8 13h8M8 17h5" /></> },
  { key: "Audio Memories", kinds: [], icon: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" /></> },
  { key: "Documents", kinds: [], icon: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 12h6M9 16h6" /></> },
  { key: "Saved Keepsakes", kinds: ["FAVORITE"], icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" /> },
];

export default async function MyMemoriesPage() {
  const account = await requireAccount("/dashboard/media");

  const entries = await prisma.libraryEntry.findMany({
    where: { accountId: account.id, archived: false, kind: { in: ["PHOTO", "VIDEO", "GALLERY", "EXPERIENCE", "FAVORITE"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, subtitle: true, kind: true, thumbnail: true, createdAt: true },
  }).catch(() => []);

  const counts = (kinds: string[]) => kinds.length ? entries.filter((e) => kinds.includes(e.kind)).length : 0;
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your keepsakes</span>
        <h1 className="pg-title">My Memories</h1>
        <p className="pg-sub">Your photos, videos, stories, and special keepsakes — gathered from every Journey.</p>
        <div className="pg-actions">
          {/* Uploads aren't connected yet — labeled, never a dead button. */}
          <span className="btn" aria-disabled="true" style={{ opacity: .7, cursor: "default" }}>Upload a Memory <span className="badge badge--soon" style={{ marginLeft: ".4rem" }}>Coming Soon</span></span>
          <Link href="/dashboard/create" className="btn btn--gold">Create a Journey</Link>
        </div>
      </div>

      {/* Category overview — honest counts (0 where none) */}
      <div className="cat-grid">
        {CATS.map((c) => (
          <div key={c.key} className="cat">
            <span className="cat__ic"><svg viewBox="0 0 24 24" aria-hidden="true">{c.icon}</svg></span>
            <span className="cat__n">{counts(c.kinds)}</span>
            <span className="cat__k">{c.key}</span>
          </div>
        ))}
      </div>

      {entries.length ? (
        <section className="sec">
          <div className="sec__h"><h2 className="sec__t">All memories</h2></div>
          {/* Search / filter / actions become available as the media backend connects */}
          <div className="soon-row" style={{ marginBottom: "1rem" }}><span>Search, filters, albums, move &amp; download</span><span className="badge badge--soon">Coming Soon</span></div>
          <div className="grid grid--gallery">
            {entries.map((e) => (
              <div key={e.id} className="card" style={{ padding: ".8rem" }}>
                <div className="row__t" style={{ fontSize: ".92rem" }}>{e.title}</div>
                <div className="row__s">{e.kind.toLowerCase()} · {fmt(e.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty" style={{ marginTop: "1.6rem" }}>
          <div className="empty__mark"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 17l-5-5-4 4-2-2-4 4" /></svg></div>
          <p className="empty__t">No memories yet</p>
          <p className="empty__s">Your photos, videos, stories, and special keepsakes will appear here as you add them to your Journeys.</p>
          <div className="pg-actions" style={{ justifyContent: "center" }}>
            <span className="btn" aria-disabled="true" style={{ opacity: .7, cursor: "default" }}>Upload a Memory <span className="badge badge--soon" style={{ marginLeft: ".4rem" }}>Coming Soon</span></span>
            <Link href="/dashboard/create" className="btn btn--gold">Create a Journey</Link>
          </div>
        </div>
      )}
    </>
  );
}
