import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { CUSTOM_STATUSES } from "@/lib/custom-website";
import { adminLogoutAction } from "../actions";
import { acceptRequestAction, setStatusAction, saveNotesAction } from "./actions";
import "../admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Custom website orders", robots: { index: false } };

function fmt(d: Date) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_CLASS: Record<string, string> = {
  NEW: "is-new", ACCEPTED: "is-accepted", IN_PROGRESS: "is-progress", COMPLETE: "is-complete", DECLINED: "is-declined",
};

export default async function CustomWebsitesAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/custom-websites");

  const rows = await prisma.customWebsiteRequest.findMany({ orderBy: { createdAt: "desc" } });
  const counts = rows.reduce<Record<string, number>>((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});

  return (
    <div className="adm">
      <SiteNav />
      <header className="adm-header">
        <div className="container adm-header__inner">
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Admin</span>
            <h1>Custom website orders</h1>
            <p>Every custom business website request, updated as they come in.</p>
          </div>
          <div className="adm-header__actions">
            <a href="/admin/custom-websites/export" className="btn-outline-gold">⤓ Export spreadsheet (CSV)</a>
            <form action={adminLogoutAction}><button className="adm-link" type="submit">Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="container adm-main">
        <div className="adm-stats">
          <div className="adm-stat"><b>{rows.length}</b><span>Total</span></div>
          {CUSTOM_STATUSES.map((s) => (
            <div className="adm-stat" key={s}><b>{counts[s] || 0}</b><span>{s.replace("_", " ")}</span></div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="adm-empty">
            <p>No custom website requests yet.</p>
            <Link href="/business" className="btn-gold">View the business page</Link>
          </div>
        ) : (
          <div className="adm-list">
            {rows.map((r) => (
              <article className={`adm-card ${STATUS_CLASS[r.status] || ""}`} key={r.id}>
                <div className="adm-card__top">
                  <div>
                    <span className="adm-card__num">{r.number}</span>
                    <span className={`adm-badge ${STATUS_CLASS[r.status] || ""}`}>{r.status.replace("_", " ")}</span>
                  </div>
                  <span className="adm-card__date">{fmt(r.createdAt)}</span>
                </div>

                <div className="adm-card__grid">
                  <div>
                    <h3>{r.business || r.name}</h3>
                    <p className="adm-card__meta">
                      {r.name} · <a href={`mailto:${r.email}`}>{r.email}</a>{r.phone ? ` · ${r.phone}` : ""}
                    </p>
                    <p className="adm-card__tags">
                      {r.projectType && <span>{r.projectType}</span>}
                      {r.budget && <span>{r.budget}</span>}
                      {r.timeline && <span>{r.timeline}</span>}
                    </p>
                    <p className="adm-card__details">{r.details}</p>
                    {r.acceptedAt && <p className="adm-card__accepted">Accepted {fmt(r.acceptedAt)}{r.jotformUrl ? ` · intake sent` : ""}</p>}
                  </div>

                  <div className="adm-card__controls">
                    {r.status === "NEW" && (
                      <form action={acceptRequestAction} className="adm-control">
                        <input type="hidden" name="id" value={r.id} />
                        <input name="jotformUrl" placeholder="Intake form link (optional)" defaultValue={r.jotformUrl || ""} />
                        <button type="submit" className="btn-gold adm-accept">✓ Accept &amp; email client</button>
                      </form>
                    )}
                    <form action={setStatusAction} className="adm-control adm-control--row">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status}>
                        {CUSTOM_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                      <button type="submit" className="adm-link">Update status</button>
                    </form>
                    <form action={saveNotesAction} className="adm-control">
                      <input type="hidden" name="id" value={r.id} />
                      <textarea name="notes" rows={2} placeholder="Internal notes…" defaultValue={r.notes || ""} />
                      <button type="submit" className="adm-link">Save notes</button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
