import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import ConfirmSubmit from "@/components/dashboard/ConfirmSubmit";
import { WORLDS } from "@/lib/journeys/worlds";
import {
  publishJourneyAction, unpublishJourneyAction, duplicateJourneyAction, deleteJourneyAction,
} from "./actions";
import "@/components/journeys/journeys.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journeys", robots: { index: false } };

function isDemo(slug: string, title: string) { return slug.startsWith("demo-") || title.startsWith("Demo —"); }

// The Journeys hub. Each Journey is its own explorable WORLD (top). Below, the
// member's own created Journeys with full management (publish/duplicate/delete).
export default async function JourneysHubPage() {
  const account = await requireAccount("/dashboard/journeys");

  const owned = await prisma.experience.findMany({
    where: { accountId: account.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, visibility: true, updatedAt: true },
  }).catch(() => []);

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="jwhub">
      <div className="pg-head">
        <span className="pg-eyebrow">Explore your Journeys</span>
        <h1 className="pg-title">Your Magical Journeys</h1>
        <p className="pg-sub">Each Journey is its own world. Step inside, look around, and save what inspires you — plan only when you&rsquo;re ready.</p>
      </div>

      {/* Journey worlds */}
      <div className="jwh-worlds">
        {WORLDS.map((w) => (
          <Link key={w.slug} href={`/dashboard/journeys/${w.slug}`} className="jwh-world" style={w.hero ? { backgroundImage: `linear-gradient(180deg, rgba(28,19,12,.2), rgba(28,19,12,.82)), url(${w.hero})` } : undefined}>
            {w.status === "soon" && <span className="jwh-world__soon">More soon</span>}
            <span className="jwh-world__eyebrow">{w.eyebrow}</span>
            <span className="jwh-world__title">{w.label}</span>
            <span className="jwh-world__tag">{w.tagline}</span>
            <span className="jwh-world__cta">Explore →</span>
          </Link>
        ))}
      </div>

      {/* The member's own created Journeys */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Your created Journeys</h2><Link href="/dashboard/create" className="btn btn--sm btn--gold">Create a Moment</Link></div>
        {owned.length ? (
          <div className="grid grid--cards">
            {owned.map((e) => (
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
          <div className="empty">
            <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5z M3 13l9 5 9-5" /></svg></div>
            <p className="empty__t">No created Journeys yet</p>
            <p className="empty__s">Explore a world above, then create your first Moment — it will appear here, draft or published.</p>
            <Link href="/dashboard/create" className="btn btn--gold">Create a Moment</Link>
          </div>
        )}
      </section>
    </div>
  );
}
