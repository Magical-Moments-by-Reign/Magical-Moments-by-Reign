import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-access";
import { effectiveStatus, describeOffer, OFFER_TYPES, SCOPES, AUDIENCES } from "@/lib/specials";
import { LIFETIME_COLLECTIONS, formatUSD } from "@/lib/pricing-engine";
import { adminLogoutAction } from "../actions";
import {
  createSpecialAction, publishSpecialAction, pauseSpecialAction,
  resumeSpecialAction, endSpecialAction, deleteSpecialAction,
} from "./actions";
import "../admin.css";
import "./specials.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Specials Center", robots: { index: false } };

function fmt(d: Date | null) {
  return d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

export default async function SpecialsAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; floors?: string }> }) {
  await requireAdmin("content.manage", "/admin/specials");
  const { error, floors } = await searchParams;

  const specials = await prisma.special.findMany({
    orderBy: { createdAt: "desc" },
    include: { audits: { orderBy: { createdAt: "desc" }, take: 3 } },
  });
  const now = new Date();
  const withStatus = specials.map((s) => ({ ...s, eff: effectiveStatus(s, now) }));
  const counts = withStatus.reduce<Record<string, number>>((a, s) => { a[s.eff] = (a[s.eff] || 0) + 1; return a; }, {});

  return (
    <div className="adm">
      <SiteNav />
      <header className="adm-header">
        <div className="container adm-header__inner">
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Admin</span>
            <h1>Specials &amp; Promotions Center</h1>
            <p>Create, schedule, pause, and review promotions. Every special is checked against Lifetime Value Protection before it can go live.</p>
          </div>
          <div className="adm-header__actions">
            <a href="/admin/custom-websites" className="adm-link">Website orders</a>
            <a href="/admin/domains" className="adm-link">Domains</a>
            <form action={adminLogoutAction}><button className="adm-link" type="submit">Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="container sp-main">
        {/* Protection guardrail card */}
        <div className="sp-guard">
          🛡 <strong>Lifetime Value Protection is always on.</strong> No promotion may make a recurring or term plan a better value than the comparable Lifetime Collection:
          {" "}{LIFETIME_COLLECTIONS.map((c, i) => (
            <span key={c.id}>{i > 0 ? " · " : " "}{c.name} {formatUSD(c.price)}</span>
          ))}.
        </div>

        {error === "protection" && (
          <div className="sp-block">
            ⛔ Blocked by Lifetime Value Protection — this offer would make a term plan cheaper than a Lifetime Collection.
            {floors ? <> Lowest permitted stays at the Collection price ({decodeURIComponent(floors).split(",").map((f) => f.replace(":", " $")).join(", ")}).</> : null}
            {" "}Reduce the discount, or scope it to a Lifetime Collection.
          </div>
        )}
        {error === "name" && <div className="sp-block">Please give the special a name.</div>}

        {/* Dashboard counts */}
        <div className="sp-stats">
          {(["active", "scheduled", "draft", "paused", "ended"] as const).map((st) => (
            <div key={st} className={`sp-stat sp-stat--${st}`}><b>{counts[st] ?? 0}</b><span>{st}</span></div>
          ))}
        </div>

        {/* Create a special */}
        <details className="sp-create">
          <summary>＋ Create a special</summary>
          <form action={createSpecialAction} className="sp-form">
            <div className="sp-grid">
              <label className="sp-f sp-f--wide"><span>Promotion name *</span><input name="name" required placeholder="Lifetime — 30% off today only" /></label>
              <label className="sp-f"><span>Offer type</span><select name="offerType" defaultValue="percent">{OFFER_TYPES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
              <label className="sp-f"><span>Discount type</span><select name="discountType" defaultValue="percent"><option value="percent">Percentage</option><option value="fixed">Fixed dollars</option></select></label>
              <label className="sp-f"><span>Discount value</span><input name="discountValue" placeholder="30 or $200" /></label>
              <label className="sp-f"><span>Applies to</span><select name="scope" defaultValue="all">{SCOPES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
              <label className="sp-f"><span>Scope value (term/journey/collection)</span><input name="scopeValue" placeholder="e.g. legacy, 10yr, wedding" /></label>
              <label className="sp-f"><span>Audience</span><select name="audience" defaultValue="all">{AUDIENCES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
              <label className="sp-f"><span>Coupon code (blank = auto)</span><input name="code" placeholder="LIFETIME30" /></label>
              <label className="sp-f"><span>Starts</span><input type="datetime-local" name="startAt" /></label>
              <label className="sp-f"><span>Ends</span><input type="datetime-local" name="endAt" /></label>
              <label className="sp-f"><span>Max redemptions</span><input name="maxRedemptions" /></label>
              <label className="sp-f"><span>Per customer</span><input name="perCustomer" /></label>
              <label className="sp-f"><span>Min purchase</span><input name="minPurchase" /></label>
              <label className="sp-f sp-f--wide"><span>Customer-facing description</span><input name="publicDesc" placeholder="For a limited time, save on Lifetime Reign." /></label>
              <label className="sp-f sp-f--wide"><span>Internal note</span><input name="internalNote" /></label>
              <label className="sp-check"><input type="checkbox" name="auto" /> <span>Auto-apply (no code)</span></label>
              <label className="sp-check"><input type="checkbox" name="stackable" /> <span>Stackable</span></label>
              <label className="sp-check"><input type="checkbox" name="isPublic" defaultChecked /> <span>Public promotion</span></label>
            </div>
            <div className="sp-formfoot">
              <button type="submit" className="btn-gold">Create as draft</button>
              <span className="sp-fine">Created as a draft; review, then Publish to go live. Publishing re-checks Lifetime Value Protection.</span>
            </div>
          </form>
        </details>

        {/* Specials list */}
        {withStatus.length === 0 ? (
          <p className="sp-empty">No specials yet. Create your first above.</p>
        ) : (
          <div className="sp-list">
            {withStatus.map((s) => (
              <div key={s.id} className="sp-card">
                <div className="sp-card__top">
                  <div>
                    <div className="sp-card__name">{s.name}</div>
                    <div className="sp-card__offer">{describeOffer(s)} · {SCOPES.find((x) => x.id === s.scope)?.label ?? s.scope}{s.scopeValue ? ` (${s.scopeValue})` : ""}{s.code ? ` · code ${s.code}` : " · auto"}</div>
                  </div>
                  <span className={`sp-badge sp-badge--${s.eff}`}>{s.eff}</span>
                </div>
                <div className="sp-card__facts">
                  <span><b>Window</b> {fmt(s.startAt)} → {fmt(s.endAt)}</span>
                  <span><b>Audience</b> {AUDIENCES.find((a) => a.id === s.audience)?.label ?? s.audience}</span>
                  <span><b>Redemptions</b> {s.redemptions}{s.maxRedemptions ? ` / ${s.maxRedemptions}` : ""}</span>
                  <span><b>Approved</b> {s.approved ? "Yes" : "No"}</span>
                </div>
                {s.scope === "lifetime" && <p className="sp-note">Lifetime Collection special — upgrade credits preserved; requires an expiration.</p>}
                <div className="sp-card__actions">
                  {!s.approved && <form action={publishSpecialAction}><input type="hidden" name="id" value={s.id} /><button className="sp-btn sp-btn--go" type="submit">Approve &amp; publish</button></form>}
                  {s.eff === "active" && <form action={pauseSpecialAction}><input type="hidden" name="id" value={s.id} /><button className="sp-btn" type="submit">Pause</button></form>}
                  {s.eff === "paused" && <form action={resumeSpecialAction}><input type="hidden" name="id" value={s.id} /><button className="sp-btn" type="submit">Resume</button></form>}
                  {(s.eff === "active" || s.eff === "scheduled" || s.eff === "paused") && <form action={endSpecialAction}><input type="hidden" name="id" value={s.id} /><button className="sp-btn" type="submit">End now</button></form>}
                  <form action={deleteSpecialAction}><input type="hidden" name="id" value={s.id} /><button className="sp-btn sp-btn--danger" type="submit">{s.status === "draft" ? "Delete" : "Remove"}</button></form>
                </div>
                {s.audits.length > 0 && (
                  <details className="sp-audit">
                    <summary>Audit log</summary>
                    <ul>{s.audits.map((a) => <li key={a.id}><b>{a.action}</b> · {fmt(a.createdAt)}{a.detail ? ` — ${a.detail}` : ""} <span className="sp-muted">({a.actor})</span></li>)}</ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="sp-fine">No special alters the core pricing model. Analytics (revenue, conversion), customer email/SMS, geo rules, and test-customer preview are on the roadmap; scheduling, pause/resume, approval, and audit logging are live.</p>
      </main>
    </div>
  );
}
