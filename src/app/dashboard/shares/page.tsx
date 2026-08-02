import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import { prisma } from "@/lib/db";
import { listExperiences } from "@/lib/experiences";
import { getExperienceType } from "@/lib/experience-types";
import { SHARE_ROLES } from "@/lib/shares";
import { createShareAction } from "./actions";
import CopyLink from "@/components/share/CopyLink";
import "./shares.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share your family journey" };

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function SharesPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const { created, error } = await searchParams;
  const all = await listExperiences();
  const experiences = all.filter((e) => e.type !== "business");
  const links = await prisma.shareLink.findMany({ orderBy: { createdAt: "desc" } });
  const createdLink = created ? links.find((l) => l.token === created) : null;

  return (
    <div className="sh">
      <SiteNav />
      <header className="sh-header">
        <div className="container">
          <Link href="/dashboard" className="sh-back">← Back to your studio</Link>
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Private sharing</span>
          <h1>Share exactly what you choose</h1>
          <p>Build a private link that includes only the journeys you select. Everything else stays hidden.</p>
        </div>
      </header>

      <main className="container sh-main">
        {createdLink && (
          <div className="sh-created">
            <p className="sh-created__label">✦ Your share link is ready</p>
            <CopyLink url={`${BASE}/share/${createdLink.token}`} />
            <p className="sh-created__hint">
              {createdLink.includeAll ? "Includes the entire family timeline." : "Includes only the journeys you selected."}
              {createdLink.passwordHash ? " · Password-protected." : ""}
              {createdLink.expiresAt ? ` · Expires ${fmt(createdLink.expiresAt)}.` : ""}
              {createdLink.maxViews ? ` · Up to ${createdLink.maxViews} views.` : ""}
            </p>
          </div>
        )}

        <form className="sh-builder" action={createShareAction}>
          <h2>Create a new share link</h2>
          {error === "empty" && <div className="sh-error">Please select at least one journey (or choose the whole timeline).</div>}

          <label className="sh-field">
            <span>Link name <em>(optional)</em></span>
            <input name="title" placeholder="For Grandma, The Johnsons, …" />
          </label>

          <fieldset className="sh-check">
            <legend>Which journeys to include</legend>
            <label className="sh-all">
              <input type="checkbox" name="includeAll" /> <b>Entire family timeline</b> (all journeys, including future ones)
            </label>
            <div className="sh-list">
              {experiences.map((e) => {
                const t = getExperienceType(e.type);
                return (
                  <label className="sh-item" key={e.id}>
                    <input type="checkbox" name="experienceIds" value={e.id} />
                    <span className="sh-item__emoji" aria-hidden="true">{t?.emoji ?? "✦"}</span>
                    <span className="sh-item__name">{e.title}</span>
                    <span className="sh-item__type">{t?.label ?? e.type}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="sh-opts">
            <label className="sh-field">
              <span>Password <em>(optional)</em></span>
              <input name="password" type="text" placeholder="Leave blank for no password" autoComplete="off" />
            </label>
            <label className="sh-field">
              <span>Expires in (days) <em>(optional)</em></span>
              <input name="expiresInDays" type="number" min={1} placeholder="Never" />
            </label>
            <label className="sh-field">
              <span>Max views <em>(optional)</em></span>
              <input name="maxViews" type="number" min={1} placeholder="Unlimited" />
            </label>
            <label className="sh-field">
              <span>Access level</span>
              <select name="role" defaultValue="family">
                {SHARE_ROLES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
              </select>
            </label>
          </div>

          <div className="sh-perms">
            <label><input type="checkbox" name="allowDownload" /> Allow downloads</label>
            <label><input type="checkbox" name="allowComments" /> Allow comments</label>
            <label><input type="checkbox" name="allowGuestbook" defaultChecked /> Allow guestbook messages</label>
          </div>

          <button type="submit" className="btn-gold">Create private link ✦</button>
        </form>

        <section className="sh-existing">
          <h2>Your share links {links.length > 0 && <span>({links.length})</span>}</h2>
          {links.length === 0 ? (
            <p className="sh-muted">No share links yet — create your first one above.</p>
          ) : (
            <div className="sh-links">
              {links.map((l) => {
                let count = 0;
                try { count = l.includeAll ? experiences.length : (JSON.parse(l.experienceIds) as string[]).length; } catch { count = 0; }
                return (
                  <div className="sh-linkcard" key={l.id}>
                    <div className="sh-linkcard__top">
                      <b>{l.title || "Untitled link"}</b>
                      <span className="sh-linkcard__meta">{l.viewCount} view{l.viewCount === 1 ? "" : "s"}</span>
                    </div>
                    <CopyLink url={`${BASE}/share/${l.token}`} compact />
                    <p className="sh-linkcard__tags">
                      <span>{l.includeAll ? "Whole timeline" : `${count} journe${count === 1 ? "y" : "ys"}`}</span>
                      {l.passwordHash && <span>🔒 Password</span>}
                      {l.expiresAt && <span>Expires {fmt(l.expiresAt)}</span>}
                      {l.maxViews && <span>Max {l.maxViews}</span>}
                      <span>{l.role}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
