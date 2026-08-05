import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import ConfirmSubmit from "@/components/dashboard/ConfirmSubmit";
import {
  publishJourneyAction, unpublishJourneyAction, duplicateJourneyAction, deleteJourneyAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Journeys", robots: { index: false } };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Published" },
  { key: "private", label: "Private" },
  { key: "shared", label: "Shared" },
  { key: "demo", label: "Demo" },
];

function isDemo(slug: string, title: string) { return slug.startsWith("demo-") || title.startsWith("Demo —"); }

export default async function MyJourneysPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const account = await requireAccount("/dashboard/journeys");
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();
  const filter = sp.filter || "all";

  const all = await prisma.experience.findMany({
    where: { accountId: account.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, type: true, status: true, visibility: true, updatedAt: true },
  }).catch(() => []);

  const filtered = all.filter((e) => {
    if (q && !e.title.toLowerCase().includes(q)) return false;
    switch (filter) {
      case "draft": return e.status === "DRAFT";
      case "published": return e.status === "PUBLISHED";
      case "private": return e.visibility === "PRIVATE";
      case "shared": return e.visibility !== "PRIVATE";
      case "demo": return isDemo(e.slug, e.title);
      default: return true;
    }
  });

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your work</span>
        <h1 className="pg-title">My Journeys</h1>
        <p className="pg-sub">Every Journey you own — draft, published, private, or shared.</p>
        <div className="pg-actions">
          <Link href="/dashboard/create" className="btn btn--gold">Create a Moment</Link>
        </div>
      </div>

      {/* Search + filters */}
      <form className="jf" method="get">
        <input className="jf__q" type="search" name="q" defaultValue={sp.q || ""} placeholder="Search your Journeys…" aria-label="Search Journeys" />
        <input type="hidden" name="filter" value={filter} />
        <button className="btn btn--sm btn--ghost" type="submit">Search</button>
      </form>
      <div className="jf__tabs">
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (sp.q) params.set("q", sp.q);
          params.set("filter", f.key);
          return (
            <Link key={f.key} href={`/dashboard/journeys?${params.toString()}`} className={`jf__tab${filter === f.key ? " is-on" : ""}`}>{f.label}</Link>
          );
        })}
      </div>

      {filtered.length ? (
        <div className="grid grid--cards" style={{ marginTop: "1.2rem" }}>
          {filtered.map((e) => (
            <article key={e.id} className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
                {e.title}
                {isDemo(e.slug, e.title) && <span className="badge badge--demo">Demo</span>}
              </h3>
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: ".7rem" }}>
                <span className={`badge badge--${e.status === "PUBLISHED" ? "pub" : "draft"}`}>{e.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                <span className={`badge badge--${e.visibility === "PRIVATE" ? "private" : "soon"}`}>{e.visibility === "PRIVATE" ? "Private" : e.visibility === "PUBLIC" ? "Public" : "Unlisted"}</span>
              </div>
              <p className="note">Updated {fmt(e.updatedAt)}</p>
              <div className="row__actions" style={{ marginTop: ".8rem" }}>
                <a className="btn btn--sm btn--ghost" href={`/${e.slug}`} target="_blank" rel="noreferrer">Preview</a>
                <a className="btn btn--sm btn--gold" href={`/${e.slug}`}>Edit</a>
                {e.status === "PUBLISHED" ? (
                  <form action={unpublishJourneyAction}><input type="hidden" name="slug" value={e.slug} /><button className="btn btn--sm" type="submit">Unpublish</button></form>
                ) : (
                  <form action={publishJourneyAction}><input type="hidden" name="slug" value={e.slug} /><button className="btn btn--sm" type="submit">Publish</button></form>
                )}
                <form action={duplicateJourneyAction}><input type="hidden" name="slug" value={e.slug} /><button className="btn btn--sm" type="submit">Duplicate</button></form>
                <form action={deleteJourneyAction}>
                  <input type="hidden" name="slug" value={e.slug} />
                  <ConfirmSubmit className="btn btn--sm btn--warn" message={`Delete "${e.title}"? This cannot be undone.`}>Delete</ConfirmSubmit>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: "1.2rem" }}>
          <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5z M3 13l9 5 9-5" /></svg></div>
          <p className="empty__t">{all.length ? "No Journeys match" : "No Journeys yet"}</p>
          <p className="empty__s">{all.length ? "Try a different filter or search." : "Create your first Moment and it will appear here — draft or published."}</p>
          <Link href="/dashboard/create" className="btn btn--gold">Create a Moment</Link>
        </div>
      )}
    </>
  );
}
